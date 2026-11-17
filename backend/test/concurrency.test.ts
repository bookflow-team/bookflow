import { beforeEach, describe, expect, test } from '@jest/globals';
import { and, eq } from 'drizzle-orm';
import { cancelBooking, createBooking, decideBooking } from '../src/booking/service';
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

  test('approve and withdraw at the same moment: one wins, the other is told why, the state is consistent', async () => {
    const { owner, service } = await makeService({ capacity: 2 });
    const customer = await makeUser('CUSTOMER');
    const b = await createBooking(db, { customerId: customer.id, serviceId: service.id, startAt: THU_10 }, NOW);

    const results = await Promise.allSettled([
      decideBooking(db, { id: owner.id, role: 'BUSINESS_OWNER' }, b.id, 'APPROVE', undefined, NOW),
      cancelBooking(db, { id: customer.id, role: 'CUSTOMER' }, b.id, undefined, NOW),
    ]);

    const [row] = await db.select().from(bookings).where(eq(bookings.id, b.id));
    const winners = results.filter((r) => r.status === 'fulfilled');
    expect(['CONFIRMED', 'CANCELLED']).toContain(row?.status ?? '');
    expect(winners.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(AppError);
        expect(['INVALID_BOOKING_STATUS', 'CONFLICT']).toContain((r.reason as AppError).code);
      }
    }
  });
});
