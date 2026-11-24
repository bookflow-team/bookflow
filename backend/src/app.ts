import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authRoutes } from './auth/routes';
import type { Db } from './db/client';
import { errorHandler } from './http/error-handler';
import { documentation, errorResponse, healthResponse } from './http/openapi';

export function createApp(deps: { db: Db; corsOrigin: string; sessionTtlDays?: number; cookieSecure?: boolean }) {
  const health = async () => {
    await deps.db.execute(sql`select 1`);
    return { data: { status: 'ok' as const } };
  };

  const healthDocs = {
    detail: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Runs `select 1` on the database, so it fails when the database cannot be reached.',
    },
    response: { 200: healthResponse, 500: errorResponse },
  };

  const api = new Elysia({ prefix: '/api/v1' })
    .get('/health', health, healthDocs)
    .use(
      authRoutes({
        db: deps.db,
        sessionTtlMs: (deps.sessionTtlDays ?? 14) * 24 * 3_600_000,
        cookieSecure: deps.cookieSecure ?? false,
      }),
    );

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
