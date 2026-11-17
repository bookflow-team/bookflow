import { afterAll } from '@jest/globals';
import { createDb } from '../src/db/client';

const url = process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_URL is required to run the tests (see .env.test.example)');
if (!/test/i.test(new URL(url).pathname)) {
  throw new Error(`Refusing to run tests against "${new URL(url).pathname.slice(1)}": the database name must contain "test"`);
}

export const { db, client } = createDb(url, 5);

afterAll(async () => {
  await client.end();
});
