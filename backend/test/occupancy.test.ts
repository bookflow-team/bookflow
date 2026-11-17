import { describe, expect, test } from '@jest/globals';
import { maxOccupancy, remainingCapacity } from '../src/booking/occupancy';

const H = 3_600_000;
const iv = (from: number, to: number, units = 1) => ({ start: from * H, end: to * H, units });

describe('maxOccupancy', () => {
  test('is 0 when nothing is around', () => {
    expect(maxOccupancy(10 * H, 11 * H, [])).toBe(0);
  });

  test('intervals that only touch the window do not count (half-open)', () => {
    expect(maxOccupancy(10 * H, 11 * H, [iv(9, 10), iv(11, 12)])).toBe(0);
  });

  test('identical overlapping intervals add up', () => {
    expect(maxOccupancy(10 * H, 11 * H, [iv(10, 11), iv(10, 11)])).toBe(2);
  });

  test('an interval that starts inside the window counts, even though the window start is free', () => {
    expect(maxOccupancy(10 * H, 12 * H, [iv(11, 13)])).toBe(1);
  });

  test('back-to-back intervals inside one window never stack', () => {
    expect(maxOccupancy(10 * H, 12 * H, [iv(10, 11), iv(11, 12)])).toBe(1);
  });

  test('finds a peak in the middle of the window', () => {
    expect(maxOccupancy(10 * H, 13 * H, [iv(11, 12), iv(11, 13), iv(12, 13)])).toBe(2);
  });

  test('blocks count by their units', () => {
    expect(maxOccupancy(10 * H, 11 * H, [iv(10, 11), iv(10, 11, 2)])).toBe(3);
  });
});

describe('remainingCapacity', () => {
  test('capacity minus the peak occupancy', () => {
    expect(remainingCapacity(3, 10 * H, 11 * H, [iv(10, 11), iv(10, 11)])).toBe(1);
    expect(remainingCapacity(3, 10 * H, 11 * H, [iv(10, 11, 3)])).toBe(0);
  });
});
