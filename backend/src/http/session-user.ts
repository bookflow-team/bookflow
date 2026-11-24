import { Elysia } from 'elysia';
import { findSessionUser, readSessionCookie } from '../auth/session';
import type { Db } from '../db/client';

export function sessionUser(db: Db) {
  return new Elysia().derive({ as: 'scoped' }, async ({ request }) => {
    const sessionToken = readSessionCookie(request.headers.get('cookie'));
    const user = sessionToken ? await findSessionUser(db, sessionToken) : null;
    return { sessionToken, user };
  });
}
