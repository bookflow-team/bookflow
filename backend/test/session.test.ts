import { beforeEach, describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import {
  clearedSessionCookie,
  createSession,
  deleteSession,
  findSessionUser,
  hashSessionToken,
  readSessionCookie,
  sessionCookie,
} from '../src/auth/session';
import { sessions } from '../src/db/schema';
import { db, H, makeUser, NOW, resetDb } from './helpers';

beforeEach(resetDb);

describe('sessions', () => {
  test('only the hash of the token is stored, and the token finds its user', async () => {
    const user = await makeUser('CUSTOMER');
    const token = await createSession(db, user.id, 24 * H, NOW);

    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(hashSessionToken(token));
    expect(rows[0]?.id).not.toBe(token);

    expect(await findSessionUser(db, token, NOW)).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: null,
      role: 'CUSTOMER',
    });
  });

  test('a session stops working at its expiry instant', async () => {
    const user = await makeUser('CUSTOMER');
    const token = await createSession(db, user.id, 24 * H, NOW);
    expect(await findSessionUser(db, token, new Date(NOW.getTime() + 24 * H - 1))).not.toBeNull();
    expect(await findSessionUser(db, token, new Date(NOW.getTime() + 24 * H))).toBeNull();
  });

  test('unknown tokens find nothing, and deleting a session logs it out', async () => {
    const user = await makeUser('CUSTOMER');
    const token = await createSession(db, user.id, 24 * H, NOW);
    expect(await findSessionUser(db, 'made-up-token', NOW)).toBeNull();
    await deleteSession(db, token);
    expect(await findSessionUser(db, token, NOW)).toBeNull();
  });

  test('creating a session clears that user’s expired ones', async () => {
    const user = await makeUser('CUSTOMER');
    const other = await makeUser('CUSTOMER');
    await createSession(db, user.id, H, NOW);
    await createSession(db, other.id, H, NOW);
    const later = new Date(NOW.getTime() + 2 * H);
    await createSession(db, user.id, H, later);

    expect(await db.select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(1);
    expect(await db.select().from(sessions).where(eq(sessions.userId, other.id))).toHaveLength(1);
  });
});

describe('session cookie', () => {
  test('is HttpOnly, Lax, site-wide, and only Secure when asked', () => {
    const plain = sessionCookie('abc', { maxAgeSeconds: 60, secure: false });
    expect(plain).toBe('bookflow_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=60');
    expect(sessionCookie('abc', { maxAgeSeconds: 60, secure: true })).toContain('; Secure');
    expect(clearedSessionCookie(false)).toContain('Max-Age=0');
  });

  test('is found among other cookies and ignored when absent', () => {
    expect(readSessionCookie('theme=dark; bookflow_session=tok123; lang=en')).toBe('tok123');
    expect(readSessionCookie('theme=dark')).toBeNull();
    expect(readSessionCookie('bookflow_session=')).toBeNull();
    expect(readSessionCookie(null)).toBeNull();
    expect(readSessionCookie('xbookflow_session=nope')).toBeNull();
  });
});
