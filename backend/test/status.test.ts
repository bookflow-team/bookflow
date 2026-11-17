import { describe, expect, test } from '@jest/globals';
import { effectiveStatus, holdsCapacity, HOUR, pendingExpiry } from '../src/booking/status';

const T0 = new Date('2026-11-16T03:00:00Z');
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR);
const row = (status: 'PENDING' | 'CONFIRMED' | 'CANCELLED', expiresInH: number, endsInH: number) => ({
  status,
  expiresAt: at(expiresInH),
  endAt: at(endsInH),
});

describe('pendingExpiry', () => {
  test('is 24 hours after creation when the appointment is far away', () => {
    expect(pendingExpiry(T0, at(72)).getTime()).toBe(at(24).getTime());
  });

  test('is the appointment start when that comes first', () => {
    expect(pendingExpiry(T0, at(5)).getTime()).toBe(at(5).getTime());
  });
});

describe('effectiveStatus', () => {
  test('a PENDING request past its deadline is EXPIRED', () => {
    expect(effectiveStatus(row('PENDING', 1, 30), at(0))).toBe('PENDING');
    expect(effectiveStatus(row('PENDING', 1, 30), at(1))).toBe('EXPIRED');
    expect(effectiveStatus(row('PENDING', 1, 30), at(2))).toBe('EXPIRED');
  });

  test('a CONFIRMED booking whose appointment is over is COMPLETED', () => {
    expect(effectiveStatus(row('CONFIRMED', 1, 5), at(4))).toBe('CONFIRMED');
    expect(effectiveStatus(row('CONFIRMED', 1, 5), at(5))).toBe('COMPLETED');
  });

  test('terminal stored statuses never change', () => {
    expect(effectiveStatus(row('CANCELLED', -10, -5), at(100))).toBe('CANCELLED');
  });
});

describe('holdsCapacity', () => {
  test('only live PENDING and CONFIRMED bookings hold capacity', () => {
    expect(holdsCapacity(row('PENDING', 1, 30), at(0))).toBe(true);
    expect(holdsCapacity(row('PENDING', 1, 30), at(2))).toBe(false);
    expect(holdsCapacity(row('CONFIRMED', 1, 5), at(2))).toBe(true);
    expect(holdsCapacity(row('CONFIRMED', 1, 5), at(6))).toBe(false);
    expect(holdsCapacity(row('CANCELLED', 1, 5), at(0))).toBe(false);
  });
});
