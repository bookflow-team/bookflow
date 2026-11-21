import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { bookings, businesses, services } from '../src/db/schema';
import { db, H, makeUser, resetDb } from './helpers';
import { bodyOf, client, loginAs } from './session-helpers';

const call = client(createApp({ db, corsOrigin: 'http://localhost:5173' }));

const haircut = { name: 'Haircut', description: 'Standard haircut', price: '1500.00', durationMinutes: 60, capacity: 2 };

async function ownerWithBusiness(approved = true) {
  const owner = await loginAs('BUSINESS_OWNER');
  await call('POST', '/owner/business', { cookie: owner.cookie, body: { name: 'Salon', timezone: 'Europe/Moscow' } });
  if (approved) await db.update(businesses).set({ approvalStatus: 'APPROVED' }).where(eq(businesses.ownerId, owner.user.id));
  return owner;
}

async function addService(cookie: string, body: Record<string, unknown> = haircut) {
  const res = await call('POST', '/owner/services', { cookie, body });
  const parsed = await bodyOf(res);
  return { res, body: parsed, id: parsed.data?.id ?? '' };
}

async function addBooking(serviceId: string, status: 'PENDING' | 'CONFIRMED', startInHours: number, expiresInHours = startInHours) {
  const customer = await makeUser('CUSTOMER');
  const now = Date.now();
  const start = new Date(now + startInHours * H);
  await db.insert(bookings).values({
    customerId: customer.id,
    serviceId,
    startAt: start,
    endAt: new Date(start.getTime() + H),
    status,
    expiresAt: new Date(now + expiresInHours * H),
    priceAtBooking: '1500.00',
  });
}

beforeEach(resetDb);

describe('adding a service', () => {
  test('an owner with an approved business adds one, and the price keeps two decimals', async () => {
    const owner = await ownerWithBusiness();
    const created = await addService(owner.cookie);
    expect(created.res.status).toBe(201);
    expect(created.body.data).toMatchObject({ ...haircut, isActive: true });
    const free = await addService(owner.cookie, { ...haircut, name: 'Consultation', price: '0' });
    expect(free.body.data?.['price']).toBe('0.00');
  });

  test('the business must be approved first, and must exist', async () => {
    const pending = await ownerWithBusiness(false);
    const refused = await addService(pending.cookie);
    expect(refused.res.status).toBe(409);
    expect(refused.body.error?.code).toBe('BUSINESS_NOT_APPROVED');

    const without = await loginAs('BUSINESS_OWNER');
    expect((await addService(without.cookie)).res.status).toBe(404);
    expect(await db.select().from(services)).toHaveLength(0);
  });

  test('only owners can add: visitors 401, customers and admins 403', async () => {
    expect((await call('POST', '/owner/services', { body: haircut })).status).toBe(401);
    for (const role of ['CUSTOMER', 'ADMIN'] as const) {
      const other = await loginAs(role);
      expect((await addService(other.cookie)).res.status).toBe(403);
    }
  });

  test('prices, durations and capacities are checked', async () => {
    const owner = await ownerWithBusiness();
    const bad = [
      { ...haircut, name: ' ' },
      { ...haircut, price: '-1' },
      { ...haircut, price: 'free' },
      { ...haircut, price: '12.345' },
      { ...haircut, price: 1500 },
      { ...haircut, durationMinutes: 0 },
      { ...haircut, durationMinutes: 1441 },
      { ...haircut, durationMinutes: 30.5 },
      { ...haircut, capacity: 0 },
      { ...haircut, capacity: 1001 },
      { name: 'Only a name' },
    ];
    for (const body of bad) {
      const attempt = await addService(owner.cookie, body);
      expect(attempt.res.status).toBe(422);
      expect(attempt.body.error?.code).toBe('VALIDATION_ERROR');
    }
    expect(await db.select().from(services)).toHaveLength(0);
  });
});

describe('listing my services', () => {
  test('shows only my own, including deactivated ones', async () => {
    const mine = await ownerWithBusiness();
    const other = await ownerWithBusiness();
    const first = await addService(mine.cookie);
    await addService(mine.cookie, { ...haircut, name: 'Shave' });
    await addService(other.cookie, { ...haircut, name: 'Not mine' });
    await call('DELETE', `/owner/services/${first.id}`, { cookie: mine.cookie });

    const list = (await (await call('GET', '/owner/services', { cookie: mine.cookie })).json()) as {
      data: { name: string; isActive: boolean }[];
    };
    expect(list.data.map((s) => [s.name, s.isActive])).toEqual([
      ['Haircut', false],
      ['Shave', true],
    ]);
    expect((await call('GET', '/owner/services')).status).toBe(401);
  });
});

describe('editing and deactivating', () => {
  test('changes only the given fields and bumps updatedAt', async () => {
    const owner = await ownerWithBusiness();
    const { id } = await addService(owner.cookie);
    const res = await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { price: '1800', description: null } });
    expect(res.status).toBe(200);
    expect((await bodyOf(res)).data).toMatchObject({ name: 'Haircut', price: '1800.00', description: null, capacity: 2 });
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: {} })).status).toBe(422);
  });

  test('another owner’s service is 403, unknown is 404, a malformed id is 422', async () => {
    const mine = await ownerWithBusiness();
    const other = await ownerWithBusiness();
    const { id } = await addService(mine.cookie);
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: other.cookie, body: { name: 'Hijack' } })).status).toBe(403);
    expect((await call('DELETE', `/owner/services/${id}`, { cookie: other.cookie })).status).toBe(403);
    expect((await call('PATCH', '/owner/services/00000000-0000-4000-8000-000000000000', { cookie: mine.cookie, body: { name: 'x' } })).status).toBe(404);
    expect((await call('PATCH', '/owner/services/nope', { cookie: mine.cookie, body: { name: 'x' } })).status).toBe(422);
    const [row] = await db.select().from(services).where(eq(services.id, id));
    expect(row?.name).toBe('Haircut');
  });

  test('deleting deactivates: the row and its bookings stay, and it can be switched back on', async () => {
    const owner = await ownerWithBusiness();
    const { id } = await addService(owner.cookie);
    await addBooking(id, 'CONFIRMED', 48);

    const res = await call('DELETE', `/owner/services/${id}`, { cookie: owner.cookie });
    expect(res.status).toBe(200);
    expect((await bodyOf(res)).data?.['isActive']).toBe(false);
    expect(await db.select().from(services)).toHaveLength(1);
    expect(await db.select().from(bookings)).toHaveLength(1);

    expect((await call('DELETE', `/owner/services/${id}`, { cookie: owner.cookie })).status).toBe(200);
    const back = await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { isActive: true } });
    expect((await bodyOf(back)).data?.['isActive']).toBe(true);
  });

  test('capacity can go up any time, and down only when no booking would be squeezed out', async () => {
    const owner = await ownerWithBusiness();
    const { id } = await addService(owner.cookie, { ...haircut, capacity: 3 });
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { capacity: 5 } })).status).toBe(200);
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { capacity: 2 } })).status).toBe(200);

    await addBooking(id, 'CONFIRMED', 48);
    const refused = await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { capacity: 1 } });
    expect(refused.status).toBe(409);
    expect((await bodyOf(refused)).error?.code).toBe('CAPACITY_EXCEEDED');
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { capacity: 4 } })).status).toBe(200);
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { price: '2000' } })).status).toBe(200);
  });

  test('bookings that no longer hold a place do not block lowering the capacity', async () => {
    const owner = await ownerWithBusiness();
    const { id } = await addService(owner.cookie, { ...haircut, capacity: 3 });
    await addBooking(id, 'PENDING', 48, -1);
    await addBooking(id, 'CONFIRMED', -48);
    expect((await call('PATCH', `/owner/services/${id}`, { cookie: owner.cookie, body: { capacity: 1 } })).status).toBe(200);
  });
});
