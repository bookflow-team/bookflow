import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { adminActions, businesses } from '../src/db/schema';
import { db, resetDb } from './helpers';
import { bodyOf, client, loginAs } from './session-helpers';

const call = client(createApp({ db, corsOrigin: 'http://localhost:5173' }));

async function registered(name = 'Example Salon') {
  const owner = await loginAs('BUSINESS_OWNER');
  const res = await call('POST', '/owner/business', { cookie: owner.cookie, body: { name, timezone: 'Europe/Moscow' } });
  return { owner, id: (await bodyOf(res)).data?.id ?? '' };
}

beforeEach(resetDb);

describe('listing businesses for review', () => {
  test('an administrator sees every business with its owner, and can filter by status', async () => {
    const first = await registered('First');
    await registered('Second');
    await db.update(businesses).set({ approvalStatus: 'APPROVED' }).where(eq(businesses.id, first.id));
    const admin = await loginAs('ADMIN');

    const all = (await (await call('GET', '/admin/businesses', { cookie: admin.cookie })).json()) as { data: unknown[] };
    expect(all.data).toHaveLength(2);

    const pending = (await (await call('GET', '/admin/businesses?approvalStatus=PENDING', { cookie: admin.cookie })).json()) as {
      data: { name: string; owner: { email: string } }[];
      pagination: { total: number };
    };
    expect(pending.data.map((b) => b.name)).toEqual(['Second']);
    expect(pending.data[0]?.owner.email).toMatch(/@test\.local$/);
    expect(pending.pagination.total).toBe(1);
  });

  test('paging works and a bad filter is refused', async () => {
    for (const name of ['A', 'B', 'C']) await registered(name);
    const admin = await loginAs('ADMIN');
    const page2 = (await (await call('GET', '/admin/businesses?limit=2&page=2', { cookie: admin.cookie })).json()) as {
      data: unknown[];
      pagination: { page: number; limit: number; total: number };
    };
    expect(page2.data).toHaveLength(1);
    expect(page2.pagination).toEqual({ page: 2, limit: 2, total: 3 });
    expect((await call('GET', '/admin/businesses?approvalStatus=MAYBE', { cookie: admin.cookie })).status).toBe(422);
    expect((await call('GET', '/admin/businesses?limit=500', { cookie: admin.cookie })).status).toBe(422);
  });

  test('visitors get 401, owners and customers get 403', async () => {
    expect((await call('GET', '/admin/businesses')).status).toBe(401);
    for (const role of ['BUSINESS_OWNER', 'CUSTOMER'] as const) {
      const other = await loginAs(role);
      expect((await call('GET', '/admin/businesses', { cookie: other.cookie })).status).toBe(403);
    }
  });
});

describe('approving and rejecting', () => {
  test('approving publishes the business and writes an audit row naming the administrator', async () => {
    const { id } = await registered();
    const admin = await loginAs('ADMIN');
    const res = await call('POST', `/admin/businesses/${id}/approve`, { cookie: admin.cookie });
    expect(res.status).toBe(200);
    expect((await bodyOf(res)).data).toMatchObject({ id, approvalStatus: 'APPROVED' });

    const audit = await db.select().from(adminActions);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      adminId: admin.user.id,
      actionType: 'APPROVE_BUSINESS',
      targetType: 'BUSINESS',
      targetId: id,
      reason: 'Approved',
    });
  });

  test('an approval can carry a reason of its own', async () => {
    const { id } = await registered();
    const admin = await loginAs('ADMIN');
    await call('POST', `/admin/businesses/${id}/approve`, { cookie: admin.cookie, body: { reason: 'Checked the licence' } });
    expect((await db.select().from(adminActions))[0]?.reason).toBe('Checked the licence');
  });

  test('rejecting needs a reason, stores it in the audit log, and the owner can read it', async () => {
    const { id, owner } = await registered();
    const admin = await loginAs('ADMIN');
    for (const body of [{}, { reason: '   ' }]) {
      expect((await call('POST', `/admin/businesses/${id}/reject`, { cookie: admin.cookie, body })).status).toBe(422);
    }
    expect((await call('POST', `/admin/businesses/${id}/reject`, { cookie: admin.cookie })).status).toBe(422);

    const res = await call('POST', `/admin/businesses/${id}/reject`, { cookie: admin.cookie, body: { reason: 'Address is missing' } });
    expect(res.status).toBe(200);
    expect((await bodyOf(res)).data?.['approvalStatus']).toBe('REJECTED');
    expect((await db.select().from(adminActions))[0]).toMatchObject({ actionType: 'REJECT_BUSINESS', reason: 'Address is missing' });

    const mine = await bodyOf(await call('GET', '/owner/business', { cookie: owner.cookie }));
    expect(mine.data).toMatchObject({ approvalStatus: 'REJECTED', rejectionReason: 'Address is missing' });
  });

  test('a rejected business can be fixed by its owner and approved on the second try', async () => {
    const { id, owner } = await registered();
    const admin = await loginAs('ADMIN');
    await call('POST', `/admin/businesses/${id}/reject`, { cookie: admin.cookie, body: { reason: 'Name is unclear' } });
    const edited = await call('PATCH', '/owner/business', { cookie: owner.cookie, body: { name: 'Clear Name' } });
    expect((await bodyOf(edited)).data?.['approvalStatus']).toBe('PENDING');
    expect((await call('POST', `/admin/businesses/${id}/approve`, { cookie: admin.cookie })).status).toBe(200);
    expect(await db.select().from(adminActions)).toHaveLength(2);
  });

  test('a decision can only be made once, and unknown or malformed ids are refused', async () => {
    const { id } = await registered();
    const admin = await loginAs('ADMIN');
    await call('POST', `/admin/businesses/${id}/approve`, { cookie: admin.cookie });
    const again = await call('POST', `/admin/businesses/${id}/reject`, { cookie: admin.cookie, body: { reason: 'Too late' } });
    expect(again.status).toBe(409);
    expect((await bodyOf(again)).error?.code).toBe('CONFLICT');
    expect(await db.select().from(adminActions)).toHaveLength(1);

    expect((await call('POST', '/admin/businesses/00000000-0000-4000-8000-000000000000/approve', { cookie: admin.cookie })).status).toBe(404);
    expect((await call('POST', '/admin/businesses/not-a-uuid/approve', { cookie: admin.cookie })).status).toBe(422);
  });

  test('two administrators deciding at the same moment: one wins and exactly one audit row is written', async () => {
    const { id } = await registered();
    const first = await loginAs('ADMIN');
    const second = await loginAs('ADMIN');
    const results = await Promise.all([
      call('POST', `/admin/businesses/${id}/approve`, { cookie: first.cookie }),
      call('POST', `/admin/businesses/${id}/reject`, { cookie: second.cookie, body: { reason: 'No' } }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await db.select().from(adminActions)).toHaveLength(1);
  });

  test('owners and customers cannot decide, and nothing changes', async () => {
    const { id, owner } = await registered();
    const customer = await loginAs('CUSTOMER');
    for (const who of [owner, customer]) {
      expect((await call('POST', `/admin/businesses/${id}/approve`, { cookie: who.cookie })).status).toBe(403);
      expect((await call('POST', `/admin/businesses/${id}/reject`, { cookie: who.cookie, body: { reason: 'x' } })).status).toBe(403);
    }
    expect((await call('POST', `/admin/businesses/${id}/approve`)).status).toBe(401);
    const [row] = await db.select().from(businesses).where(eq(businesses.id, id));
    expect(row?.approvalStatus).toBe('PENDING');
    expect(await db.select().from(adminActions)).toHaveLength(0);
  });
});
