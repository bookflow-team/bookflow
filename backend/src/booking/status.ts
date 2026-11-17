export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export const PENDING_TTL_MS = 24 * HOUR;
export const CUSTOMER_CANCEL_NOTICE_MS = 12 * HOUR;
export const OWNER_CANCEL_NOTICE_MS = 6 * HOUR;
export const MAX_PENDING_PER_CUSTOMER = 3;
export const BOOKING_HORIZON_DAYS = 60;

export function pendingExpiry(createdAt: Date, startAt: Date): Date {
  return new Date(Math.min(createdAt.getTime() + PENDING_TTL_MS, startAt.getTime()));
}

type StatusFields = { status: BookingStatus; expiresAt: Date; endAt: Date };

export function effectiveStatus(b: StatusFields, now: Date): BookingStatus {
  if (b.status === 'PENDING' && b.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  if (b.status === 'CONFIRMED' && b.endAt.getTime() <= now.getTime()) return 'COMPLETED';
  return b.status;
}

export function holdsCapacity(b: StatusFields, now: Date): boolean {
  const s = effectiveStatus(b, now);
  return s === 'PENDING' || s === 'CONFIRMED';
}
