const HTTP_STATUS = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_ALREADY_EXISTS: 409,
  BUSINESS_NOT_APPROVED: 409,
  BUSINESS_ALREADY_EXISTS: 409,
  SERVICE_UNAVAILABLE: 409,
  INVALID_SLOT: 409,
  CAPACITY_EXCEEDED: 409,
  TOO_MANY_PENDING: 409,
  BOOKING_EXPIRED: 409,
  INVALID_BOOKING_STATUS: 409,
  CANCELLATION_DEADLINE_PASSED: 409,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof HTTP_STATUS;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details: unknown = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = HTTP_STATUS[code];
    this.details = details;
  }
}
