import { describe, expect, test } from '@jest/globals';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb } from '../src/db/client';
import { AppError } from '../src/errors';
import { db } from './helpers';

const testRoutes = new Elysia({ prefix: '/api/v1' })
  .post('/echo', ({ body }) => ({ data: body }), {
    body: z.object({ name: z.string().min(1), qty: z.number().int().min(1) }),
  })
  .get('/boom', () => {
    throw new Error('relation "users" does not exist');
  })
  .get('/denied', () => {
    throw new AppError('FORBIDDEN', 'You cannot do that');
  });

const app = createApp({ db, corsOrigin: 'http://localhost:5173' }).use(testRoutes);

const callRoot = (path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init));
const call = (path: string, init?: RequestInit) => callRoot(`/api/v1${path}`, init);
const postJson = (path: string, body: string) =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body });

describe('app', () => {
  test('health answers on /health and on /api/v1/health once the database answers', async () => {
    for (const res of [await callRoot('/health'), await call('/health')]) {
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { status: 'ok' } });
    }
  });

  test('health fails when the database cannot be reached', async () => {
    const dead = createDb('postgres://postgres@127.0.0.1:1/none', 1);
    const res = await createApp({ db: dead.db, corsOrigin: 'http://localhost:5173' }).handle(
      new Request('http://localhost/health'),
    );
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR');
    await dead.client.end();
  });

  test('valid input reaches the handler', async () => {
    const res = await postJson('/echo', JSON.stringify({ name: 'x', qty: 2 }));
    expect(res.status).toBe(200);
  });

  test('invalid input becomes 422 in the contract error shape, naming the field', async () => {
    const res = await postJson('/echo', JSON.stringify({ name: 'x', qty: 0 }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; message: string; details: unknown } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(body)).toEqual(['error']);
    expect(JSON.stringify(body.error.details)).toContain('qty');
  });

  test('malformed JSON becomes 400 in the same shape', async () => {
    const res = await postJson('/echo', '{not json');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  test('unknown routes are 404 in the same shape', async () => {
    const res = await call('/nothing-here');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  test('an AppError keeps its code and HTTP status', async () => {
    const res = await call('/denied');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: 'FORBIDDEN', message: 'You cannot do that', details: {} } });
  });

  test('an unexpected error is a 500 that does not leak its message', async () => {
    const res = await call('/boom');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('relation');
    expect(JSON.parse(text).error.code).toBe('INTERNAL_ERROR');
  });
});

describe('CORS', () => {
  const preflight = (path: string, origin: string) =>
    callRoot(path, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET' } });

  test('allows the configured frontend origin, with credentials', async () => {
    for (const path of ['/health', '/api/v1/health']) {
      const res = await preflight(path, 'http://localhost:5173');
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    }
  });

  test('does not reflect an arbitrary origin', async () => {
    const res = await preflight('/api/v1/health', 'https://evil.example');
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
  });
});

describe('OpenAPI', () => {
  const spec = async () => (await (await callRoot('/api/v1/openapi/json')).json()) as {
    openapi: string;
    info: { title: string; description: string };
    tags: { name: string }[];
    paths: Record<string, Record<string, { tags?: string[]; summary?: string; responses: Record<string, unknown> }>>;
    components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> };
  };

  test('the generated document describes the zod body of a route', async () => {
    const res = await callRoot('/api/v1/openapi/json');
    expect(res.status).toBe(200);
    const doc = JSON.stringify(await res.json());
    expect(doc).toContain('/api/v1/echo');
    expect(doc).toContain('qty');
  });

  test('it is a valid OpenAPI 3 document with the API title, a tag list and the cookie security scheme', async () => {
    const doc = await spec();
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.info.title).toBe('BookFlow API');
    expect(doc.info.description).toContain('/api/v1');
    expect(doc.tags.map((t) => t.name)).toContain('System');
    expect(doc.components.securitySchemes).toHaveProperty('sessionCookie');
  });

  test('the health route is documented with a summary, a tag, and both the success and the error response', async () => {
    const doc = await spec();
    for (const path of ['/health', '/api/v1/health']) {
      const op = doc.paths[path]?.['get'];
      expect(op?.summary).toBe('Health check');
      expect(op?.tags).toEqual(['System']);
      expect(Object.keys(op?.responses ?? {})).toEqual(expect.arrayContaining(['200', '500']));
      const failure = JSON.stringify(op?.responses['500']);
      expect(failure).toContain('"error"');
      expect(failure).toContain('"code"');
    }
  });

  test('the interactive documentation page is served as HTML', async () => {
    const res = await callRoot('/api/v1/openapi');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('&quot;url&quot;:&quot;/api/v1/openapi/json&quot;');
  });
});

describe('config', () => {
  const ok = { DATABASE_URL: 'postgres://u@localhost/db', CORS_ORIGIN: 'http://localhost:5173' };

  test('applies defaults', () => {
    expect(loadConfig(ok)).toMatchObject({ BACKEND_PORT: 8000, BACKEND_HOST: '0.0.0.0', SESSION_TTL_DAYS: 14, COOKIE_SECURE: false, TRUST_PROXY: false });
    expect(loadConfig({ ...ok, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(true);
  });

  test('fails fast on bad values', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...ok, CORS_ORIGIN: 'http://localhost:5173/' })).toThrow(/CORS_ORIGIN/);
    expect(() => loadConfig({ ...ok, CORS_ORIGIN: 'javascript:alert(1)' })).toThrow(/CORS_ORIGIN/);
    expect(() => loadConfig({ ...ok, BACKEND_PORT: '99999' })).toThrow(/BACKEND_PORT/);
    expect(() => loadConfig({ ...ok, TRUST_PROXY: 'yes' })).toThrow(/TRUST_PROXY/);
  });
});
