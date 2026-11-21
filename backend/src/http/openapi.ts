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
      'Authentication uses an HTTP-only session cookie (added together with the auth routes).',
    ].join('\n'),
  },
  tags: [
    { name: 'System', description: 'Health and diagnostics' },
    { name: 'Auth', description: 'Registration, login and the current session' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey' as const, in: 'cookie' as const, name: 'bookflow_session', description: 'Set by POST /auth/login' },
    },
  },
};
