import { z } from 'zod';

export const errorResponse = z
  .object({
    error: z.object({
      code: z.string().meta({ example: 'VALIDATION_ERROR' }),
      message: z.string().meta({ example: 'Invalid request data' }),
      details: z.unknown().meta({ description: 'Extra information, for example the list of invalid fields' }),
    }),
  })
  .meta({ id: 'ErrorResponse', description: 'The single error shape of the whole API' });

export const healthResponse = z
  .object({ data: z.object({ status: z.literal('ok') }) })
  .meta({ id: 'HealthResponse' });

export const documentation = {
  info: {
    title: 'BookFlow API',
    version: '1.0.0',
    description: [
      'Booking platform for local businesses. Every route lives under `/api/v1`.',
      '',
      '**Successful responses** wrap the payload: `{ "data": ... }`.',
      '**Failed responses** always look like `{ "error": { "code", "message", "details" } }`.',
      '',
      '**Authentication** uses an HTTP-only session cookie called `bookflow_session`. Register with `POST /auth/register`, then call `POST /auth/login`: the answer sets the cookie and the browser sends it back by itself on every later request. JavaScript cannot read it. When the page is served from another origin than the API, send requests with `credentials: "include"`; behind the Vite dev proxy (`/api/v1`) a normal `fetch` is enough. `GET /auth/me` tells who is logged in and `POST /auth/logout` ends the session.',
      '',
      'Every route needs the cookie unless its description says it is public (register, login and the health checks). Requests that change data (POST, PATCH, DELETE) are refused with 403 when their Origin header is not the address of the frontend.',
    ].join('\n'),
  },
  tags: [
    { name: 'System', description: 'Health and diagnostics' },
    { name: 'Auth', description: 'Registration, login and the current session' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey' as const,
        in: 'cookie' as const,
        name: 'bookflow_session',
        description:
          'Random session token set by `POST /auth/login` (HttpOnly, SameSite=Lax, valid for 14 days). The browser sends it automatically; there is nothing to copy by hand.',
      },
    },
  },
  security: [{ sessionCookie: [] as string[] }],
};

type ResponseHeader = { description: string; schema: { type: 'string' }; example?: string };

function plainSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: 'output' }) as Record<string, unknown>;
  delete json['$schema'];
  delete json['id'];
  return json;
}

export function jsonResponse(options: {
  description: string;
  schema: z.ZodType;
  example: unknown;
  headers?: Record<string, ResponseHeader>;
}) {
  return {
    description: options.description,
    ...(options.headers ? { headers: options.headers } : {}),
    content: { 'application/json': { schema: plainSchema(options.schema), example: options.example } },
  };
}

export function errorDoc(
  description: string,
  code: string,
  message: string,
  extra: { details?: unknown; headers?: Record<string, ResponseHeader> } = {},
) {
  return jsonResponse({
    description,
    schema: errorResponse,
    example: { error: { code, message, details: extra.details ?? {} } },
    headers: extra.headers,
  });
}

export function noContentDoc(description: string, headers?: Record<string, ResponseHeader>) {
  return { description, ...(headers ? { headers } : {}) };
}
