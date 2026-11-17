import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createBooking, decideBooking, getAvailability, type Actor } from '../src/booking/service';
import { availabilityExceptions, bookings } from '../src/db/schema';
import { AppError, type ErrorCode } from '../src/errors';
import { db, H, makeService, makeUser, NOW, resetDb, THU_10, THU_11 } from './helpers';

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
