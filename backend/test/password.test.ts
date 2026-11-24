import { describe, expect, test } from '@jest/globals';
import { hash, parseOptions } from '@node-rs/argon2';
import { burnPasswordCheck, hashPassword, needsRehash, PASSWORD_POLICY, verifyPassword } from '../src/auth/password';

function saltOf(stored: string): string {
  const salt = stored.split('$')[4];
  if (!salt) throw new Error('no salt in the stored value');
  return salt;
}

describe('passwords', () => {
  test('a password verifies against its own hash and not against another password', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('correct horse batterz', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  test('the stored value is an Argon2id string with the agreed cost', async () => {
    const stored = await hashPassword('some password');
    expect(stored.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
    expect(stored).not.toContain('some password');
    const found = parseOptions(stored);
    expect(found.memoryCost).toBe(PASSWORD_POLICY.memoryCost);
    expect(found.timeCost).toBe(PASSWORD_POLICY.timeCost);
    expect(found.parallelism).toBe(PASSWORD_POLICY.parallelism);
    expect(found.outputLen).toBe(PASSWORD_POLICY.outputLen);
  });

  test('every hash gets its own 16 byte random salt, so the same password never gives the same value', async () => {
    const stored = await Promise.all(Array.from({ length: 5 }, () => hashPassword('same password')));
    expect(new Set(stored).size).toBe(5);
    expect(new Set(stored.map(saltOf)).size).toBe(5);
    for (const value of stored) {
      expect(parseOptions(value).saltLen).toBe(16);
      expect(await verifyPassword('same password', value)).toBe(true);
    }
  });

  test('visually identical Unicode forms count as the same password', async () => {
    const composed = 'café-pass';
    const decomposed = 'café-pass';
    const stored = await hashPassword(composed);
    expect(await verifyPassword(decomposed, stored)).toBe(true);
  });

  test('a broken or foreign stored value never verifies and never throws', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$16384$8$1$c2FsdA==$aGFzaA==')).toBe(false);
    expect(await verifyPassword('x', '$argon2id$v=19$m=19456,t=2,p=1$broken$value')).toBe(false);
  });

  test('a hash made with another Argon2 variant is refused', async () => {
    const argon2i = await hash('x', { algorithm: 1 });
    expect(await verifyPassword('x', argon2i)).toBe(false);
  });

  test('hashes made with the current policy are fine and weaker or foreign ones need a rehash', async () => {
    expect(needsRehash(await hashPassword('x'))).toBe(false);
    expect(needsRehash(await hash('x', { memoryCost: 8, timeCost: 1, algorithm: 2 }))).toBe(true);
    expect(needsRehash(await hash('x', { ...PASSWORD_POLICY, algorithm: 1 }))).toBe(true);
    expect(needsRehash('not-a-hash')).toBe(true);
  });

  test('the dummy check used for unknown e-mails runs without error', async () => {
    await expect(burnPasswordCheck('anything')).resolves.toBeUndefined();
  });
});
