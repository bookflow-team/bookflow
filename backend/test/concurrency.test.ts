import { beforeEach, describe, expect, test } from '@jest/globals';
import { and, eq } from 'drizzle-orm';
import { createBooking } from '../src/booking/service';
import { bookings, services } from '../src/db/schema';
import { AppError } from '../src/errors';
import { db, makeService, makeUser, NOW, resetDb, THU_10 } from './helpers';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(resetDb);

describe('simultaneous requests', () => {
  test('20 customers fight for the last 3 places: exactly 3 win, 17 get CAPACITY_EXCEEDED', async () => {
    const { service } = await makeService({ capacity: 3 });
    const customers = await Promise.all(Array.from({ length: 20 }, () => makeUser('CUSTOMER')));

    const results = await Promise.allSettled(
      customers.map((c) => createBooking(db, { customerId: c.id, serviceId: service.id, startAt: THU_10 }, NOW)),
    );

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(won).toHaveLength(3);
    expect(lost).toHaveLength(17);
    expect(lost.every((r) => r.reason instanceof AppError && r.reason.code === 'CAPACITY_EXCEEDED')).toBe(true);
    expect(await db.select().from(bookings).where(eq(bookings.serviceId, service.id))).toHaveLength(3);
  });

  test('control experiment: the same race WITHOUT the row lock overbooks', async () => {
    const { service } = await makeService({ capacity: 3 });
    const customers = await Promise.all(Array.from({ length: 20 }, () => makeUser('CUSTOMER')));

    const naive = (customerId: string) =>
      db.transaction(async (tx) => {
        const [s] = await tx.select().from(services).where(eq(services.id, service.id));
        const taken = await tx
          .select()
          .from(bookings)
          .where(and(eq(bookings.serviceId, service.id), eq(bookings.startAt, THU_10)));
        await sleep(150);
        if (!s || taken.length >= s.capacity) throw new Error('full');
        await tx.insert(bookings).values({
          customerId,
          serviceId: service.id,
          startAt: THU_10,
          endAt: new Date(THU_10.getTime() + 3_600_000),
          expiresAt: NOW,
          priceAtBooking: '1500.00',
        });
      });

    await Promise.allSettled(customers.map((c) => naive(c.id)));
    const stored = await db.select().from(bookings).where(eq(bookings.serviceId, service.id));
    expect(stored.length).toBeGreaterThan(3);
  });
});
