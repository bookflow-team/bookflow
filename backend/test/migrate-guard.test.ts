import { describe, expect, test } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { assertTestDatabase } from '../src/db/assert-test-database';

const backend = join(__dirname, '..');

function migrateTest(databaseUrl: string) {
  const result = spawnSync('bun', ['--preload', './test/load-env.cjs', 'src/db/migrate.ts', '--test-database'], {
    cwd: backend,
    env: { ...process.env, DATABASE_URL: databaseUrl, BOOKFLOW_ENV_TEST_FILE: join(backend, 'missing.env.test') },
    encoding: 'utf8',
    timeout: 30_000,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('assertTestDatabase', () => {
  test('accepts a database whose name contains test', () => {
    const url = 'postgres://bookflow:secret@localhost:5432/bookflow_test';
    expect(assertTestDatabase(url)).toBe(url);
    expect(assertTestDatabase('postgres://u@localhost/TEST_db')).toBe('postgres://u@localhost/TEST_db');
  });

  test('rejects any other database, and only the database name counts', () => {
    for (const url of [
      'postgres://u@localhost:5432/bookflow',
      'postgres://u@localhost:5432/bookflow_dev',
      'postgres://u@localhost:5432/postgres',
      'postgres://test:test@testhost:5432/production',
    ]) {
      expect(() => assertTestDatabase(url)).toThrow(/must contain "test"/);
    }
  });

  test('rejects a missing or malformed URL', () => {
    expect(() => assertTestDatabase(undefined)).toThrow(/DATABASE_URL is required/);
    expect(() => assertTestDatabase('')).toThrow(/DATABASE_URL is required/);
    expect(() => assertTestDatabase('not a url')).toThrow(/not a valid URL/);
  });
});

describe('bun run db:migrate:test', () => {
  test('refuses a development database before it connects, even when .env.test is missing', () => {
    const { status, output } = migrateTest('postgres://bookflow@127.0.0.1:1/bookflow');
    expect(status).not.toBe(0);
    expect(output).toContain('must contain "test"');
    expect(output).not.toMatch(/ECONNREFUSED|connect/i);
  });

  test('lets a test database through to the connection step', () => {
    const { status, output } = migrateTest('postgres://bookflow@127.0.0.1:1/bookflow_test');
    expect(status).not.toBe(0);
    expect(output).not.toContain('must contain "test"');
    expect(output).toMatch(/ECONNREFUSED|connect/i);
  });
});
