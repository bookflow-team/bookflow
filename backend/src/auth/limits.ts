import { AttemptLimiter, type LimitRule } from './attempt-limiter';

export type AuthLimits = {
  loginPerAccount: LimitRule;
  loginPerAddress: LimitRule;
  registerPerAddress: LimitRule;
  now: () => number;
};

const MINUTE = 60_000;

export const DEFAULT_AUTH_LIMITS: AuthLimits = {
  loginPerAccount: { max: 5, windowMs: 15 * MINUTE },
  loginPerAddress: { max: 30, windowMs: 15 * MINUTE },
  registerPerAddress: { max: 20, windowMs: 60 * MINUTE },
  now: Date.now,
};

export function createAuthLimiters(overrides: Partial<AuthLimits> = {}) {
  const limits = { ...DEFAULT_AUTH_LIMITS, ...overrides };
  return {
    loginPerAccount: new AttemptLimiter(limits.loginPerAccount, limits.now),
    loginPerAddress: new AttemptLimiter(limits.loginPerAddress, limits.now),
    registerPerAddress: new AttemptLimiter(limits.registerPerAddress, limits.now),
  };
}
