import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string, max = 10) {
  const client = postgres(url, { max, onnotice: () => {} });
  const db: Db = drizzle(client, { schema });
  return { db, client };
}
