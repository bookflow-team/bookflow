import { describe, expect, test } from '@jest/globals';
import { dayWindow, localDateOf, slotsForDate, type ExceptionRow } from '../src/booking/time';
import { AppError } from '../src/errors';

const ZONE = 'Asia/Krasnoyarsk';
const everyDay = (startTime: string, endTime: string) =>
  [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startTime, endTime }));
const starts = (slots: { startAt: Date }[]) => slots.map((s) => s.startAt.toISOString());
const range = (from: string, to: string, type: ExceptionRow['type']): ExceptionRow => ({
  startAt: new Date(from),
  endAt: new Date(to),
  type,
});

const base = { date: '2026-11-19', zone: ZONE, durationMinutes: 60, schedules: everyDay('09:00', '13:00'), exceptions: [] };

describe('slotsForDate', () => {
  test('back-to-back slots from the window start', () => {
    expect(starts(slotsForDate(base))).toEqual([
      '2026-11-19T02:00:00.000Z',
      '2026-11-19T03:00:00.000Z',
      '2026-11-19T04:00:00.000Z',
      '2026-11-19T05:00:00.000Z',
    ]);
  });

  test('a slot must fit completely inside the window', () => {
    const slots = slotsForDate({ ...base, schedules: everyDay('09:00', '12:30') });
    expect(slots).toHaveLength(3);
  });

  test('the step is the service duration, not a fixed hour', () => {
    const slots = slotsForDate({ ...base, durationMinutes: 45, schedules: everyDay('09:00', '11:00') });
    expect(starts(slots)).toEqual(['2026-11-19T02:00:00.000Z', '2026-11-19T02:45:00.000Z']);
  });

  test('only schedule rows of that weekday are used (ISO: Monday = 1)', () => {
    const mondayOnly = [{ weekday: 1, startTime: '09:00:00', endTime: '13:00:00' }];
    expect(slotsForDate({ ...base, schedules: mondayOnly })).toHaveLength(0);
    expect(slotsForDate({ ...base, date: '2026-11-16', schedules: mondayOnly })).toHaveLength(4);
  });

  test('several intervals in one day (lunch break in the schedule)', () => {
    const split = [
      { weekday: 4, startTime: '09:00', endTime: '11:00' },
      { weekday: 4, startTime: '12:00', endTime: '14:00' },
    ];
    expect(slotsForDate({ ...base, schedules: split })).toHaveLength(4);
  });

  test('CLOSED drops every slot it touches and does not shift the others', () => {
    const slots = slotsForDate({ ...base, exceptions: [range('2026-11-19T03:30:00Z', '2026-11-19T04:10:00Z', 'CLOSED')] });
    expect(starts(slots)).toEqual(['2026-11-19T02:00:00.000Z', '2026-11-19T05:00:00.000Z']);
  });

  test('OPEN adds an exceptional opening on a day without a schedule', () => {
    const slots = slotsForDate({
      ...base,
      schedules: [],
      exceptions: [range('2026-11-19T02:00:00Z', '2026-11-19T04:00:00Z', 'OPEN')],
    });
    expect(slots).toHaveLength(2);
  });

  test('OPEN overlapping the schedule is merged, so slots never overlap each other', () => {
    const slots = slotsForDate({ ...base, exceptions: [range('2026-11-19T05:00:00Z', '2026-11-19T08:00:00Z', 'OPEN')] });
    expect(slots).toHaveLength(6);
  });

  test('CLOSED beats OPEN', () => {
    const slots = slotsForDate({
      ...base,
      schedules: [],
      exceptions: [
        range('2026-11-19T02:00:00Z', '2026-11-19T04:00:00Z', 'OPEN'),
        range('2026-11-19T02:00:00Z', '2026-11-19T04:00:00Z', 'CLOSED'),
      ],
    });
    expect(slots).toHaveLength(0);
  });

  test('an OPEN exception that crosses midnight is clipped to the day', () => {
    const open = range('2026-11-19T15:00:00Z', '2026-11-19T19:00:00Z', 'OPEN');
    const thursday = slotsForDate({ ...base, schedules: [], exceptions: [open] });
    const friday = slotsForDate({ ...base, date: '2026-11-20', schedules: [], exceptions: [open] });
    expect(thursday).toHaveLength(2);
    expect(friday).toHaveLength(2);
  });

  test("'24:00' is accepted as the end of the day", () => {
    const slots = slotsForDate({ ...base, schedules: everyDay('22:00', '24:00:00') });
    expect(slots).toHaveLength(2);
  });

  test('wall-clock times survive a daylight-saving change (Europe/Berlin, 2026-10-25)', () => {
    const nineToTen = everyDay('09:00', '10:00');
    const saturday = slotsForDate({ ...base, zone: 'Europe/Berlin', date: '2026-10-24', schedules: nineToTen });
    const sunday = slotsForDate({ ...base, zone: 'Europe/Berlin', date: '2026-10-25', schedules: nineToTen });
    expect(starts(saturday)).toEqual(['2026-10-24T07:00:00.000Z']);
    expect(starts(sunday)).toEqual(['2026-10-25T08:00:00.000Z']);
  });

  test('an invalid date is a validation error', () => {
    for (const date of ['2026-13-45', 'tomorrow', '2026-1-1']) {
      try {
        slotsForDate({ ...base, date });
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('VALIDATION_ERROR');
      }
    }
  });
});

describe('time zone helpers', () => {
  test('localDateOf uses the business time zone, not UTC', () => {
    expect(localDateOf(new Date('2026-11-19T20:00:00Z'), ZONE)).toBe('2026-11-20');
    expect(localDateOf(new Date('2026-11-19T20:00:00Z'), 'UTC')).toBe('2026-11-19');
  });

  test('dayWindow spans exactly one local day', () => {
    const { start, end } = dayWindow('2026-11-19', ZONE);
    expect(start.toISOString()).toBe('2026-11-18T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-19T17:00:00.000Z');
  });
});
