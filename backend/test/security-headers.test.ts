import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Elysia } from 'elysia';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { users } from '../src/db/schema';
import { db, resetDb } from './helpers';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'correct horse battery';
const hour = 3_600_000;

const boom = new Elysia().get('/boom', () => {
  throw new Error('boom');
});

function build(options: { cookieSecure?: boolean } = {}) {
  return createApp({
    db,
    corsOrigin: ORIGIN,
    cookieSecure: options.cookieSecure ?? false,
    authLimits: {
      loginPerAccount: { max: 2, windowMs: hour },
      loginPerAddress: { max: 1000, windowMs: hour },
      registerPerAddress: { max: 1000, windowMs: hour },
    },
  }).use(boom);
}

const json = { 'content-type': 'application/json', origin: ORIGIN };

function post(app: ReturnType<typeof build>, path: string, body: string, headers: Record<string, string> = json) {
  return app.handle(new Request(`http://localhost${path}`, { method: 'POST', headers, body }));
}

const BASE = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-site',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none',
};

function expectBase(res: Response) {
  for (const [name, value] of Object.entries(BASE)) expect(res.headers.get(name)).toBe(value);
}

function expectApi(res: Response) {
  expectBase(res);
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
  expect(res.headers.get('cache-control')).toBe('no-store');
}

beforeEach(async () => {
  await resetDb();
  await db.insert(users).values({ email: 'anna@example.com', name: 'Anna', passwordHash: await hashPassword(PASSWORD), role: 'CUSTOMER' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('security headers', () => {
  test('every kind of answer carries them: success, 401, 422, malformed body, 404, 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const app = build();
    expectApi(await app.handle(new Request('http://localhost/health')));
    expectApi(await app.handle(new Request('http://localhost/api/v1/auth/me')));
    expectApi(await post(app, '/api/v1/auth/register', '{"email":"x"}'));
    expectApi(await post(app, '/api/v1/auth/register', '{not json'));
    expectApi(await app.handle(new Request('http://localhost/api/v1/does-not-exist')));
    const failing = await app.handle(new Request('http://localhost/boom'));
    expect(failing.status).toBe(500);
    expectApi(failing);
  });

  test('also on a refused login, on 429 and on the 204 of a logout', async () => {
    const app = build();
    const login = (password: string) => post(app, '/api/v1/auth/login', JSON.stringify({ email: 'anna@example.com', password }));
    const refused = await login('wrong password');
    expect(refused.status).toBe(401);
    expectApi(refused);

    const ok = await login(PASSWORD);
    expect(ok.status).toBe(200);
    expectApi(ok);
    expect(ok.headers.get('set-cookie')).toContain('bookflow_session=');

    const cookie = (ok.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const out = await post(app, '/api/v1/auth/logout', '', { ...json, cookie });
    expect(out.status).toBe(204);
    expectApi(out);
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0');

    await login('wrong password');
    await login('wrong password');
    const limited = await login(PASSWORD);
    expect(limited.status).toBe(429);
    expectApi(limited);
    expect(limited.headers.get('retry-after')).not.toBeNull();
  });

  test('the answer to a CORS preflight has them too, and the CORS headers are still there', async () => {
    const res = await build().handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'OPTIONS',
        headers: { origin: ORIGIN, 'access-control-request-method': 'POST' },
      }),
    );
    expectApi(res);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  test('a normal request from the frontend still gets its CORS headers and an unchanged body', async () => {
    const res = await build().handle(new Request('http://localhost/api/v1/auth/me', { headers: { origin: ORIGIN } }));
    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(await res.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'You are not logged in', details: {} } });
  });

  test('the documentation page is the exception: no content policy and no no-store, because it loads its script from a CDN', async () => {
    const app = build();
    for (const path of ['/api/v1/openapi', '/api/v1/openapi/json']) {
      const res = await app.handle(new Request(`http://localhost${path}`));
      expect(res.status).toBe(200);
      expectBase(res);
      expect(res.headers.get('content-security-policy')).toBeNull();
      expect(res.headers.get('cache-control')).toBeNull();
    }
  });

  test('a path that only starts like the documentation path is not exempt', async () => {
    const res = await build().handle(new Request('http://localhost/api/v1/openapi-secrets'));
    expect(res.status).toBe(404);
    expectApi(res);
  });
});

describe('Strict-Transport-Security', () => {
  test('is not sent by default, so plain http development is not affected', async () => {
    const res = await build().handle(new Request('http://localhost/health'));
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  test('is sent on every kind of answer when the deployment is HTTPS (COOKIE_SECURE=true)', async () => {
    const app = build({ cookieSecure: true });
    const expected = 'max-age=31536000; includeSubDomains';
    for (const res of [
      await app.handle(new Request('http://localhost/health')),
      await app.handle(new Request('http://localhost/api/v1/auth/me')),
      await app.handle(new Request('http://localhost/api/v1/does-not-exist')),
      await app.handle(new Request('http://localhost/api/v1/openapi')),
    ]) {
      expect(res.headers.get('strict-transport-security')).toBe(expected);
    }
  });
});

describe('API documentation', () => {
  test('the OpenAPI page still opens and describes the routes', async () => {
    const res = await build().handle(new Request('http://localhost/api/v1/openapi/json'));
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(['/api/v1/auth/login', '/api/v1/auth/register']));
  });
});
