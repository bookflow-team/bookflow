import { and, eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../db/client';
import { isUniqueViolation } from '../db/errors';
import { users } from '../db/schema';
import { AppError } from '../errors';
import { clientIp } from '../http/client-ip';
import { requireUser } from '../http/guards';
import { errorDoc, jsonResponse, noContentDoc } from '../http/openapi';
import { sessionUser } from '../http/session-user';
import { takeFromAll } from './attempt-limiter';
import { createAuthLimiters, type AuthLimits } from './limits';
import { burnPasswordCheck, hashPassword, needsRehash, verifyPassword } from './password';
import { clearedSessionCookie, createSession, deleteSession, sessionCookie, sessionUserColumns } from './session';

const registerBody = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(['CUSTOMER', 'BUSINESS_OWNER']),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
}).meta({
  id: 'RegisterRequest',
  example: { email: 'anna@example.com', password: 'correct horse battery', role: 'CUSTOMER' },
});

const loginBody = z
  .object({
    email: z.string().min(1).max(254),
    password: z.string().min(1).max(128),
  })
  .meta({ id: 'LoginRequest', example: { email: 'anna@example.com', password: 'correct horse battery' } });

const exampleUser = {
  id: '3f1c2a52-8b9e-4a54-9c1e-0f5a6d7e8b90',
  email: 'anna@example.com',
  name: 'anna',
  phone: null,
  role: 'CUSTOMER',
};

const userEnvelope = z
  .object({
    data: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      phone: z.string().nullable(),
      role: z.enum(['CUSTOMER', 'BUSINESS_OWNER', 'ADMIN']),
    }),
  })
  .meta({ id: 'UserResponse', example: { data: exampleUser } });

const sessionCookieHeader = {
  'Set-Cookie': {
    description: 'The session cookie: HttpOnly, SameSite=Lax, valid for 14 days. The browser stores it and sends it back by itself.',
    schema: { type: 'string' as const },
    example: 'bookflow_session=Zk3vXq8mT1uJwY0bN5cLhR2sDfA7eGp9KiOoVxUtQ4E; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600',
  },
};

const clearedCookieHeader = {
  'Set-Cookie': {
    description: 'Empties the cookie so the browser forgets the session.',
    schema: { type: 'string' as const },
    example: 'bookflow_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  },
};

const validationFailed = errorDoc(
  'Some fields are invalid. `details.issues` lists them and `path[0]` is the name of the field.',
  'VALIDATION_ERROR',
  'Invalid request data',
  { details: { on: 'body', issues: [{ path: ['password'], message: 'Too small: expected string to have >=8 characters' }] } },
);

const tooManyAttemptsDoc = errorDoc(
  'Too many attempts from this address. Wait `Retry-After` seconds: even the right password is refused while the block lasts.',
  'TOO_MANY_ATTEMPTS',
  'Too many attempts, try again later',
  {
    details: { retryAfterSeconds: 900 },
    headers: { 'Retry-After': { description: 'Seconds to wait before trying again.', schema: { type: 'string' as const }, example: '900' } },
  },
);

const notLoggedIn = errorDoc(
  'There is no valid session cookie: the visitor never logged in, logged out, or the session expired.',
  'UNAUTHENTICATED',
  'You are not logged in',
);

function tooManyAttempts(retryAfterSeconds: number) {
  return new AppError('TOO_MANY_ATTEMPTS', 'Too many attempts, try again later', { retryAfterSeconds });
}

export function authRoutes(deps: {
  db: Db;
  sessionTtlMs: number;
  cookieSecure: boolean;
  trustProxy?: boolean;
  limits?: Partial<AuthLimits>;
}) {
  const { db } = deps;
  const limiters = createAuthLimiters(deps.limits);
  const addressOf = (request: Request, server: Parameters<typeof clientIp>[1]) =>
    clientIp(request, server, deps.trustProxy ?? false);

  return new Elysia({ prefix: '/auth' })
    .use(sessionUser(db))
    .post(
      '/register',
      async ({ body, set, request, server }) => {
        const wait = limiters.registerPerAddress.take(addressOf(request, server));
        if (wait > 0) throw tooManyAttempts(wait);

        const email = body.email.trim().toLowerCase();
        const passwordHash = await hashPassword(body.password);
        try {
          const [created] = await db
            .insert(users)
            .values({
              email,
              name: body.name ?? email.split('@')[0] ?? email,
              phone: body.phone ?? null,
              passwordHash,
              role: body.role,
            })
            .returning(sessionUserColumns);
          if (!created) throw new AppError('INTERNAL_ERROR', 'Account was not created');
          set.status = 201;
          return { data: created };
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new AppError('EMAIL_ALREADY_EXISTS', 'An account with this e-mail already exists');
          }
          throw error;
        }
      },
      {
        body: registerBody,
        detail: {
          tags: ['Auth'],
          summary: 'Register',
          description:
            'Public. Creates a `CUSTOMER` or `BUSINESS_OWNER` account. Administrators cannot register here. The password needs 8 to 128 characters, `name` and `phone` are optional and the name defaults to the part of the e-mail before the @. E-mails are stored in lower case. The visitor is **not** logged in afterwards: call `POST /auth/login` next. One address can send 20 registrations per hour, after that it gets 429 with a `Retry-After` header.',
          security: [],
          responses: {
            201: jsonResponse({
              description: 'The account was created. There is no cookie yet.',
              schema: userEnvelope,
              example: { data: exampleUser },
            }),
            409: errorDoc(
              'An account with this e-mail exists already (letter case does not matter).',
              'EMAIL_ALREADY_EXISTS',
              'An account with this e-mail already exists',
            ),
            422: validationFailed,
            429: tooManyAttemptsDoc,
          },
        },
      },
    )
    .post(
      '/login',
      async ({ body, set, request, server }) => {
        const email = body.email.trim().toLowerCase();
        const address = addressOf(request, server);
        const accountKey = `${address}|${email}`;
        const wait = takeFromAll([
          [limiters.loginPerAccount, accountKey],
          [limiters.loginPerAddress, address],
        ]);
        if (wait > 0) throw tooManyAttempts(wait);

        const [row] = await db
          .select({ ...sessionUserColumns, passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.email, email));
        let valid = false;
        if (row) valid = await verifyPassword(body.password, row.passwordHash);
        else await burnPasswordCheck(body.password);
        if (!row || !valid) throw new AppError('UNAUTHENTICATED', 'Wrong e-mail or password');
        limiters.loginPerAccount.clear(accountKey);
        limiters.loginPerAddress.refund(address);

        if (needsRehash(row.passwordHash)) {
          await db
            .update(users)
            .set({ passwordHash: await hashPassword(body.password) })
            .where(and(eq(users.id, row.id), eq(users.passwordHash, row.passwordHash)));
        }

        const token = await createSession(db, row.id, deps.sessionTtlMs);
        set.headers['set-cookie'] = sessionCookie(token, {
          maxAgeSeconds: Math.floor(deps.sessionTtlMs / 1000),
          secure: deps.cookieSecure,
        });
        return { data: { id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role } };
      },
      {
        body: loginBody,
        detail: {
          tags: ['Auth'],
          summary: 'Log in',
          description:
            'Public. Checks the e-mail (letter case does not matter) and the password and sets the `bookflow_session` cookie, see the `Set-Cookie` header of the 200 answer. A wrong password and an unknown e-mail give exactly the same 401 on purpose. After 5 wrong passwords for the same e-mail from the same address (or 30 from one address) in 15 minutes, further attempts get 429 with a `Retry-After` header until the window is over.',
          security: [],
          responses: {
            200: jsonResponse({
              description: 'Logged in. The answer carries the session cookie.',
              schema: userEnvelope,
              example: { data: exampleUser },
              headers: sessionCookieHeader,
            }),
            401: errorDoc('The e-mail or the password is wrong.', 'UNAUTHENTICATED', 'Wrong e-mail or password'),
            422: validationFailed,
            429: tooManyAttemptsDoc,
          },
        },
      },
    )
    .post(
      '/logout',
      async ({ user, sessionToken }) => {
        requireUser(user);
        if (sessionToken) await deleteSession(db, sessionToken);
        return new Response(null, { status: 204, headers: { 'set-cookie': clearedSessionCookie(deps.cookieSecure) } });
      },
      {
        detail: {
          tags: ['Auth'],
          summary: 'Log out',
          description:
            'Ends the current session: its row is deleted, so the old cookie stops working at once, and the cookie is cleared. The answer has no body, so do not call `.json()` on it.',
          responses: {
            204: noContentDoc('Logged out. The answer has no body.', clearedCookieHeader),
            401: notLoggedIn,
          },
        },
      },
    )
    .get(
      '/me',
      ({ user }) => ({ data: requireUser(user) }),
      {
        detail: {
          tags: ['Auth'],
          summary: 'Current user',
          description:
            'Returns the logged-in user. Call it when the app starts to find out whether the visitor is logged in: 401 means no.',
          responses: {
            200: jsonResponse({ description: 'The logged-in user.', schema: userEnvelope, example: { data: exampleUser } }),
            401: notLoggedIn,
          },
        },
      },
    );
}
