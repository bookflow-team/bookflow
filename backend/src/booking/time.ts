import { DateTime } from 'luxon';
import { AppError } from '../errors';

export type ScheduleRow = { weekday: number; startTime: string; endTime: string };
export type ExceptionRow = { startAt: Date; endAt: Date; type: 'CLOSED' | 'OPEN' };
export type Slot = { startAt: Date; endAt: Date };
type Range = { start: number; end: number };

export function isValidTimeZone(zone: string): boolean {
  return DateTime.now().setZone(zone).isValid;
}

export function dayWindow(date: string, zone: string): { start: Date; end: Date } {
  const day = parseDay(date, zone);
  return { start: day.toJSDate(), end: day.plus({ days: 1 }).startOf('day').toJSDate() };
}

export function localDateOf(instant: Date, zone: string): string {
  const iso = DateTime.fromJSDate(instant, { zone }).toISODate();
  if (!iso) throw new AppError('VALIDATION_ERROR', 'Invalid time zone');
  return iso;
}

function parseDay(date: string, zone: string): DateTime {
  const day = DateTime.fromISO(date, { zone });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid) {
    throw new AppError('VALIDATION_ERROR', 'Invalid date, expected YYYY-MM-DD');
  }
  return day.startOf('day');
}

function wallTime(day: DateTime, time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  if (h >= 24) return day.plus({ days: 1 }).startOf('day').toMillis();
  return day.set({ hour: h, minute: m, second: 0, millisecond: 0 }).toMillis();
}

function mergeOverlapping(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}

export function slotsForDate(opts: {
  date: string;
  zone: string;
  durationMinutes: number;
  schedules: readonly ScheduleRow[];
  exceptions: readonly ExceptionRow[];
}): Slot[] {
  const day = parseDay(opts.date, opts.zone);
  const dayStart = day.toMillis();
  const dayEnd = day.plus({ days: 1 }).startOf('day').toMillis();
  const step = opts.durationMinutes * 60_000;

  const windows: Range[] = [];
  for (const s of opts.schedules) {
    if (s.weekday !== day.weekday) continue;
    const start = wallTime(day, s.startTime);
    const end = wallTime(day, s.endTime);
    if (end > start) windows.push({ start, end });
  }
  for (const e of opts.exceptions) {
    if (e.type !== 'OPEN') continue;
    const start = Math.max(e.startAt.getTime(), dayStart);
    const end = Math.min(e.endAt.getTime(), dayEnd);
    if (end > start) windows.push({ start, end });
  }

  const closed = opts.exceptions
    .filter((e) => e.type === 'CLOSED')
    .map((e) => ({ start: e.startAt.getTime(), end: e.endAt.getTime() }));

  const slots: Slot[] = [];
  for (const w of mergeOverlapping(windows)) {
    for (let t = w.start; t + step <= w.end; t += step) {
      if (closed.some((c) => c.start < t + step && c.end > t)) continue;
      slots.push({ startAt: new Date(t), endAt: new Date(t + step) });
    }
  }
  return slots;
}

export function findSlot(slots: readonly Slot[], startAt: Date): Slot | undefined {
  return slots.find((s) => s.startAt.getTime() === startAt.getTime());
}
