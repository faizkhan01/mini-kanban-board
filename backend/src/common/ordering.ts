// Pure ordering helpers, kept side-effect free so the move rules are unit-testable.

// New ordered id list after moving `id` to `toIndex` (works whether or not `ids` contains `id`; index is clamped).
export function applyMove(
  ids: string[],
  id: string,
  toIndex: number,
): string[] {
  const without = ids.filter((x) => x !== id);
  const to = Math.max(0, Math.min(Math.trunc(toIndex), without.length));
  without.splice(to, 0, id);
  return without;
}

// Maps an ordered id list to gap-free { id, position } pairs.
export function toPositions(ids: string[]): { id: string; position: number }[] {
  return ids.map((id, position) => ({ id, position }));
}
