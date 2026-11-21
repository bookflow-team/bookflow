import { beforeEach, describe, expect, test } from '@jest/globals';
import { createApp } from '../src/app';
import type { AuthLimits } from '../src/auth/limits';
import { hashPassword } from '../src/auth/password';
import { sessions, users } from '../src/db/schema';
import { db, resetDb } from './helpers';

const MINUTE = 60_000;
const PASSWORD = 'correct horse battery';

function setup(options: { trustProxy?: boolean; limits?: Partial<AuthLimits> } = {}) {
  const time = { current: Date.UTC(2026, 10, 21) };
  const app = createApp({
    db,
    corsOrigin: 'http://localhost:5173',
    trustProxy: options.trustProxy ?? true,
    authLimits: {
      loginPerAccount: { max: 3, windowMs: 15 * MINUTE },
      loginPerAddress: { max: 6, windowMs: 15 * MINUTE },
      registerPerAddress: { max: 3, windowMs: 60 * MINUTE },
      now: () => time.current,
      ...options.limits,
    },
  });
  const send = (path: string, body: unknown, address = '1.1.1.1') =>
    app.handle(
      new Request(`http://localhost/api/v1${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': address },
        body: JSON.stringify(body),
      }),
    );
  const login = (email: string, password: string, address?: string) => send('/auth/login', { email, password }, address);
  return { time, send, login };
}

async function makeAccount(email: string) {
  await db.insert(users).values({ email, name: email, passwordHash: await hashPassword(PASSWORD), role: 'CUSTOMER' });
}

const statuses = async (calls: Promise<Response>[]) => (await Promise.all(calls)).map((res) => res.status);

beforeEach(async () => {
  await resetDb();
  await makeAccount('anna@example.com');
});

describe('failed logins', () => {
  test('after the allowed wrong passwords the next attempt is 429, even with the right password', async () => {
    const { login } = setup();
    for (let i = 0; i < 3; i += 1) expect((await login('anna@example.com', 'wrong password')).status).toBe(401);

    const blocked = await login('anna@example.com', PASSWORD);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('900');
    expect(blocked.headers.get('set-cookie')).toBeNull();
    expect(await blocked.json()).toMatchObject({
      error: { code: 'TOO_MANY_ATTEMPTS', details: { retryAfterSeconds: 900 } },
    });
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  test('the seconds left go down while waiting, and logging in works again when the window is over', async () => {
    const { login, time } = setup();
    for (let i = 0; i < 3; i += 1) await login('anna@example.com', 'wrong password');
    time.current += 10 * MINUTE;
    expect((await login('anna@example.com', PASSWORD)).headers.get('retry-after')).toBe('300');
    time.current += 5 * MINUTE;
    const again = await login('anna@example.com', PASSWORD);
    expect(again.status).toBe(200);
    expect(again.headers.get('set-cookie')).toContain('bookflow_session=');
  });

  test('a good login clears the count for that e-mail', async () => {
    const { login } = setup();
    await login('anna@example.com', 'wrong password');
    await login('anna@example.com', 'wrong password');
    expect((await login('anna@example.com', PASSWORD)).status).toBe(200);
    for (let i = 0; i < 3; i += 1) expect((await login('anna@example.com', 'wrong password')).status).toBe(401);
    expect((await login('anna@example.com', 'wrong password')).status).toBe(429);
  });

  test('the block is per address, so somebody else cannot lock the real owner out', async () => {
    const { login } = setup();
    for (let i = 0; i < 4; i += 1) await login('anna@example.com', 'wrong password', '6.6.6.6');
    expect((await login('anna@example.com', PASSWORD, '6.6.6.6')).status).toBe(429);
    expect((await login('anna@example.com', PASSWORD, '203.0.113.9')).status).toBe(200);
  });

  test('an unknown e-mail is counted exactly like a known one, so the limit gives nothing away', async () => {
    const { login } = setup();
    const known = await statuses([1, 2, 3, 4].map(() => login('anna@example.com', 'wrong password', '7.7.7.7')));
    const unknown = await statuses([1, 2, 3, 4].map(() => login('nobody@example.com', 'wrong password', '8.8.8.8')));
    expect(known).toEqual([401, 401, 401, 429]);
    expect(unknown).toEqual(known);
  });

  test('attempts sent at the same moment cannot slip past the limit', async () => {
    const { login } = setup();
    const results = await statuses(Array.from({ length: 10 }, () => login('anna@example.com', 'wrong password')));
    expect(results.filter((s) => s === 401)).toHaveLength(3);
    expect(results.filter((s) => s === 429)).toHaveLength(7);
  });

  test('one address trying many e-mails is stopped by the per-address limit', async () => {
    const { login } = setup();
    for (let i = 0; i < 6; i += 1) expect((await login(`nobody${i}@example.com`, 'wrong password', '9.9.9.9')).status).toBe(401);
    expect((await login('brand-new@example.com', 'wrong password', '9.9.9.9')).status).toBe(429);
    expect((await login('anna@example.com', PASSWORD, '9.9.9.9')).status).toBe(429);
    expect((await login('anna@example.com', PASSWORD, '203.0.113.9')).status).toBe(200);
  });

  test('good logins do not use up the budget of the address', async () => {
    const { login } = setup();
    for (let i = 0; i < 10; i += 1) expect((await login('anna@example.com', PASSWORD)).status).toBe(200);
    expect((await login('anna@example.com', 'wrong password')).status).toBe(401);
  });

  test('requests refused as invalid are not counted', async () => {
    const { login, send } = setup();
    for (let i = 0; i < 5; i += 1) expect((await login('anna@example.com', '')).status).toBe(422);
    expect((await send('/auth/login', { password: 'x' })).status).toBe(422);
    expect((await login('anna@example.com', 'wrong password')).status).toBe(401);
  });

  test('a forged X-Forwarded-For does not help when no proxy is trusted', async () => {
    const { login } = setup({ trustProxy: false });
    const results = await statuses(
      ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4'].map((address) => login('anna@example.com', 'wrong password', address)),
    );
    expect(results).toEqual([401, 401, 401, 429]);
  });
});

describe('registrations', () => {
  const account = (n: number) => ({ email: `new${n}@example.com`, password: PASSWORD, role: 'CUSTOMER' });

  test('one address can only register so many accounts per hour', async () => {
    const { send, time } = setup();
    expect(await statuses([1, 2, 3].map((n) => send('/auth/register', account(n))))).toEqual([201, 201, 201]);

    const blocked = await send('/auth/register', account(4));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('3600');
    expect(await db.select().from(users)).toHaveLength(4);

    expect((await send('/auth/register', account(5), '203.0.113.9')).status).toBe(201);
    time.current += 60 * MINUTE;
    expect((await send('/auth/register', account(6))).status).toBe(201);
  });

  test('refused sign-ups count too, because they cost a hash as well', async () => {
    const { send } = setup();
    const results: number[] = [];
    for (let i = 0; i < 3; i += 1) results.push((await send('/auth/register', account(1))).status);
    expect(results).toEqual([201, 409, 409]);
    expect((await send('/auth/register', account(2))).status).toBe(429);
  });

  test('registering does not touch the login limits', async () => {
    const { send, login } = setup();
    await send('/auth/register', account(1));
    for (let i = 0; i < 3; i += 1) expect((await login('new1@example.com', 'wrong password')).status).toBe(401);
    expect((await login('new1@example.com', PASSWORD)).status).toBe(429);
  });
});

describe('API documentation', () => {
  test('the OpenAPI document lists 429 on login and register', async () => {
    const { app } = { app: createApp({ db, corsOrigin: 'http://localhost:5173' }) };
    const doc = (await (await app.handle(new Request('http://localhost/api/v1/openapi/json'))).json()) as {
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
    };
    expect(doc.paths['/api/v1/auth/login']?.['post']?.responses['429']).toBeDefined();
    expect(doc.paths['/api/v1/auth/register']?.['post']?.responses['429']).toBeDefined();
  });
});
