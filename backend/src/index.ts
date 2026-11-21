import { createApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();

createApp({ corsOrigin: config.CORS_ORIGIN }).listen({
  hostname: config.BACKEND_HOST,
  port: config.BACKEND_PORT,
});

console.log(`BookFlow API on http://localhost:${config.BACKEND_PORT}  (health: /health, docs: /api/v1/openapi)`);
