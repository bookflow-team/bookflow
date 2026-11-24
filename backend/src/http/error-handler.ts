import { Elysia } from 'elysia';
import { AppError } from '../errors';

const failure = (code: string, message: string, details: unknown = {}) => ({
  error: { code, message, details },
});

function validationDetails(error: unknown): unknown {
  try {
    const parsed = JSON.parse((error as Error).message) as {
      on?: string;
      errors?: { path?: unknown; message?: string }[];
    };
    return {
      on: parsed.on,
      issues: (parsed.errors ?? []).map((e) => ({ path: e.path, message: e.message })),
    };
  } catch {
    return {};
  }
}

export const errorHandler = new Elysia({ name: 'error-handler' }).onError({ as: 'global' }, ({ code, error, set }) => {
  if (error instanceof AppError) {
    set.status = error.status;
    const wait = (error.details as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds;
    if (error.code === 'TOO_MANY_ATTEMPTS' && typeof wait === 'number') set.headers['retry-after'] = String(wait);
    return failure(error.code, error.message, error.details);
  }
  switch (code) {
    case 'VALIDATION':
      set.status = 422;
      return failure('VALIDATION_ERROR', 'Invalid request data', validationDetails(error));
    case 'PARSE':
      set.status = 400;
      return failure('VALIDATION_ERROR', 'Malformed request body');
    case 'NOT_FOUND':
      set.status = 404;
      return failure('NOT_FOUND', 'Route not found');
    default:
      console.error(error);
      set.status = 500;
      return failure('INTERNAL_ERROR', 'Unexpected server error');
  }
});
