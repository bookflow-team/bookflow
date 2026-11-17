import { createApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db/client';

const config = loadConfig();
const { db } = createDb(config.DATABASE_URL);

createApp({ db, corsOrigin: config.CORS_ORIGIN }).listen({
  hostname: config.BACKEND_HOST,
  port: config.BACKEND_PORT,
});

console.log(`BookFlow API on http://localhost:${config.BACKEND_PORT}  (health: /health, docs: /api/v1/openapi)`);
