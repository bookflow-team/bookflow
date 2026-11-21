import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { hashSessionToken } from '../src/auth/session';
import { sessions, users } from '../src/db/schema';
import { db, H, resetDb } from './helpers';

type Body = { data?: Record<string, unknown>; error?: { code: string } };

const app = createApp({ db, corsOrigin: 'http://localhost:5173' });

function send(method: string, path: string, body?: unknown, cookie?: string) {
  return app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

const cookieOf = (res: Response) => (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
const json = async (res: Response) => (await res.json()) as Body;

const anna = { email: 'anna@example.com', password: 'correct horse battery', role: 'CUSTOMER', name: 'Anna' };

beforeEach(resetDb);

describe('registration', () => {
  test('creates an account and never returns the password or its hash', async () => {
    const res = await send('POST', '/auth/register', { ...anna, phone: '+7 900 000 00 00' });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data).toMatchObject({ email: 'anna@example.com', name: 'Anna', role: 'CUSTOMER', phone: '+7 900 000 00 00' });
    expect(JSON.stringify(body)).not.toMatch(/password|argon2/i);
    expect(res.headers.get('set-cookie')).toBeNull();

    const [row] = await db.select().from(users);
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(row?.passwordHash).not.toContain(anna.password);
  });

  test('lower-cases the e-mail, and the name defaults to the part before the @', async () => {
    const res = await send('POST', '/auth/register', { email: 'Boris.Ivanov@Example.COM', password: 'long enough pw', role: 'BUSINESS_OWNER' });
    expect(res.status).toBe(201);
    expect((await json(res)).data).toMatchObject({ email: 'boris.ivanov@example.com', name: 'boris.ivanov', role: 'BUSINESS_OWNER' });
  });

  test('refuses bad input with the shared 422 error', async () => {
    const bad = [
      { ...anna, password: 'short' },
      { ...anna, email: 'not-an-email' },
      { ...anna, role: 'ADMIN' },
      { ...anna, role: 'SUPERUSER' },
      { email: anna.email, password: anna.password },
    ];
    for (const payload of bad) {
      const res = await send('POST', '/auth/register', payload);
      expect(res.status).toBe(422);
      expect((await json(res)).error?.code).toBe('VALIDATION_ERROR');
    }
    expect(await db.select().from(users)).toHaveLength(0);
  });

  test('a second account with the same e-mail is refused, whatever the letter case', async () => {
    expect((await send('POST', '/auth/register', anna)).status).toBe(201);
    const again = await send('POST', '/auth/register', { ...anna, email: 'ANNA@example.com' });
    expect(again.status).toBe(409);
    expect((await json(again)).error?.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('two registrations for the same e-mail at the same moment: one wins, one gets 409', async () => {
    const results = await Promise.all([send('POST', '/auth/register', anna), send('POST', '/auth/register', anna)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.select().from(users)).toHaveLength(1);
  });
});

describe('login, current user and logout', () => {
  beforeEach(async () => {
    await send('POST', '/auth/register', anna);
  });

  test('a correct login sets a session cookie that is HttpOnly, Lax and lasts the configured time', async () => {
    const res = await send('POST', '/auth/login', { email: 'ANNA@example.com', password: anna.password });
    expect(res.status).toBe(200);
    expect((await json(res)).data).toMatchObject({ email: 'anna@example.com', role: 'CUSTOMER' });
    const header = res.headers.get('set-cookie') ?? '';
    expect(header).toMatch(/^bookflow_session=[\w-]{40,}/);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
    expect(header).toContain(`Max-Age=${14 * 24 * 3600}`);
    expect(header).not.toContain('Secure');
  });

  test('the cookie is marked Secure when the deployment asks for it', async () => {
    const secureApp = createApp({ db, corsOrigin: 'http://localhost:5173', cookieSecure: true, sessionTtlDays: 1 });
    const res = await secureApp.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: anna.email, password: anna.password }),
      }),
    );
    expect(res.headers.get('set-cookie')).toContain('Secure');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=86400');
  });

  test('a wrong password and an unknown e-mail look exactly the same', async () => {
    const wrongPassword = await send('POST', '/auth/login', { email: anna.email, password: 'wrong password' });
    const unknownEmail = await send('POST', '/auth/login', { email: 'nobody@example.com', password: anna.password });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    expect(wrongPassword.headers.get('set-cookie')).toBeNull();
  });

  test('the cookie identifies the user, and the response never contains the password', async () => {
    const cookie = cookieOf(await send('POST', '/auth/login', { email: anna.email, password: anna.password }));
    const me = await send('GET', '/auth/me', undefined, cookie);
    expect(me.status).toBe(200);
    const body = await json(me);
    expect(body.data).toMatchObject({ email: 'anna@example.com', name: 'Anna', role: 'CUSTOMER' });
    expect(JSON.stringify(body)).not.toMatch(/password|argon2/i);
  });

  test('no cookie, a made-up cookie and an expired session are all 401', async () => {
    expect((await send('GET', '/auth/me')).status).toBe(401);
    expect((await send('GET', '/auth/me', undefined, 'bookflow_session=made-up')).status).toBe(401);

    const cookie = cookieOf(await send('POST', '/auth/login', { email: anna.email, password: anna.password }));
    const token = cookie.split('=')[1] ?? '';
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - H) })
      .where(eq(sessions.id, hashSessionToken(token)));
    const res = await send('GET', '/auth/me', undefined, cookie);
    expect(res.status).toBe(401);
    expect((await json(res)).error?.code).toBe('UNAUTHENTICATED');
  });

  test('logout deletes the session, clears the cookie, and the old cookie stops working', async () => {
    const cookie = cookieOf(await send('POST', '/auth/login', { email: anna.email, password: anna.password }));
    const out = await send('POST', '/auth/logout', undefined, cookie);
    expect(out.status).toBe(204);
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await db.select().from(sessions)).toHaveLength(0);
    expect((await send('GET', '/auth/me', undefined, cookie)).status).toBe(401);
  });

  test('logging out without being logged in is 401', async () => {
    expect((await send('POST', '/auth/logout')).status).toBe(401);
  });

  test('two logins make two independent sessions', async () => {
    const first = cookieOf(await send('POST', '/auth/login', { email: anna.email, password: anna.password }));
    const second = cookieOf(await send('POST', '/auth/login', { email: anna.email, password: anna.password }));
    expect(first).not.toBe(second);
    await send('POST', '/auth/logout', undefined, first);
    expect((await send('GET', '/auth/me', undefined, second)).status).toBe(200);
  });
});

describe('API documentation', () => {
  test('the OpenAPI document lists the four auth routes', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/openapi/json'));
    expect(res.status).toBe(200);
    const paths = Object.keys(((await res.json()) as { paths: Record<string, unknown> }).paths);
    for (const path of ['/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/me']) {
      expect(paths).toContain(path);
    }
  });
});
