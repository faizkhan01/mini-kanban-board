import type { BoardDetail, Column } from './types';

// Immutably reorder an array element from one index to another.
export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Move a task between columns (or within one) in an immutable board copy.
export function moveTaskInBoard(
  board: BoardDetail,
  taskId: string,
  fromColumnId: string,
  toColumnId: string,
  toIndex: number,
): BoardDetail {
  const columns: Column[] = board.columns.map((c) => ({
    ...c,
    tasks: [...c.tasks],
  }));

  const from = columns.find((c) => c.id === fromColumnId);
  const to = columns.find((c) => c.id === toColumnId);
  if (!from || !to) return board;

  const idx = from.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return board;

  const [task] = from.tasks.splice(idx, 1);
  to.tasks.splice(toIndex, 0, { ...task, columnId: toColumnId });

  from.tasks.forEach((t, i) => (t.position = i));
  to.tasks.forEach((t, i) => (t.position = i));

  return { ...board, columns };
}
