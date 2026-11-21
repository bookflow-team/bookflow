import { afterAll } from '@jest/globals';
import { assertTestDatabase } from '../src/db/assert-test-database';
import { createDb } from '../src/db/client';

const url = assertTestDatabase(process.env['DATABASE_URL']);

export const { db, client } = createDb(url, 5);

afterAll(async () => {
  await client.end();
});
