import { join } from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { assertTestDatabase } from './assert-test-database';
import { createDb } from './client';

const url = process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_URL is required');
if (process.argv.includes('--test-database')) assertTestDatabase(url);

const { db, client } = createDb(url, 1);
await migrate(db, { migrationsFolder: join(import.meta.dir, '..', '..', 'drizzle') });
await client.end();
console.log('migrations applied');
