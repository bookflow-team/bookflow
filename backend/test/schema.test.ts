import { beforeEach, describe, expect, test } from '@jest/globals';
import { adminActions, bookings, businesses, serviceSchedules, services, timeBlocks, users } from '../src/db/schema';
import { db, makeService, makeUser, NOW, resetDb, THU_10 } from './helpers';

async function sqlState(p: PromiseLike<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    return (e as { cause?: { code?: string } }).cause?.code;
  }
}

const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

beforeEach(resetDb);

describe('database constraints (the last line of defence behind the API validation)', () => {
  test('emails are unique and lower case', async () => {
    await db.insert(users).values({ email: 'a@test.local', name: 'A', passwordHash: 'x', role: 'CUSTOMER' });
    expect(await sqlState(db.insert(users).values({ email: 'a@test.local', name: 'B', passwordHash: 'x', role: 'CUSTOMER' }))).toBe(UNIQUE_VIOLATION);
    expect(await sqlState(db.insert(users).values({ email: 'Mixed@Test.local', name: 'C', passwordHash: 'x', role: 'CUSTOMER' }))).toBe(CHECK_VIOLATION);
  });

  test('an owner can register only one business', async () => {
    const { owner } = await makeService();
    expect(await sqlState(db.insert(businesses).values({ ownerId: owner.id, name: 'Second', timezone: 'UTC' }))).toBe(UNIQUE_VIOLATION);
  });

  test('services need a positive capacity, a sane duration and a non-negative price', async () => {
    const { business } = await makeService();
    const good = { businessId: business.id, name: 'S', price: '10.00', durationMinutes: 30, capacity: 1 };
    expect(await sqlState(db.insert(services).values({ ...good, capacity: 0 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(services).values({ ...good, durationMinutes: 0 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(services).values({ ...good, durationMinutes: 1441 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(services).values({ ...good, price: '-1.00' }))).toBe(CHECK_VIOLATION);
  });

  test('schedule weekdays are 1-7 and intervals must run forward', async () => {
    const { service } = await makeService();
    const good = { serviceId: service.id, weekday: 1, startTime: '09:00', endTime: '10:00' };
    expect(await sqlState(db.insert(serviceSchedules).values({ ...good, weekday: 0 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(serviceSchedules).values({ ...good, weekday: 8 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(serviceSchedules).values({ ...good, startTime: '10:00', endTime: '09:00' }))).toBe(CHECK_VIOLATION);
  });

  test('bookings must end after they start and may not expire after they start', async () => {
    const { service } = await makeService();
    const customer = await makeUser('CUSTOMER');
    const good = {
      customerId: customer.id,
      serviceId: service.id,
      startAt: THU_10,
      endAt: new Date(THU_10.getTime() + 3_600_000),
      expiresAt: NOW,
      priceAtBooking: '1500.00',
    };
    expect(await sqlState(db.insert(bookings).values({ ...good, endAt: THU_10 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(bookings).values({ ...good, expiresAt: new Date(THU_10.getTime() + 1) }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(db.insert(bookings).values(good))).toBeUndefined();
  });

  test('a booking needs a real customer and service', async () => {
    const { service } = await makeService();
    const row = { startAt: THU_10, endAt: new Date(THU_10.getTime() + 3_600_000), expiresAt: NOW, priceAtBooking: '1.00' };
    const ghost = '00000000-0000-0000-0000-000000000000';
    expect(await sqlState(db.insert(bookings).values({ ...row, customerId: ghost, serviceId: service.id }))).toBe(FK_VIOLATION);
  });

  test('time blocks need positive units; audit records need a reason', async () => {
    const { service } = await makeService();
    const admin = await makeUser('ADMIN');
    const block = { serviceId: service.id, startAt: THU_10, endAt: new Date(THU_10.getTime() + 3_600_000), reason: 'EXTERNAL_BOOKING' as const };
    expect(await sqlState(db.insert(timeBlocks).values({ ...block, units: 0 }))).toBe(CHECK_VIOLATION);
    const action = { adminId: admin.id, actionType: 'CANCEL_BOOKING' as const, targetType: 'BOOKING' as const, targetId: admin.id };
    expect(await sqlState(db.insert(adminActions).values({ ...action, reason: '   ' }))).toBe(CHECK_VIOLATION);
  });

  test('timestamps keep their instant regardless of the database session time zone', async () => {
    const { service } = await makeService();
    const customer = await makeUser('CUSTOMER');
    const [row] = await db
      .insert(bookings)
      .values({
        customerId: customer.id,
        serviceId: service.id,
        startAt: THU_10,
        endAt: new Date(THU_10.getTime() + 3_600_000),
        expiresAt: NOW,
        priceAtBooking: '1.00',
      })
      .returning();
    expect(row?.startAt.toISOString()).toBe('2026-11-19T03:00:00.000Z');
    expect(row?.createdAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(row?.createdAt.getTime()).toBeLessThan(Date.now() + 60_000);
  });
});
