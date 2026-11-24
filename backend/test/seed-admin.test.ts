import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { ensureAdmin } from '../src/auth/seed-admin';
import { users } from '../src/db/schema';
import { db, makeUser, resetDb } from './helpers';

const credentials = { email: 'Admin@Example.com', password: 'a-long-admin-password' };

beforeEach(resetDb);

describe('first administrator', () => {
  test('is created with the ADMIN role, a lower-case e-mail and a hashed password', async () => {
    expect(await ensureAdmin(db, credentials)).toBe('created');
    const [row] = await db.select().from(users);
    expect(row).toMatchObject({ email: 'admin@example.com', role: 'ADMIN' });
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  test('can log in through the API', async () => {
    await ensureAdmin(db, credentials);
    const app = createApp({ db, corsOrigin: 'http://localhost:5173' });
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: credentials.password }),
      }),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: { role: string } }).data.role).toBe('ADMIN');
  });

  test('running it again changes nothing, not even the password', async () => {
    await ensureAdmin(db, credentials);
    const [before] = await db.select().from(users);
    expect(await ensureAdmin(db, { ...credentials, password: 'a-different-password' })).toBe('exists');
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.passwordHash).toBe(before?.passwordHash);
  });

  test('two runs at the same moment still leave exactly one administrator', async () => {
    const results = await Promise.all([ensureAdmin(db, credentials), ensureAdmin(db, credentials)]);
    expect(results).toContain('created');
    expect(await db.select().from(users)).toHaveLength(1);
  });

  test('refuses to turn an existing customer into an administrator', async () => {
    const customer = await makeUser('CUSTOMER');
    await expect(ensureAdmin(db, { email: customer.email, password: credentials.password })).rejects.toThrow(/CUSTOMER/);
    const [row] = await db.select().from(users).where(eq(users.id, customer.id));
    expect(row?.role).toBe('CUSTOMER');
  });
});
