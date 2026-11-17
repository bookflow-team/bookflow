import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from './db/client';
import { errorHandler } from './http/error-handler';
import { documentation, errorResponse, healthResponse } from './http/openapi';

export function createApp(deps: { db: Db; corsOrigin: string }) {
  const health = async () => {
    await deps.db.execute(sql`select 1`);
    return { data: { status: 'ok' as const } };
  };

  const healthDocs = {
    detail: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Returns ok while the server is running.',
    },
    response: { 200: healthResponse, 500: errorResponse },
  };

  const api = new Elysia({ prefix: '/api/v1' }).get('/health', health, healthDocs);

  return (
    new Elysia()
      .use(cors({ origin: deps.corsOrigin, credentials: true }))
      .use(
        openapi({
          path: '/api/v1/openapi',
          documentation,
          scalar: { url: '/api/v1/openapi/json' },
          mapJsonSchema: { zod: z.toJSONSchema },
        }),
      )
      .use(errorHandler)
      .get('/health', health, healthDocs)
      .use(api)
  );
}
