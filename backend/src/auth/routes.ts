import { and, eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../db/client';
import { isUniqueViolation } from '../db/errors';
import { users } from '../db/schema';
import { AppError } from '../errors';
import { errorResponse } from '../http/openapi';
import { sessionUser } from '../http/session-user';
import { burnPasswordCheck, hashPassword, needsRehash, verifyPassword } from './password';
import { clearedSessionCookie, createSession, deleteSession, sessionCookie, sessionUserColumns } from './session';

const registerBody = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(['CUSTOMER', 'BUSINESS_OWNER']),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
});

const loginBody = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

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
  .meta({ id: 'UserResponse' });

export function authRoutes(deps: { db: Db; sessionTtlMs: number; cookieSecure: boolean }) {
  const { db } = deps;

  return new Elysia({ prefix: '/auth' })
    .use(sessionUser(db))
    .post(
      '/register',
      async ({ body, set }) => {
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
            'Creates a customer or business owner account. Administrators cannot register here. The name is optional and defaults to the part of the e-mail before the @.',
        },
        response: { 201: userEnvelope, 409: errorResponse, 422: errorResponse },
      },
    )
    .post(
      '/login',
      async ({ body, set }) => {
        const email = body.email.trim().toLowerCase();
        const [row] = await db
          .select({ ...sessionUserColumns, passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.email, email));
        let valid = false;
        if (row) valid = await verifyPassword(body.password, row.passwordHash);
        else await burnPasswordCheck(body.password);
        if (!row || !valid) throw new AppError('UNAUTHENTICATED', 'Wrong e-mail or password');

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
          description: 'Checks the e-mail and password and sets the session cookie.',
        },
        response: { 200: userEnvelope, 401: errorResponse, 422: errorResponse },
      },
    )
    .post(
      '/logout',
      async ({ user, sessionToken }) => {
        if (!user || !sessionToken) throw new AppError('UNAUTHENTICATED', 'You are not logged in');
        await deleteSession(db, sessionToken);
        return new Response(null, { status: 204, headers: { 'set-cookie': clearedSessionCookie(deps.cookieSecure) } });
      },
      {
        detail: { tags: ['Auth'], summary: 'Log out', description: 'Ends the current session and clears the cookie.' },
      },
    )
    .get(
      '/me',
      ({ user }) => {
        if (!user) throw new AppError('UNAUTHENTICATED', 'You are not logged in');
        return { data: user };
      },
      {
        detail: { tags: ['Auth'], summary: 'Current user', description: 'Returns the logged-in user.' },
        response: { 200: userEnvelope, 401: errorResponse },
      },
    );
}
