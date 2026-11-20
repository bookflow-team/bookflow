import { and, count, eq, gt, inArray, lt, or } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { Db } from '../db/client';
import type * as schema from '../db/schema';
import {
  adminActions,
  availabilityExceptions,
  bookings,
  businesses,
  serviceSchedules,
  services,
  timeBlocks,
} from '../db/schema';
import { AppError } from '../errors';
import { maxOccupancy, type Occupant } from './occupancy';
import {
  BOOKING_HORIZON_DAYS,
  CUSTOMER_CANCEL_NOTICE_MS,
  effectiveStatus,
  HOUR,
  MAX_PENDING_PER_CUSTOMER,
  OWNER_CANCEL_NOTICE_MS,
  pendingExpiry,
} from './status';
import { dayWindow, findSlot, localDateOf, slotsForDate, type Slot } from './time';

export type Actor = { id: string; role: 'CUSTOMER' | 'BUSINESS_OWNER' | 'ADMIN' };
type Q = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;
type BookingRow = typeof bookings.$inferSelect;

const FAR_FUTURE_MS = 10 * 365 * 24 * HOUR;

async function loadOccupants(q: Q, serviceId: string, from: Date, to: Date, now: Date): Promise<Occupant[]> {
  const held = await q
    .select({ startAt: bookings.startAt, endAt: bookings.endAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.serviceId, serviceId),
        lt(bookings.startAt, to),
        gt(bookings.endAt, from),
        or(eq(bookings.status, 'CONFIRMED'), and(eq(bookings.status, 'PENDING'), gt(bookings.expiresAt, now))),
      ),
    );
  const blocks = await q
    .select({ startAt: timeBlocks.startAt, endAt: timeBlocks.endAt, units: timeBlocks.units })
    .from(timeBlocks)
    .where(and(eq(timeBlocks.serviceId, serviceId), lt(timeBlocks.startAt, to), gt(timeBlocks.endAt, from)));

  return [
    ...held.map((b) => ({ start: b.startAt.getTime(), end: b.endAt.getTime(), units: 1 })),
    ...blocks.map((b) => ({ start: b.startAt.getTime(), end: b.endAt.getTime(), units: b.units })),
  ];
}

async function slotsFor(
  q: Q,
  service: { id: string; durationMinutes: number },
  zone: string,
  date: string,
): Promise<Slot[]> {
  const { start, end } = dayWindow(date, zone);
  const schedules = await q
    .select({
      weekday: serviceSchedules.weekday,
      startTime: serviceSchedules.startTime,
      endTime: serviceSchedules.endTime,
    })
    .from(serviceSchedules)
    .where(eq(serviceSchedules.serviceId, service.id));
  const exceptions = await q
    .select({
      startAt: availabilityExceptions.startAt,
      endAt: availabilityExceptions.endAt,
      type: availabilityExceptions.type,
    })
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.serviceId, service.id),
        lt(availabilityExceptions.startAt, end),
        gt(availabilityExceptions.endAt, start),
      ),
    );
  return slotsForDate({ date, zone, durationMinutes: service.durationMinutes, schedules, exceptions });
}

async function loadBookingWithOwner(q: Q, bookingId: string) {
  const [row] = await q
    .select({ booking: bookings, ownerId: businesses.ownerId })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(businesses, eq(businesses.id, services.businessId))
    .where(eq(bookings.id, bookingId));
  return row;
}

async function lockOwnedService(q: Q, actor: Actor, serviceId: string) {
  const [service] = await q.select().from(services).where(eq(services.id, serviceId)).for('update');
  if (!service) throw new AppError('NOT_FOUND', 'Service not found');
  const [business] = await q.select().from(businesses).where(eq(businesses.id, service.businessId));
  if (!business) throw new AppError('INTERNAL_ERROR', 'Service without a business');
  if (actor.role !== 'BUSINESS_OWNER' || business.ownerId !== actor.id) {
    throw new AppError('FORBIDDEN', 'You do not own this service');
  }
  return { service, business };
}

async function assertUnderPendingLimit(q: Q, customerId: string, now: Date) {
  const [pending] = await q
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, customerId),
        eq(bookings.status, 'PENDING'),
        gt(bookings.expiresAt, now),
      ),
    );
  if ((pending?.n ?? 0) >= MAX_PENDING_PER_CUSTOMER) {
    throw new AppError('TOO_MANY_PENDING', `At most ${MAX_PENDING_PER_CUSTOMER} requests can wait for approval`);
  }
}

export async function getAvailability(db: Db, serviceId: string, date: string, now = new Date()) {
  const [row] = await db
    .select({ service: services, business: businesses })
    .from(services)
    .innerJoin(businesses, eq(businesses.id, services.businessId))
    .where(eq(services.id, serviceId));
  if (!row || row.business.approvalStatus !== 'APPROVED' || !row.service.isActive) {
    throw new AppError('NOT_FOUND', 'Service not found');
  }
  const { service, business } = row;

  const slots = (await slotsFor(db, service, business.timezone, date)).filter(
    (s) => s.startAt.getTime() > now.getTime(),
  );
  const first = slots[0];
  const last = slots[slots.length - 1];
  const occupants = first && last ? await loadOccupants(db, service.id, first.startAt, last.endAt, now) : [];

  return {
    serviceId: service.id,
    date,
    timezone: business.timezone,
    slots: slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      remainingCapacity: service.capacity - maxOccupancy(s.startAt.getTime(), s.endAt.getTime(), occupants),
    })),
  };
}

export async function createBooking(
  db: Db,
  input: { customerId: string; serviceId: string; startAt: Date },
  now = new Date(),
): Promise<BookingRow> {
  return db.transaction(async (tx) => {
    const [service] = await tx.select().from(services).where(eq(services.id, input.serviceId)).for('update');
    if (!service) throw new AppError('NOT_FOUND', 'Service not found');
    const [business] = await tx.select().from(businesses).where(eq(businesses.id, service.businessId));
    if (!business) throw new AppError('INTERNAL_ERROR', 'Service without a business');

    if (business.approvalStatus !== 'APPROVED') {
      throw new AppError('BUSINESS_NOT_APPROVED', 'This business is not approved yet');
    }
    if (!service.isActive) throw new AppError('SERVICE_UNAVAILABLE', 'This service is not available');

    const start = input.startAt;
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);
    if (start.getTime() <= now.getTime()) throw new AppError('INVALID_SLOT', 'The start time is in the past');
    if (start.getTime() > now.getTime() + BOOKING_HORIZON_DAYS * 24 * HOUR) {
      throw new AppError('INVALID_SLOT', `Bookings open at most ${BOOKING_HORIZON_DAYS} days ahead`);
    }
    const slots = await slotsFor(tx, service, business.timezone, localDateOf(start, business.timezone));
    if (!findSlot(slots, start)) throw new AppError('INVALID_SLOT', 'The requested time is not an available slot');

    await assertUnderPendingLimit(tx, input.customerId, now);

    const occupants = await loadOccupants(tx, service.id, start, end, now);
    if (maxOccupancy(start.getTime(), end.getTime(), occupants) >= service.capacity) {
      throw new AppError('CAPACITY_EXCEEDED', 'No free capacity for this time');
    }

    const [created] = await tx
      .insert(bookings)
      .values({
        customerId: input.customerId,
        serviceId: service.id,
        startAt: start,
        endAt: end,
        status: 'PENDING',
        expiresAt: pendingExpiry(now, start),
        priceAtBooking: service.price,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!created) throw new AppError('INTERNAL_ERROR', 'Booking was not created');
    return created;
  });
}

export async function decideBooking(
  db: Db,
  actor: Actor,
  bookingId: string,
  decision: 'APPROVE' | 'REJECT',
  reason: string | undefined,
  now = new Date(),
): Promise<BookingRow> {
  if (actor.role !== 'BUSINESS_OWNER') throw new AppError('FORBIDDEN', 'Only the business owner can decide');
  const trimmed = reason?.trim();
  if (decision === 'REJECT' && !trimmed) {
    throw new AppError('VALIDATION_ERROR', 'A reason is required to reject a booking');
  }

  const ownedServices = db
    .select({ id: services.id })
    .from(services)
    .innerJoin(businesses, eq(businesses.id, services.businessId))
    .where(eq(businesses.ownerId, actor.id));

  const [updated] = await db
    .update(bookings)
    .set({
      status: decision === 'APPROVE' ? 'CONFIRMED' : 'REJECTED',
      statusReason: trimmed || null,
      updatedAt: now,
    })
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.status, 'PENDING'),
        gt(bookings.expiresAt, now),
        inArray(bookings.serviceId, ownedServices),
      ),
    )
    .returning();
  if (updated) return updated;

  const found = await loadBookingWithOwner(db, bookingId);
  if (!found) throw new AppError('NOT_FOUND', 'Booking not found');
  if (found.ownerId !== actor.id) throw new AppError('FORBIDDEN', 'This booking belongs to another business');
  const status = effectiveStatus(found.booking, now);
  if (status === 'EXPIRED') throw new AppError('BOOKING_EXPIRED', 'The approval deadline has passed');
  throw new AppError('INVALID_BOOKING_STATUS', `A ${status} booking cannot be ${decision === 'APPROVE' ? 'approved' : 'rejected'}`);
}

export async function cancelBooking(
  db: Db,
  actor: Actor,
  bookingId: string,
  reason: string | undefined,
  now = new Date(),
): Promise<BookingRow> {
  const trimmed = reason?.trim() || undefined;
  if (actor.role === 'ADMIN' && !trimmed) {
    throw new AppError('VALIDATION_ERROR', 'A reason is required for an administrative cancellation');
  }

  return db.transaction(async (tx) => {
    const found = await loadBookingWithOwner(tx, bookingId);
    if (!found) throw new AppError('NOT_FOUND', 'Booking not found');
    const { booking, ownerId } = found;

    const isCustomer = actor.role === 'CUSTOMER' && booking.customerId === actor.id;
    const isOwner = actor.role === 'BUSINESS_OWNER' && ownerId === actor.id;
    const isAdmin = actor.role === 'ADMIN';
    if (!isCustomer && !isOwner && !isAdmin) throw new AppError('FORBIDDEN', 'You cannot cancel this booking');

    const status = effectiveStatus(booking, now);
    if (status === 'EXPIRED') throw new AppError('BOOKING_EXPIRED', 'The request has already expired');
    if (status !== 'PENDING' && status !== 'CONFIRMED') {
      throw new AppError('INVALID_BOOKING_STATUS', `A ${status} booking cannot be cancelled`);
    }
    if (status === 'PENDING' && isOwner) {
      throw new AppError('INVALID_BOOKING_STATUS', 'Reject a pending request instead of cancelling it');
    }
    if (status === 'CONFIRMED' && !isAdmin) {
      const notice = isCustomer ? CUSTOMER_CANCEL_NOTICE_MS : OWNER_CANCEL_NOTICE_MS;
      if (booking.startAt.getTime() - now.getTime() < notice) {
        throw new AppError('CANCELLATION_DEADLINE_PASSED', 'Too late to cancel this booking');
      }
    }

    const [updated] = await tx
      .update(bookings)
      .set({ status: 'CANCELLED', cancelledBy: actor.role, statusReason: trimmed ?? null, updatedAt: now })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, booking.status)))
      .returning();
    if (!updated) throw new AppError('CONFLICT', 'The booking was changed by someone else, please retry');

    if (isAdmin) {
      await tx.insert(adminActions).values({
        adminId: actor.id,
        actionType: 'CANCEL_BOOKING',
        targetType: 'BOOKING',
        targetId: bookingId,
        reason: trimmed ?? '',
        createdAt: now,
      });
    }
    return updated;
  });
}

export async function createTimeBlock(
  db: Db,
  actor: Actor,
  input: {
    serviceId: string;
    startAt: Date;
    endAt: Date;
    units: number;
    reason: 'EXTERNAL_BOOKING' | 'UNAVAILABLE';
  },
  now = new Date(),
) {
  if (input.endAt.getTime() <= input.startAt.getTime()) {
    throw new AppError('VALIDATION_ERROR', 'endAt must be after startAt');
  }
  if (!Number.isInteger(input.units) || input.units < 1) {
    throw new AppError('VALIDATION_ERROR', 'units must be a positive integer');
  }
  return db.transaction(async (tx) => {
    const { service } = await lockOwnedService(tx, actor, input.serviceId);
    const occupants = await loadOccupants(tx, service.id, input.startAt, input.endAt, now);
    const used = maxOccupancy(input.startAt.getTime(), input.endAt.getTime(), occupants);
    if (used + input.units > service.capacity) {
      throw new AppError('CAPACITY_EXCEEDED', 'Existing reservations leave too little capacity to block');
    }
    const [block] = await tx.insert(timeBlocks).values({ ...input, createdAt: now }).returning();
    if (!block) throw new AppError('INTERNAL_ERROR', 'Block was not created');
    return block;
  });
}

export async function changeServiceCapacity(
  db: Db,
  actor: Actor,
  serviceId: string,
  capacity: number,
  now = new Date(),
) {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new AppError('VALIDATION_ERROR', 'capacity must be a positive integer');
  }
  return db.transaction(async (tx) => {
    const { service } = await lockOwnedService(tx, actor, serviceId);
    if (capacity < service.capacity) {
      const to = new Date(now.getTime() + FAR_FUTURE_MS);
      const occupants = await loadOccupants(tx, service.id, now, to, now);
      if (maxOccupancy(now.getTime(), to.getTime(), occupants) > capacity) {
        throw new AppError('CAPACITY_EXCEEDED', 'Existing reservations need more capacity than this');
      }
    }
    const [updated] = await tx
      .update(services)
      .set({ capacity, updatedAt: now })
      .where(eq(services.id, serviceId))
      .returning();
    if (!updated) throw new AppError('INTERNAL_ERROR', 'Service was not updated');
    return updated;
  });
}
