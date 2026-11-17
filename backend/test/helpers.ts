import { afterAll } from '@jest/globals';
import { sql } from 'drizzle-orm';
import { createDb } from '../src/db/client';
import { businesses, serviceSchedules, services, users } from '../src/db/schema';

const url = process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_URL is required to run the integration tests (see .env.test.example)');
if (!/test/i.test(new URL(url).pathname)) {
  throw new Error(`Refusing to run tests against "${new URL(url).pathname.slice(1)}": the database name must contain "test"`);
}

export const { db, client } = createDb(url, 30);

afterAll(async () => {
  await client.end();
});

export const NOW = new Date('2026-11-16T03:00:00Z');
export const H = 3_600_000;

export const THU_09 = new Date('2026-11-19T02:00:00Z');
export const THU_10 = new Date('2026-11-19T03:00:00Z');
export const THU_11 = new Date('2026-11-19T04:00:00Z');
export const THU_12 = new Date('2026-11-19T05:00:00Z');

export async function resetDb() {
  await db.execute(
    sql`truncate table admin_actions, time_blocks, bookings, availability_exceptions, service_schedules, services, businesses, sessions, users restart identity cascade`,
  );
}

let counter = 0;

export async function makeUser(role: 'CUSTOMER' | 'BUSINESS_OWNER' | 'ADMIN') {
  counter += 1;
  const [user] = await db
    .insert(users)
    .values({ email: `user${counter}@test.local`, name: `User ${counter}`, passwordHash: 'not-a-real-hash', role })
    .returning();
  if (!user) throw new Error('user was not created');
  return user;
}

export async function makeService(
  opts: {
    capacity?: number;
    durationMinutes?: number;
    timezone?: string;
    approved?: boolean;
    isActive?: boolean;
  } = {},
) {
  const owner = await makeUser('BUSINESS_OWNER');
  const [business] = await db
    .insert(businesses)
    .values({
      ownerId: owner.id,
      name: 'Test business',
      timezone: opts.timezone ?? 'Asia/Krasnoyarsk',
      approvalStatus: opts.approved === false ? 'PENDING' : 'APPROVED',
    })
    .returning();
  if (!business) throw new Error('business was not created');
  const [service] = await db
    .insert(services)
    .values({
      businessId: business.id,
      name: 'Test service',
      price: '1500.00',
      durationMinutes: opts.durationMinutes ?? 60,
      capacity: opts.capacity ?? 1,
      isActive: opts.isActive ?? true,
    })
    .returning();
  if (!service) throw new Error('service was not created');
  await db
    .insert(serviceSchedules)
    .values([1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ serviceId: service.id, weekday, startTime: '09:00', endTime: '13:00' })));
  return { owner, business, service };
}
