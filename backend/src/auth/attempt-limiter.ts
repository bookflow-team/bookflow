export type LimitRule = { max: number; windowMs: number };

type Entry = { count: number; resetAt: number };

const PRUNE_ABOVE = 5000;

export class AttemptLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly rule: LimitRule,
    private readonly now: () => number = Date.now,
  ) {}

  take(key: string): number {
    const now = this.now();
    this.prune(now);
    const entry = this.live(key, now);
    if (!entry) {
      this.entries.set(key, { count: 1, resetAt: now + this.rule.windowMs });
      return 0;
    }
    if (entry.count >= this.rule.max) return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    entry.count += 1;
    return 0;
  }

  refund(key: string): void {
    const entry = this.live(key, this.now());
    if (!entry) return;
    entry.count -= 1;
    if (entry.count <= 0) this.entries.delete(key);
  }

  clear(key: string): void {
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }

  private live(key: string, now: number): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.resetAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private prune(now: number): void {
    if (this.entries.size < PRUNE_ABOVE) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}

export function takeFromAll(limits: readonly (readonly [AttemptLimiter, string])[]): number {
  const taken: (readonly [AttemptLimiter, string])[] = [];
  for (const limit of limits) {
    const wait = limit[0].take(limit[1]);
    if (wait > 0) {
      for (const [limiter, key] of taken) limiter.refund(key);
      return wait;
    }
    taken.push(limit);
  }
  return 0;
}
