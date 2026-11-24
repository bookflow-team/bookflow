import { z } from 'zod';
import { ensureAdmin } from './auth/seed-admin';
import { createDb } from './db/client';

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(12).max(128),
  })
  .safeParse(process.env);

if (!env.success) {
  const problems = env.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  console.error(`Cannot create the administrator: ${problems}`);
  process.exit(1);
}

const { db, client } = createDb(env.data.DATABASE_URL, 1);
const result = await ensureAdmin(db, { email: env.data.ADMIN_EMAIL, password: env.data.ADMIN_PASSWORD });
await client.end();

console.log(
  result === 'created'
    ? `administrator ${env.data.ADMIN_EMAIL} created`
    : `administrator ${env.data.ADMIN_EMAIL} already exists, nothing changed`,
);
