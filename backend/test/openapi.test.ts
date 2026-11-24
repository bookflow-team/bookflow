import { beforeEach, describe, expect, test } from '@jest/globals';
import { createApp } from '../src/app';
import { db, resetDb } from './helpers';

type Operation = {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: unknown[];
  requestBody?: { content: { 'application/json': { schema: { $defs?: Record<string, { example?: unknown }> } } } };
  responses: Record<string, { description?: string; headers?: Record<string, { example?: string }>; content?: { 'application/json': { example?: unknown } } }>;
};
type Doc = { security?: unknown[]; components: { securitySchemes: Record<string, unknown> }; paths: Record<string, Record<string, Operation>> };

const app = createApp({ db, corsOrigin: 'http://localhost:5173' });

async function document(): Promise<Doc> {
  return (await (await app.handle(new Request('http://localhost/api/v1/openapi/json'))).json()) as Doc;
}

function operation(doc: Doc, method: string, path: string): Operation {
  const found = doc.paths[path]?.[method];
  if (!found) throw new Error(`${method} ${path} is not documented`);
  return found;
}

function requestExample(op: Operation): Record<string, unknown> {
  const defs = op.requestBody?.content['application/json'].schema.$defs ?? {};
  const example = Object.values(defs)[0]?.example;
  if (!example) throw new Error('no request example');
  return example as Record<string, unknown>;
}

function responseExample(op: Operation, status: string): any {
  const example = op.responses[status]?.content?.['application/json']?.example;
  if (!example) throw new Error(`no example for ${status}`);
  return example;
}

function send(method: string, path: string, body?: unknown, cookie?: string) {
  return app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

beforeEach(resetDb);

describe('OpenAPI document', () => {
  test('every route has a tag, a summary and a description', async () => {
    const doc = await document();
    const missing: string[] = [];
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!op.tags?.length || !op.summary || !op.description) missing.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('the session cookie is declared and every route needs it, except register, login and the health checks', async () => {
    const doc = await document();
    expect(doc.components.securitySchemes['sessionCookie']).toMatchObject({ type: 'apiKey', in: 'cookie', name: 'bookflow_session' });
    expect(doc.security).toEqual([{ sessionCookie: [] }]);

    const open = ['post /api/v1/auth/register', 'post /api/v1/auth/login', 'get /health', 'get /api/v1/health'];
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        const isPublic = open.includes(`${method} ${path}`);
        if (isPublic) expect(op.security).toEqual([]);
        else expect(op.security).toBeUndefined();
      }
    }
  });

  test('every auth route lists the statuses it can answer with', async () => {
    const doc = await document();
    const statuses = (method: string, path: string) => Object.keys(operation(doc, method, path).responses).sort();
    expect(statuses('post', '/api/v1/auth/register')).toEqual(expect.arrayContaining(['201', '409', '422']));
    expect(statuses('post', '/api/v1/auth/login')).toEqual(expect.arrayContaining(['200', '401', '422']));
    expect(statuses('post', '/api/v1/auth/logout')).toEqual(expect.arrayContaining(['204', '401']));
    expect(statuses('get', '/api/v1/auth/me')).toEqual(expect.arrayContaining(['200', '401']));
  });

  test('login documents the cookie it sets and logout documents how it is cleared', async () => {
    const doc = await document();
    const set = operation(doc, 'post', '/api/v1/auth/login').responses['200']?.headers?.['Set-Cookie']?.example ?? '';
    expect(set).toMatch(/^bookflow_session=.+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=1209600$/);
    const cleared = operation(doc, 'post', '/api/v1/auth/logout').responses['204']?.headers?.['Set-Cookie']?.example ?? '';
    expect(cleared).toContain('Max-Age=0');
  });
});

describe('the extra answers of the auth routes', () => {
  test('429 and 403 are documented where they can happen', async () => {
    const doc = await document();
    for (const path of ['/api/v1/auth/register', '/api/v1/auth/login']) {
      expect(operation(doc, 'post', path).responses['429']?.headers?.['Retry-After']).toBeDefined();
    }
    for (const path of ['/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/logout']) {
      expect(operation(doc, 'post', path).responses['403']).toBeDefined();
    }
  });

  test('a request from another website gets the documented 403', async () => {
    const registerOp = operation(await document(), 'post', '/api/v1/auth/register');
    const refused = await app.handle(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://evil.example' },
        body: JSON.stringify(requestExample(registerOp)),
      }),
    );
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual(responseExample(registerOp, '403'));
  });
});

describe('the documented examples are true', () => {
  test('registering and logging in with the documented request examples works, and the answers have the documented shape', async () => {
    const doc = await document();
    const registerOp = operation(doc, 'post', '/api/v1/auth/register');
    const loginOp = operation(doc, 'post', '/api/v1/auth/login');

    const registered = await send('POST', '/auth/register', requestExample(registerOp));
    expect(registered.status).toBe(201);
    const registeredBody = (await registered.json()) as { data: Record<string, unknown> };
    expect(Object.keys(registeredBody.data).sort()).toEqual(Object.keys(responseExample(registerOp, '201').data).sort());
    expect(registeredBody.data['email']).toBe(responseExample(registerOp, '201').data.email);
    expect(registeredBody.data['role']).toBe(responseExample(registerOp, '201').data.role);

    const loggedIn = await send('POST', '/auth/login', requestExample(loginOp));
    expect(loggedIn.status).toBe(200);
    const loginBody = (await loggedIn.json()) as { data: Record<string, unknown> };
    expect(Object.keys(loginBody.data).sort()).toEqual(Object.keys(responseExample(loginOp, '200').data).sort());
    expect(loggedIn.headers.get('set-cookie')).toMatch(/^bookflow_session=[\w-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=1209600$/);
  });

  test('the documented error examples are what the API really answers', async () => {
    const doc = await document();
    const registerOp = operation(doc, 'post', '/api/v1/auth/register');
    const loginOp = operation(doc, 'post', '/api/v1/auth/login');
    await send('POST', '/auth/register', requestExample(registerOp));

    const duplicate = await send('POST', '/auth/register', requestExample(registerOp));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual(responseExample(registerOp, '409'));

    const wrong = await send('POST', '/auth/login', { ...requestExample(loginOp), password: 'not the password' });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual(responseExample(loginOp, '401'));

    const invalid = await send('POST', '/auth/register', { ...requestExample(registerOp), email: 'second@example.com', password: 'short' });
    expect(invalid.status).toBe(422);
    const invalidBody = (await invalid.json()) as { error: { code: string; message: string; details: { on: string; issues: { path: string[] }[] } } };
    const documented = responseExample(registerOp, '422');
    expect(invalidBody.error.code).toBe(documented.error.code);
    expect(invalidBody.error.message).toBe(documented.error.message);
    expect(invalidBody.error.details.on).toBe(documented.error.details.on);
    expect(invalidBody.error.details.issues[0]?.path).toEqual(documented.error.details.issues[0].path);
  });

  test('me and logout behave as documented', async () => {
    const doc = await document();
    const meOp = operation(doc, 'get', '/api/v1/auth/me');
    await send('POST', '/auth/register', requestExample(operation(doc, 'post', '/api/v1/auth/register')));
    const login = await send('POST', '/auth/login', requestExample(operation(doc, 'post', '/api/v1/auth/login')));
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

    const me = await send('GET', '/auth/me', undefined, cookie);
    expect(me.status).toBe(200);
    expect(Object.keys(((await me.json()) as { data: object }).data).sort()).toEqual(Object.keys(responseExample(meOp, '200').data).sort());

    const out = await send('POST', '/auth/logout', undefined, cookie);
    expect(out.status).toBe(204);
    expect(await out.text()).toBe('');
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0');

    const after = await send('GET', '/auth/me', undefined, cookie);
    expect(after.status).toBe(401);
    expect(await after.json()).toEqual(responseExample(meOp, '401'));
  });
});
