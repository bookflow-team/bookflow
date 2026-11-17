import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import {
  cancelBooking,
  changeServiceCapacity,
  createBooking,
  createTimeBlock,
  decideBooking,
  getAvailability,
  type Actor,
} from '../src/booking/service';
import { adminActions, availabilityExceptions, bookings } from '../src/db/schema';
import { AppError, type ErrorCode } from '../src/errors';
import { db, H, makeService, makeUser, NOW, resetDb, THU_09, THU_10, THU_11, THU_12 } from './helpers';

async function expectCode(p: Promise<unknown>, code: ErrorCode) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}, but the call succeeded`);
}

const actor = (u: { id: string }, role: Actor['role']): Actor => ({ id: u.id, role });
const book = (customerId: string, serviceId: string, startAt = THU_10, now = NOW) =>
  createBooking(db, { customerId, serviceId, startAt }, now);
const statusOf = async (id: string) => (await db.select().from(bookings).where(eq(bookings.id, id)))[0]?.status;
const before = (hours: number) => new Date(THU_10.getTime() - hours * H);

async function shop(capacity = 5) {
  const s = await makeService({ capacity });
  const ownerActor = actor(s.owner, 'BUSINESS_OWNER');
  const pending = async (startAt = THU_10) => {
    const customer = await makeUser('CUSTOMER');
    const b = await book(customer.id, s.service.id, startAt);
    return { id: b.id, customer: actor(customer, 'CUSTOMER') };
  };
  const confirmed = async (startAt = THU_10) => {
    const p = await pending(startAt);
    await decideBooking(db, ownerActor, p.id, 'APPROVE', undefined, NOW);
    return p;
  };
  return { ...s, ownerActor, pending, confirmed };
}

beforeEach(resetDb);

describe('availability', () => {
  test('lists future slots with their remaining capacity', async () => {
    const { service } = await makeService({ capacity: 2 });
    const c = await makeUser('CUSTOMER');
    await book(c.id, service.id, THU_10);

    const day = await getAvailability(db, service.id, '2026-11-19', NOW);
    expect(day.timezone).toBe('Asia/Krasnoyarsk');
    expect(day.slots.map((s) => [s.startAt, s.remainingCapacity])).toEqual([
      ['2026-11-19T02:00:00.000Z', 2],
      ['2026-11-19T03:00:00.000Z', 1],
      ['2026-11-19T04:00:00.000Z', 2],
      ['2026-11-19T05:00:00.000Z', 2],
    ]);
  });

  test('hides slots that have already started', async () => {
    const { service } = await makeService();
    const day = await getAvailability(db, service.id, '2026-11-16', NOW);
    expect(day.slots.map((s) => s.startAt)).toEqual(['2026-11-16T04:00:00.000Z', '2026-11-16T05:00:00.000Z']);
  });

  test('does not reveal unapproved businesses or deactivated services', async () => {
    const hidden = await makeService({ approved: false });
    const inactive = await makeService({ isActive: false });
    await expectCode(getAvailability(db, hidden.service.id, '2026-11-19', NOW), 'NOT_FOUND');
    await expectCode(getAvailability(db, inactive.service.id, '2026-11-19', NOW), 'NOT_FOUND');
  });

  test('a CLOSED exception removes the slot, and booking it is refused', async () => {
    const { service } = await makeService();
    await db.insert(availabilityExceptions).values({ serviceId: service.id, startAt: THU_10, endAt: THU_11, type: 'CLOSED' });
    const c = await makeUser('CUSTOMER');
    const day = await getAvailability(db, service.id, '2026-11-19', NOW);
    expect(day.slots.map((s) => s.startAt)).not.toContain(THU_10.toISOString());
    await expectCode(book(c.id, service.id, THU_10), 'INVALID_SLOT');
  });
});

describe('creating a booking', () => {
  test('creates a PENDING booking with the end time, price snapshot and deadline filled in by the server', async () => {
    const { service } = await makeService();
    const c = await makeUser('CUSTOMER');
    const b = await book(c.id, service.id);
    expect(b.status).toBe('PENDING');
    expect(b.endAt.toISOString()).toBe('2026-11-19T04:00:00.000Z');
    expect(b.priceAtBooking).toBe('1500.00');
    expect(b.expiresAt.toISOString()).toBe('2026-11-17T03:00:00.000Z');
  });

  test('the deadline is the appointment start when that is sooner than 24 hours', async () => {
    const { service } = await makeService();
    const c = await makeUser('CUSTOMER');
    const soon = new Date('2026-11-16T05:00:00Z');
    const b = await book(c.id, service.id, soon);
    expect(b.expiresAt.toISOString()).toBe(soon.toISOString());
  });

  test('refuses times that are not real slots', async () => {
    const { service } = await makeService();
    const c = await makeUser('CUSTOMER');
    await expectCode(book(c.id, service.id, new Date('2026-11-19T03:30:00Z')), 'INVALID_SLOT');
    await expectCode(book(c.id, service.id, new Date('2026-11-19T01:00:00Z')), 'INVALID_SLOT');
    await expectCode(book(c.id, service.id, new Date('2026-11-19T06:00:00Z')), 'INVALID_SLOT');
    await expectCode(book(c.id, service.id, new Date(NOW.getTime() - H)), 'INVALID_SLOT');
    await expectCode(book(c.id, service.id, new Date(NOW.getTime() + 61 * 24 * H)), 'INVALID_SLOT');
  });

  test('refuses unapproved businesses, deactivated services and unknown services', async () => {
    const c = await makeUser('CUSTOMER');
    const unapproved = await makeService({ approved: false });
    const inactive = await makeService({ isActive: false });
    await expectCode(book(c.id, unapproved.service.id), 'BUSINESS_NOT_APPROVED');
    await expectCode(book(c.id, inactive.service.id), 'SERVICE_UNAVAILABLE');
    await expectCode(book(c.id, '00000000-0000-0000-0000-000000000000'), 'NOT_FOUND');
  });

  test('one customer cannot hoard capacity with unanswered requests', async () => {
    const { service } = await makeService({ capacity: 5 });
    const c = await makeUser('CUSTOMER');
    const first = await book(c.id, service.id, THU_09);
    await book(c.id, service.id, THU_10);
    await book(c.id, service.id, THU_11);
    await expectCode(book(c.id, service.id, THU_12), 'TOO_MANY_PENDING');
    await cancelBooking(db, actor(c, 'CUSTOMER'), first.id, undefined, NOW);
    expect((await book(c.id, service.id, THU_12)).status).toBe('PENDING');
  });
});

describe('capacity', () => {
  test('a pending request holds capacity; rejecting it releases it', async () => {
    const s = await shop(1);
    const a = await s.pending();
    const other = await makeUser('CUSTOMER');
    await expectCode(book(other.id, s.service.id), 'CAPACITY_EXCEEDED');
    await decideBooking(db, s.ownerActor, a.id, 'REJECT', 'Fully booked in the workshop', NOW);
    expect((await book(other.id, s.service.id)).status).toBe('PENDING');
  });

  test('withdrawing releases capacity too', async () => {
    const s = await shop(1);
    const a = await s.pending();
    const other = await makeUser('CUSTOMER');
    await expectCode(book(other.id, s.service.id), 'CAPACITY_EXCEEDED');
    await cancelBooking(db, a.customer, a.id, undefined, NOW);
    expect((await book(other.id, s.service.id)).status).toBe('PENDING');
  });

  test('an expired request stops holding capacity without any background job', async () => {
    const s = await shop(1);
    await s.pending();
    const other = await makeUser('CUSTOMER');
    const justBefore = new Date(NOW.getTime() + 24 * H - 1);
    const justAfter = new Date(NOW.getTime() + 24 * H);
    await expectCode(book(other.id, s.service.id, THU_10, justBefore), 'CAPACITY_EXCEEDED');
    expect((await book(other.id, s.service.id, THU_10, justAfter)).status).toBe('PENDING');
  });

  test('a confirmed booking keeps holding capacity', async () => {
    const s = await shop(1);
    await s.confirmed();
    const other = await makeUser('CUSTOMER');
    await expectCode(book(other.id, s.service.id, THU_10, new Date(NOW.getTime() + 48 * H)), 'CAPACITY_EXCEEDED');
  });

  test('capacity is per service: another slot of the same service is still free', async () => {
    const s = await shop(1);
    await s.pending(THU_10);
    const other = await makeUser('CUSTOMER');
    expect((await book(other.id, s.service.id, THU_11)).status).toBe('PENDING');
  });

  test('a block that only partly covers a slot still takes that slot (capacity holds across the whole duration)', async () => {
    const { owner, service } = await makeService({ capacity: 1 });
    const half = new Date(THU_10.getTime() + 0.5 * H);
    await createTimeBlock(db, actor(owner, 'BUSINESS_OWNER'), {
      serviceId: service.id,
      startAt: half,
      endAt: new Date(half.getTime() + H),
      units: 1,
      reason: 'EXTERNAL_BOOKING',
    }, NOW);
    const c = await makeUser('CUSTOMER');
    await expectCode(book(c.id, service.id, THU_10), 'CAPACITY_EXCEEDED');
    await expectCode(book(c.id, service.id, THU_11), 'CAPACITY_EXCEEDED');
    expect((await book(c.id, service.id, THU_12)).status).toBe('PENDING');
    expect((await book(c.id, service.id, THU_09)).status).toBe('PENDING');
  });
});

describe('approval and rejection', () => {
  test('only the owner of the business can decide; the outcomes are exact', async () => {
    const s = await shop();
    const p = await s.pending();
    const stranger = await makeUser('BUSINESS_OWNER');
    await expectCode(decideBooking(db, actor(stranger, 'BUSINESS_OWNER'), p.id, 'APPROVE', undefined, NOW), 'FORBIDDEN');
    await expectCode(decideBooking(db, p.customer, p.id, 'APPROVE', undefined, NOW), 'FORBIDDEN');
    await expectCode(decideBooking(db, s.ownerActor, '00000000-0000-0000-0000-000000000000', 'APPROVE', undefined, NOW), 'NOT_FOUND');
    expect(await statusOf(p.id)).toBe('PENDING');

    const done = await decideBooking(db, s.ownerActor, p.id, 'APPROVE', undefined, NOW);
    expect(done.status).toBe('CONFIRMED');
    await expectCode(decideBooking(db, s.ownerActor, p.id, 'APPROVE', undefined, NOW), 'INVALID_BOOKING_STATUS');
    await expectCode(decideBooking(db, s.ownerActor, p.id, 'REJECT', 'Too late', NOW), 'INVALID_BOOKING_STATUS');
  });

  test('rejecting needs a reason, and the reason is stored', async () => {
    const s = await shop();
    const p = await s.pending();
    await expectCode(decideBooking(db, s.ownerActor, p.id, 'REJECT', '  ', NOW), 'VALIDATION_ERROR');
    const rejected = await decideBooking(db, s.ownerActor, p.id, 'REJECT', 'Closed that day', NOW);
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.statusReason).toBe('Closed that day');
  });

  test('a request cannot be approved after its deadline', async () => {
    const s = await shop();
    const p = await s.pending();
    const late = new Date(NOW.getTime() + 24 * H);
    await expectCode(decideBooking(db, s.ownerActor, p.id, 'APPROVE', undefined, late), 'BOOKING_EXPIRED');
  });
});

describe('cancellation', () => {
  test('a customer may cancel a confirmed booking up to 12 hours before the start, not later', async () => {
    const s = await shop();
    const ok = await s.confirmed();
    const tooLate = await s.confirmed();
    const exactly12 = before(12);
    const cancelled = await cancelBooking(db, ok.customer, ok.id, 'Plans changed', exactly12);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledBy).toBe('CUSTOMER');
    expect(cancelled.statusReason).toBe('Plans changed');
    await expectCode(cancelBooking(db, tooLate.customer, tooLate.id, undefined, new Date(exactly12.getTime() + 1)), 'CANCELLATION_DEADLINE_PASSED');
    expect(await statusOf(tooLate.id)).toBe('CONFIRMED');
  });

  test('the business may cancel up to 6 hours before the start', async () => {
    const s = await shop();
    const ok = await s.confirmed();
    const tooLate = await s.confirmed();
    expect((await cancelBooking(db, s.ownerActor, ok.id, 'Barber is ill', before(7))).cancelledBy).toBe('BUSINESS_OWNER');
    await expectCode(cancelBooking(db, s.ownerActor, tooLate.id, 'Barber is ill', before(5)), 'CANCELLATION_DEADLINE_PASSED');
  });

  test('between 6 and 12 hours only the business can still cancel', async () => {
    const s = await shop();
    const a = await s.confirmed();
    const b = await s.confirmed();
    await expectCode(cancelBooking(db, a.customer, a.id, undefined, before(11)), 'CANCELLATION_DEADLINE_PASSED');
    expect((await cancelBooking(db, s.ownerActor, b.id, 'Emergency', before(11))).status).toBe('CANCELLED');
  });

  test('an administrator can cancel any time with a reason, and it is audited in the same transaction', async () => {
    const s = await shop();
    const c = await s.confirmed();
    const admin = await makeUser('ADMIN');
    await expectCode(cancelBooking(db, actor(admin, 'ADMIN'), c.id, '   ', before(1)), 'VALIDATION_ERROR');
    expect(await statusOf(c.id)).toBe('CONFIRMED');
    expect(await db.select().from(adminActions)).toHaveLength(0);

    const cancelled = await cancelBooking(db, actor(admin, 'ADMIN'), c.id, 'Duplicate reservation', before(1));
    expect(cancelled.cancelledBy).toBe('ADMIN');
    const audit = await db.select().from(adminActions);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ adminId: admin.id, actionType: 'CANCEL_BOOKING', targetType: 'BOOKING', targetId: c.id, reason: 'Duplicate reservation' });
  });

  test('strangers cannot cancel', async () => {
    const s = await shop();
    const c = await s.confirmed();
    const otherCustomer = await makeUser('CUSTOMER');
    const otherOwner = await makeUser('BUSINESS_OWNER');
    await expectCode(cancelBooking(db, actor(otherCustomer, 'CUSTOMER'), c.id, undefined, before(20)), 'FORBIDDEN');
    await expectCode(cancelBooking(db, actor(otherOwner, 'BUSINESS_OWNER'), c.id, undefined, before(20)), 'FORBIDDEN');
  });

  test('a customer can withdraw a pending request at any time; the owner must reject instead', async () => {
    const s = await shop();
    const a = await s.pending();
    const b = await s.pending();
    await expectCode(cancelBooking(db, s.ownerActor, a.id, 'x', NOW), 'INVALID_BOOKING_STATUS');
    const withdrawn = await cancelBooking(db, a.customer, a.id, undefined, NOW);
    expect(withdrawn.status).toBe('CANCELLED');
    await expectCode(cancelBooking(db, a.customer, a.id, undefined, NOW), 'INVALID_BOOKING_STATUS');
    expect(await statusOf(b.id)).toBe('PENDING');
  });

  test('expired and completed bookings cannot be cancelled', async () => {
    const s = await shop();
    const stale = await s.pending();
    const done = await s.confirmed();
    await expectCode(cancelBooking(db, stale.customer, stale.id, undefined, new Date(NOW.getTime() + 25 * H)), 'BOOKING_EXPIRED');
    await expectCode(cancelBooking(db, done.customer, done.id, undefined, new Date(THU_10.getTime() + 2 * H)), 'INVALID_BOOKING_STATUS');
  });
});

describe('operations that add occupancy', () => {
  test('an external block reduces availability and bookable capacity', async () => {
    const { owner, service } = await makeService({ capacity: 2 });
    await createTimeBlock(db, actor(owner, 'BUSINESS_OWNER'), {
      serviceId: service.id,
      startAt: THU_09,
      endAt: THU_11,
      units: 1,
      reason: 'EXTERNAL_BOOKING',
    }, NOW);
    const day = await getAvailability(db, service.id, '2026-11-19', NOW);
    expect(day.slots.map((s) => s.remainingCapacity)).toEqual([1, 1, 2, 2]);

    const c1 = await makeUser('CUSTOMER');
    const c2 = await makeUser('CUSTOMER');
    await book(c1.id, service.id, THU_09);
    await expectCode(book(c2.id, service.id, THU_09), 'CAPACITY_EXCEEDED');
  });

  test('a block that does not fit next to existing reservations is refused', async () => {
    const s = await shop(1);
    await s.pending(THU_10);
    await expectCode(
      createTimeBlock(db, s.ownerActor, { serviceId: s.service.id, startAt: THU_10, endAt: THU_11, units: 1, reason: 'UNAVAILABLE' }, NOW),
      'CAPACITY_EXCEEDED',
    );
  });

  test('only the owner can create blocks', async () => {
    const s = await shop();
    const other = await makeUser('BUSINESS_OWNER');
    await expectCode(
      createTimeBlock(db, actor(other, 'BUSINESS_OWNER'), { serviceId: s.service.id, startAt: THU_10, endAt: THU_11, units: 1, reason: 'UNAVAILABLE' }, NOW),
      'FORBIDDEN',
    );
  });

  test('capacity cannot be lowered below existing reservations', async () => {
    const s = await shop(2);
    const a = await s.pending();
    await s.pending();
    await expectCode(changeServiceCapacity(db, s.ownerActor, s.service.id, 1, NOW), 'CAPACITY_EXCEEDED');
    expect((await changeServiceCapacity(db, s.ownerActor, s.service.id, 3, NOW)).capacity).toBe(3);
    await cancelBooking(db, a.customer, a.id, undefined, NOW);
    expect((await changeServiceCapacity(db, s.ownerActor, s.service.id, 1, NOW)).capacity).toBe(1);
  });
});
