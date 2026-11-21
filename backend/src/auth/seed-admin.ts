import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { isUniqueViolation } from '../db/errors';
import { users } from '../db/schema';
import { hashPassword } from './password';

export async function ensureAdmin(
  db: Db,
  input: { email: string; password: string; name?: string },
): Promise<'created' | 'exists'> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email));
  if (existing) {
    if (existing.role !== 'ADMIN') {
      throw new Error(`${email} already exists with the role ${existing.role}, refusing to change it`);
    }
    return 'exists';
  }

  const passwordHash = await hashPassword(input.password);
  try {
    await db.insert(users).values({ email, name: input.name ?? 'Administrator', passwordHash, role: 'ADMIN' });
    return 'created';
  } catch (error) {
    if (isUniqueViolation(error)) return 'exists';
    throw error;
  }
}
