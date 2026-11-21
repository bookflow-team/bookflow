import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { isValidTimeZone } from '../src/business/timezone';
import { businesses } from '../src/db/schema';
import { db, resetDb } from './helpers';
import { bodyOf, client, loginAs } from './session-helpers';

const call = client(createApp({ db, corsOrigin: 'http://localhost:5173' }));

const salon = { name: 'Example Salon', description: 'Haircuts and shaving', timezone: 'Asia/Krasnoyarsk' };

beforeEach(resetDb);

describe('time zone names', () => {
  test('real IANA names pass, everything else does not', () => {
    for (const zone of ['UTC', 'Europe/Moscow', 'Asia/Krasnoyarsk', 'America/Argentina/Buenos_Aires', 'America/Port-au-Prince']) {
      expect(isValidTimeZone(zone)).toBe(true);
    }
    for (const zone of ['', 'Mars/Base', '+03:00', 'GMT+3', 'Moscow', 'Europe/', '../etc/passwd', 'Europe/Moscow; drop table']) {
      expect(isValidTimeZone(zone)).toBe(false);
    }
  });
});

describe('registering a business', () => {
  test('an owner registers one business, which starts as PENDING', async () => {
    const owner = await loginAs('BUSINESS_OWNER');
    const res = await call('POST', '/owner/business', { cookie: owner.cookie, body: salon });
    expect(res.status).toBe(201);
    expect((await bodyOf(res)).data).toMatchObject({ ...salon, approvalStatus: 'PENDING' });
    const [row] = await db.select().from(businesses);
    expect(row?.ownerId).toBe(owner.user.id);
  });

  test('the description is optional', async () => {
    const owner = await loginAs('BUSINESS_OWNER');
    const res = await call('POST', '/owner/business', { cookie: owner.cookie, body: { name: 'Plain', timezone: 'UTC' } });
    expect(res.status).toBe(201);
    expect((await bodyOf(res)).data?.['description']).toBeNull();
  });

  test('only business owners can register: visitors get 401, customers and admins 403', async () => {
    expect((await call('POST', '/owner/business', { body: salon })).status).toBe(401);
    for (const role of ['CUSTOMER', 'ADMIN'] as const) {
      const other = await loginAs(role);
      expect((await call('POST', '/owner/business', { cookie: other.cookie, body: salon })).status).toBe(403);
    }
    expect(await db.select().from(businesses)).toHaveLength(0);
  });

  test('one business per owner, even when two requests arrive at the same moment', async () => {
    const owner = await loginAs('BUSINESS_OWNER');
    const first = await call('POST', '/owner/business', { cookie: owner.cookie, body: salon });
    expect(first.status).toBe(201);
    const second = await call('POST', '/owner/business', { cookie: owner.cookie, body: { ...salon, name: 'Another' } });
    expect(second.status).toBe(409);
    expect((await bodyOf(second)).error?.code).toBe('BUSINESS_ALREADY_EXISTS');

    const racer = await loginAs('BUSINESS_OWNER');
    const results = await Promise.all([
      call('POST', '/owner/business', { cookie: racer.cookie, body: salon }),
      call('POST', '/owner/business', { cookie: racer.cookie, body: salon }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  test('bad input is refused with the shared 422 error', async () => {
    const owner = await loginAs('BUSINESS_OWNER');
    const bad = [
      { ...salon, name: '   ' },
      { ...salon, name: 'x'.repeat(121) },
      { ...salon, timezone: 'Mars/Base' },
      { ...salon, timezone: '+03:00' },
      { name: 'No zone' },
    ];
    for (const body of bad) {
      const res = await call('POST', '/owner/business', { cookie: owner.cookie, body });
      expect(res.status).toBe(422);
      expect((await bodyOf(res)).error?.code).toBe('VALIDATION_ERROR');
    }
    expect(await db.select().from(businesses)).toHaveLength(0);
  });
});

describe('reading and editing my business', () => {
  test('a new owner has none yet (404), and each owner sees only their own', async () => {
    const first = await loginAs('BUSINESS_OWNER');
    const second = await loginAs('BUSINESS_OWNER');
    expect((await call('GET', '/owner/business', { cookie: first.cookie })).status).toBe(404);

    await call('POST', '/owner/business', { cookie: first.cookie, body: salon });
    await call('POST', '/owner/business', { cookie: second.cookie, body: { name: 'Second', timezone: 'UTC' } });

    expect((await bodyOf(await call('GET', '/owner/business', { cookie: first.cookie }))).data?.['name']).toBe('Example Salon');
    expect((await bodyOf(await call('GET', '/owner/business', { cookie: second.cookie }))).data?.['name']).toBe('Second');
    expect((await call('GET', '/owner/business')).status).toBe(401);
    const customer = await loginAs('CUSTOMER');
    expect((await call('GET', '/owner/business', { cookie: customer.cookie })).status).toBe(403);
  });

  test('editing changes only the given fields and cannot touch another owner’s business', async () => {
    const first = await loginAs('BUSINESS_OWNER');
    const second = await loginAs('BUSINESS_OWNER');
    await call('POST', '/owner/business', { cookie: first.cookie, body: salon });
    await call('POST', '/owner/business', { cookie: second.cookie, body: { name: 'Second', timezone: 'UTC' } });

    const res = await call('PATCH', '/owner/business', { cookie: first.cookie, body: { name: 'Renamed', description: null } });
    expect(res.status).toBe(200);
    expect((await bodyOf(res)).data).toMatchObject({ name: 'Renamed', description: null, timezone: 'Asia/Krasnoyarsk' });

    const [other] = await db.select().from(businesses).where(eq(businesses.ownerId, second.user.id));
    expect(other?.name).toBe('Second');
  });

  test('an empty edit, a bad time zone and a missing business are refused', async () => {
    const owner = await loginAs('BUSINESS_OWNER');
    expect((await call('PATCH', '/owner/business', { cookie: owner.cookie, body: { name: 'x' } })).status).toBe(404);
    await call('POST', '/owner/business', { cookie: owner.cookie, body: salon });
    expect((await call('PATCH', '/owner/business', { cookie: owner.cookie, body: {} })).status).toBe(422);
    expect((await call('PATCH', '/owner/business', { cookie: owner.cookie, body: { timezone: 'Nowhere/Land' } })).status).toBe(422);
  });

  test('an approved business stays approved after an edit, a rejected one goes back to PENDING', async () => {
    const owner = await loginAs('BUSINESS_OWNER');
    await call('POST', '/owner/business', { cookie: owner.cookie, body: salon });

    await db.update(businesses).set({ approvalStatus: 'APPROVED' }).where(eq(businesses.ownerId, owner.user.id));
    const approved = await call('PATCH', '/owner/business', { cookie: owner.cookie, body: { name: 'Approved edit' } });
    expect((await bodyOf(approved)).data?.['approvalStatus']).toBe('APPROVED');

    await db.update(businesses).set({ approvalStatus: 'REJECTED' }).where(eq(businesses.ownerId, owner.user.id));
    const resubmitted = await call('PATCH', '/owner/business', { cookie: owner.cookie, body: { name: 'Fixed after rejection' } });
    expect((await bodyOf(resubmitted)).data?.['approvalStatus']).toBe('PENDING');
  });
});
