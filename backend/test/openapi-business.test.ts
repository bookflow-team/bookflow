import { beforeEach, describe, expect, test } from '@jest/globals';
import { createApp } from '../src/app';
import { db, resetDb } from './helpers';
import { client, bodyOf, loginAs } from './session-helpers';

type Doc = { paths: Record<string, Record<string, { requestBody?: { content: { 'application/json': { schema: { $defs?: Record<string, { example?: unknown }> } } } }; responses: Record<string, { content?: { 'application/json': { schema?: { $defs?: Record<string, { example?: any }> } } } }> }>> };

const app = createApp({ db, corsOrigin: 'http://localhost:5173' });
const call = client(app);

async function document(): Promise<Doc> {
  return (await (await app.handle(new Request('http://localhost/api/v1/openapi/json'))).json()) as Doc;
}

beforeEach(resetDb);

describe('business routes in OpenAPI', () => {
  test('the documented request example registers a business, and the answer has the documented shape', async () => {
    const doc = await document();
    const op = doc.paths['/api/v1/owner/business/']?.['post'];
    const request = Object.values(op?.requestBody?.content['application/json'].schema.$defs ?? {})[0]?.example as Record<string, unknown>;
    const documented = Object.values(op?.responses['201']?.content?.['application/json'].schema?.$defs ?? {})[0]?.example;
    expect(request).toBeDefined();
    expect(documented).toBeDefined();

    const owner = await loginAs('BUSINESS_OWNER');
    const res = await call('POST', '/owner/business', { cookie: owner.cookie, body: request });
    expect(res.status).toBe(201);
    const body = await bodyOf(res);
    expect(Object.keys(body.data ?? {}).sort()).toEqual(Object.keys(documented.data).sort());
    expect(body.data).toMatchObject({ name: request['name'], timezone: request['timezone'], approvalStatus: 'PENDING' });
  });

  test('the documented update example is accepted', async () => {
    const doc = await document();
    const op = doc.paths['/api/v1/owner/business/']?.['patch'];
    const update = Object.values(op?.requestBody?.content['application/json'].schema.$defs ?? {})[0]?.example;
    const create = Object.values(doc.paths['/api/v1/owner/business/']?.['post']?.requestBody?.content['application/json'].schema.$defs ?? {})[0]?.example;
    expect(update).toBeDefined();

    const owner = await loginAs('BUSINESS_OWNER');
    expect((await call('POST', '/owner/business', { cookie: owner.cookie, body: create })).status).toBe(201);
    const res = await call('PATCH', '/owner/business', { cookie: owner.cookie, body: update });
    expect(res.status).toBe(200);
  });
});
