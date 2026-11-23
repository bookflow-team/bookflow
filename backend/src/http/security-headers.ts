import { Elysia } from 'elysia';

export const DOCS_PATH = '/api/v1/openapi';

const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-site',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none',
} as const;

const API_CSP = "default-src 'none'; frame-ancestors 'none'";
const HSTS = 'max-age=31536000; includeSubDomains';

function isDocs(path: string): boolean {
  return path === DOCS_PATH || path.startsWith(`${DOCS_PATH}/`);
}

export function securityHeaders(options: { hsts?: boolean } = {}) {
  return new Elysia({ name: 'security-headers' }).onRequest(({ request, set }) => {
    const path = new URL(request.url).pathname;
    Object.assign(set.headers, BASE_HEADERS);
    if (options.hsts) set.headers['strict-transport-security'] = HSTS;
    if (!isDocs(path)) set.headers['content-security-policy'] = API_CSP;
  });
}
