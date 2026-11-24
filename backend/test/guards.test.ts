import { beforeEach, describe, expect, test } from '@jest/globals';
import { Elysia } from 'elysia';
import { createApp } from '../src/app';
import { createSession, type SessionUser } from '../src/auth/session';
import { AppError } from '../src/errors';
import { assertOwner, requireRole, requireUser } from '../src/http/guards';
import { sessionUser } from '../src/http/session-user';
import { db, H, makeUser, resetDb } from './helpers';

const FRONTEND = 'http://localhost:5173';

const asUser = (role: SessionUser['role']): SessionUser => ({
  id: 'u1',
  email: 'u1@test.local',
  name: 'U1',
  phone: null,
  role,
});

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as AppError).code;
  }
  return undefined;
}

describe('guard functions', () => {
  test('requireUser lets a user through and refuses nobody with UNAUTHENTICATED', () => {
    expect(requireUser(asUser('CUSTOMER')).id).toBe('u1');
    expect(codeOf(() => requireUser(null))).toBe('UNAUTHENTICATED');
  });

  test('requireRole checks the role: UNAUTHENTICATED without a user, FORBIDDEN for the wrong role', () => {
    expect(requireRole(asUser('ADMIN'), 'ADMIN').role).toBe('ADMIN');
    expect(requireRole(asUser('BUSINESS_OWNER'), 'BUSINESS_OWNER', 'ADMIN').role).toBe('BUSINESS_OWNER');
    expect(codeOf(() => requireRole(null, 'ADMIN'))).toBe('UNAUTHENTICATED');
    expect(codeOf(() => requireRole(asUser('CUSTOMER'), 'ADMIN'))).toBe('FORBIDDEN');
    expect(codeOf(() => requireRole(asUser('CUSTOMER'), 'BUSINESS_OWNER', 'ADMIN'))).toBe('FORBIDDEN');
  });

  test('assertOwner passes for the owner and says FORBIDDEN for anybody else', () => {
    expect(codeOf(() => assertOwner('u1', asUser('BUSINESS_OWNER')))).toBeUndefined();
    expect(codeOf(() => assertOwner('someone-else', asUser('BUSINESS_OWNER')))).toBe('FORBIDDEN');
  });
});

const probes = new Elysia({ prefix: '/api/v1' })
  .use(sessionUser(db))
  .get('/probe/any-user', ({ user }) => ({ data: requireUser(user).id }))
  .get('/probe/owners', ({ user }) => ({ data: requireRole(user, 'BUSINESS_OWNER').id }))
  .get('/probe/admins', ({ user }) => ({ data: requireRole(user, 'ADMIN').id }))
  .get('/probe/owned-by/:ownerId', ({ user, params }) => {
    assertOwner(params.ownerId, requireRole(user, 'BUSINESS_OWNER'));
    return { data: 'yours' };
  })
  .post('/probe/change', ({ user }) => ({ data: requireUser(user).id }));

const app = createApp({ db, corsOrigin: FRONTEND }).use(probes);

async function login(role: SessionUser['role']) {
  const user = await makeUser(role);
  const token = await createSession(db, user.id, 24 * H);
  return { user, cookie: `bookflow_session=${token}` };
}

const call = (method: string, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost/api/v1${path}`, { method, headers }));
const codeFrom = async (res: Response) => ((await res.json()) as { error?: { code: string } }).error?.code;

beforeEach(resetDb);

describe('guarded routes', () => {
  test('a visitor without a session is 401 on every protected route', async () => {
    for (const path of ['/probe/any-user', '/probe/owners', '/probe/admins']) {
      const res = await call('GET', path);
      expect(res.status).toBe(401);
      expect(await codeFrom(res)).toBe('UNAUTHENTICATED');
    }
  });

  test('each role reaches only its own routes', async () => {
    const customer = await login('CUSTOMER');
    const owner = await login('BUSINESS_OWNER');
    const admin = await login('ADMIN');

    expect((await call('GET', '/probe/any-user', { cookie: customer.cookie })).status).toBe(200);
    expect((await call('GET', '/probe/owners', { cookie: owner.cookie })).status).toBe(200);
    expect((await call('GET', '/probe/admins', { cookie: admin.cookie })).status).toBe(200);

    const customerOnOwners = await call('GET', '/probe/owners', { cookie: customer.cookie });
    expect(customerOnOwners.status).toBe(403);
    expect(await codeFrom(customerOnOwners)).toBe('FORBIDDEN');
    expect((await call('GET', '/probe/admins', { cookie: customer.cookie })).status).toBe(403);
    expect((await call('GET', '/probe/admins', { cookie: owner.cookie })).status).toBe(403);
    expect((await call('GET', '/probe/owners', { cookie: admin.cookie })).status).toBe(403);
  });

  test('one owner cannot reach another owner’s resource', async () => {
    const first = await login('BUSINESS_OWNER');
    const second = await login('BUSINESS_OWNER');
    expect((await call('GET', `/probe/owned-by/${first.user.id}`, { cookie: first.cookie })).status).toBe(200);
    const crossing = await call('GET', `/probe/owned-by/${first.user.id}`, { cookie: second.cookie });
    expect(crossing.status).toBe(403);
    expect(await codeFrom(crossing)).toBe('FORBIDDEN');
  });
});

describe('origin check on requests that change data', () => {
  test('a request from another website is refused even with a valid session', async () => {
    const { cookie } = await login('CUSTOMER');
    const res = await call('POST', '/probe/change', { cookie, origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(await codeFrom(res)).toBe('FORBIDDEN');
  });

  test('the frontend origin and requests without an Origin header are accepted', async () => {
    const { cookie } = await login('CUSTOMER');
    expect((await call('POST', '/probe/change', { cookie, origin: FRONTEND })).status).toBe(200);
    expect((await call('POST', '/probe/change', { cookie })).status).toBe(200);
  });

  test('reading data is not affected by the origin', async () => {
    const { cookie } = await login('CUSTOMER');
    expect((await call('GET', '/probe/any-user', { cookie, origin: 'https://evil.example' })).status).toBe(200);
  });

  test('login and logout are covered too', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
        body: JSON.stringify({ email: 'a@example.com', password: 'whatever it is' }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
