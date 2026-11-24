import { randomBytes } from 'node:crypto';
import { hash, parseOptions, verify, type Algorithm } from '@node-rs/argon2';

const ARGON2ID = 2 as Algorithm;
const SALT_BYTES = 16;

export const PASSWORD_POLICY = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

function prepare(password: string): string {
  return password.normalize('NFKC');
}

export async function hashPassword(password: string): Promise<string> {
  return hash(prepare(password), { ...PASSWORD_POLICY, algorithm: ARGON2ID, salt: randomBytes(SALT_BYTES) });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('$argon2id$')) return false;
  try {
    return await verify(stored, prepare(password));
  } catch {
    return false;
  }
}

export function needsRehash(stored: string): boolean {
  try {
    const found = parseOptions(stored);
    return (
      found.algorithm !== ARGON2ID ||
      found.memoryCost !== PASSWORD_POLICY.memoryCost ||
      found.timeCost !== PASSWORD_POLICY.timeCost ||
      found.parallelism !== PASSWORD_POLICY.parallelism ||
      found.outputLen !== PASSWORD_POLICY.outputLen ||
      found.saltLen !== SALT_BYTES
    );
  } catch {
    return true;
  }
}

let dummyHash: Promise<string> | undefined;

export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('not-a-real-password');
  await verifyPassword(password, await dummyHash);
}
