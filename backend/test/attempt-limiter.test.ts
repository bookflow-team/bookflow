import { describe, expect, test } from '@jest/globals';
import { AttemptLimiter, takeFromAll } from '../src/auth/attempt-limiter';

function clock(start = 1_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

const MINUTE = 60_000;

describe('attempt limiter', () => {
  test('lets max attempts through and refuses the next one with the seconds left', () => {
    const time = clock();
    const limiter = new AttemptLimiter({ max: 3, windowMs: 15 * MINUTE }, time.now);
    expect([limiter.take('a'), limiter.take('a'), limiter.take('a')]).toEqual([0, 0, 0]);
    expect(limiter.take('a')).toBe(15 * 60);
    time.advance(5 * MINUTE);
    expect(limiter.take('a')).toBe(10 * 60);
  });

  test('a refused attempt is not counted, so waiting out the window is enough', () => {
    const time = clock();
    const limiter = new AttemptLimiter({ max: 2, windowMs: MINUTE }, time.now);
    limiter.take('a');
    limiter.take('a');
    for (let i = 0; i < 50; i += 1) expect(limiter.take('a')).toBeGreaterThan(0);
    time.advance(MINUTE);
    expect(limiter.take('a')).toBe(0);
  });

  test('keys are counted separately', () => {
    const limiter = new AttemptLimiter({ max: 1, windowMs: MINUTE });
    expect(limiter.take('one')).toBe(0);
    expect(limiter.take('one')).toBeGreaterThan(0);
    expect(limiter.take('two')).toBe(0);
  });

  test('the window starts at the first attempt and does not slide', () => {
    const time = clock();
    const limiter = new AttemptLimiter({ max: 2, windowMs: 10 * MINUTE }, time.now);
    limiter.take('a');
    time.advance(9 * MINUTE);
    limiter.take('a');
    expect(limiter.take('a')).toBe(60);
    time.advance(MINUTE);
    expect(limiter.take('a')).toBe(0);
  });

  test('refund gives one attempt back and clear forgets the key', () => {
    const limiter = new AttemptLimiter({ max: 2, windowMs: MINUTE });
    limiter.take('a');
    limiter.take('a');
    limiter.refund('a');
    expect(limiter.take('a')).toBe(0);
    expect(limiter.take('a')).toBeGreaterThan(0);
    limiter.clear('a');
    expect(limiter.take('a')).toBe(0);
    limiter.refund('never-seen');
    expect(limiter.size).toBe(1);
  });

  test('when one of several limits refuses, the attempts already counted on the others are given back', () => {
    const wide = new AttemptLimiter({ max: 5, windowMs: MINUTE });
    const narrow = new AttemptLimiter({ max: 1, windowMs: MINUTE });
    expect(takeFromAll([[wide, 'x'], [narrow, 'y']])).toBe(0);
    for (let i = 0; i < 20; i += 1) expect(takeFromAll([[wide, 'x'], [narrow, 'y']])).toBeGreaterThan(0);
    for (let i = 0; i < 4; i += 1) expect(wide.take('x')).toBe(0);
    expect(wide.take('x')).toBeGreaterThan(0);
  });

  test('old entries are swept so the table cannot grow for ever', () => {
    const time = clock();
    const limiter = new AttemptLimiter({ max: 1, windowMs: MINUTE }, time.now);
    for (let i = 0; i < 5000; i += 1) limiter.take(`old-${i}`);
    expect(limiter.size).toBe(5000);
    time.advance(MINUTE);
    limiter.take('fresh');
    expect(limiter.size).toBe(1);
  });
});
