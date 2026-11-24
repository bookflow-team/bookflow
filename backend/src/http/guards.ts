import { Elysia } from 'elysia';
import type { SessionUser } from '../auth/session';
import { AppError } from '../errors';

type Role = SessionUser['role'];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw new AppError('UNAUTHENTICATED', 'You are not logged in');
  return user;
}

export function requireRole(user: SessionUser | null, ...roles: Role[]): SessionUser {
  const current = requireUser(user);
  if (!roles.includes(current.role)) throw new AppError('FORBIDDEN', 'You do not have access to this');
  return current;
}

export function assertOwner(ownerId: string, user: SessionUser): void {
  if (ownerId !== user.id) throw new AppError('FORBIDDEN', 'This belongs to another account');
}

export function originGuard(allowedOrigin: string) {
  return new Elysia().onBeforeHandle({ as: 'global' }, ({ request }) => {
    if (SAFE_METHODS.has(request.method)) return;
    const origin = request.headers.get('origin');
    if (origin && origin !== allowedOrigin) throw new AppError('FORBIDDEN', 'Request from an unexpected origin');
  });
}
