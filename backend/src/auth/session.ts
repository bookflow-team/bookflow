import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { sessions, users, type User } from '../db/schema';

export const SESSION_COOKIE = 'bookflow_session';

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'phone' | 'role'>;

export const sessionUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  phone: users.phone,
  role: users.role,
};

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(db: Db, userId: string, ttlMs: number, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
  await db.insert(sessions).values({
    id: hashSessionToken(token),
    userId,
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
  });
  return token;
}

export async function findSessionUser(db: Db, token: string, now = new Date()): Promise<SessionUser | null> {
  const [row] = await db
    .select(sessionUserColumns)
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashSessionToken(token)), gt(sessions.expiresAt, now)));
  return row ?? null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
}

export function readSessionCookie(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index !== -1 && part.slice(0, index).trim() === SESSION_COOKIE) {
      return part.slice(index + 1).trim() || null;
    }
  }
  return null;
}

export function sessionCookie(token: string, options: { maxAgeSeconds: number; secure: boolean }): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${options.maxAgeSeconds}`,
    ...(options.secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearedSessionCookie(secure: boolean): string {
  return sessionCookie('', { maxAgeSeconds: 0, secure });
}
