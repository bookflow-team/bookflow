export type Occupant = { start: number; end: number; units: number };

export function maxOccupancy(start: number, end: number, occupants: readonly Occupant[]): number {
  const inWindow = occupants.filter((o) => o.start < end && o.end > start);
  if (inWindow.length === 0) return 0;

  const checkpoints = new Set<number>([start]);
  for (const o of inWindow) if (o.start > start) checkpoints.add(o.start);

  let max = 0;
  for (const point of checkpoints) {
    let used = 0;
    for (const o of inWindow) if (o.start <= point && point < o.end) used += o.units;
    if (used > max) max = used;
  }
  return max;
}

export function remainingCapacity(
  capacity: number,
  start: number,
  end: number,
  occupants: readonly Occupant[],
): number {
  return capacity - maxOccupancy(start, end, occupants);
}
