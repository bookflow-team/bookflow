import { afterEach, describe, expect, test } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { loadTestEnv } = require('./load-env.cjs') as { loadTestEnv: (file?: string) => void };

const KEY = 'BOOKFLOW_ENV_TEST_VALUE';
const OTHER = 'BOOKFLOW_ENV_TEST_OTHER';

function envFile(content: string) {
  const file = join(mkdtempSync(join(tmpdir(), 'bookflow-env-')), '.env.test');
  writeFileSync(file, content);
  return file;
}

afterEach(() => {
  delete process.env[KEY];
  delete process.env[OTHER];
});

describe('.env.test loader', () => {
  test('values in .env.test win over variables already exported in the shell', () => {
    process.env[KEY] = 'from the shell';
    loadTestEnv(envFile(`${KEY}=from .env.test\n`));
    expect(process.env[KEY]).toBe('from .env.test');
  });

  test('variables that .env.test does not mention are left alone', () => {
    process.env[OTHER] = 'untouched';
    loadTestEnv(envFile(`${KEY}=1\n`));
    expect(process.env[OTHER]).toBe('untouched');
  });

  test('blank lines, comments and Windows line endings are fine', () => {
    loadTestEnv(envFile(`# a comment\r\n\r\n${KEY}=value\r\n`));
    expect(process.env[KEY]).toBe('value');
  });

  test('without a .env.test file the environment stays as it is, which is what CI relies on', () => {
    process.env[KEY] = 'from the environment';
    loadTestEnv(join(tmpdir(), 'bookflow-no-such-dir', '.env.test'));
    expect(process.env[KEY]).toBe('from the environment');
  });
});
