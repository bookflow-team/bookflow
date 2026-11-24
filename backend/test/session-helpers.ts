import { createSession, type SessionUser } from '../src/auth/session';
import { db, H, makeUser } from './helpers';

export async function loginAs(role: SessionUser['role']) {
  const user = await makeUser(role);
  const token = await createSession(db, user.id, 24 * H);
  return { user, cookie: `bookflow_session=${token}` };
}

type Handler = { handle(request: Request): Response | Promise<Response> };

export function client(app: Handler) {
  return (method: string, path: string, options: { cookie?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
    app.handle(
      new Request(`http://localhost/api/v1${path}`, {
        method,
        headers: {
          ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(options.cookie ? { cookie: options.cookie } : {}),
          ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      }),
    );
}

export type ApiBody = { data?: Record<string, unknown> & { id?: string }; error?: { code: string } };

export const bodyOf = async (res: Response) => (await res.json()) as ApiBody;
