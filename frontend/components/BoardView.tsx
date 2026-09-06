'use client';

import {
  DragDropContext,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { moveTaskInBoard, reorder } from '@/lib/board-utils';
import type { BoardDetail } from '@/lib/types';
import { ColumnView } from './ColumnView';

interface Props {
  board: BoardDetail;
  setBoard: (b: BoardDetail) => void;
  reload: () => void;
}

export function BoardView({ board, setBoard, reload }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState('');
  const canEdit = board.myRole === 'OWNER' || board.myRole === 'EDITOR';

  function fail(err: unknown) {
    setError((err as ApiError).message ?? 'Something went wrong');
    reload();
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    setError(null);

    if (type === 'COLUMN') {
      const previous = board;
      const columns = reorder(board.columns, source.index, destination.index).map(
        (c, i) => ({ ...c, position: i }),
      );
      setBoard({ ...board, columns });
      try {
        await api.reorderColumn(draggableId, destination.index);
      } catch (err) {
        setBoard(previous);
        fail(err);
      }
      return;
    }

    // type === 'TASK'
    const previous = board;
    const optimistic = moveTaskInBoard(
      board,
      draggableId,
      source.droppableId,
      destination.droppableId,
      destination.index,
    );
    setBoard(optimistic);
    try {
      await api.moveTask(draggableId, destination.droppableId, destination.index);
    } catch (err) {
      setBoard(previous);
      fail(err);
    }
  }

  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColumn.trim()) return;
    try {
      await api.createColumn(board.id, newColumn.trim());
      setNewColumn('');
      reload();
    } catch (err) {
      fail(err);
    }
  }

  const mutate = (fn: () => Promise<unknown>) =>
    fn().then(reload).catch(fail);

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-1 items-start gap-3 overflow-x-auto p-4"
            >
              {board.columns.map((column, index) => (
                <ColumnView
                  key={column.id}
                  column={column}
                  index={index}
                  canEdit={canEdit}
                  onAddTask={(title) =>
                    mutate(() => api.createTask(column.id, { title }))
                  }
                  onRenameColumn={(name) =>
                    mutate(() => api.renameColumn(column.id, name))
                  }
                  onDeleteColumn={() => {
                    if (confirm(`Delete column “${column.name}” and its tasks?`))
                      mutate(() => api.deleteColumn(column.id));
                  }}
                  onSaveTask={(taskId, patch) =>
                    mutate(() => api.updateTask(taskId, patch))
                  }
                  onDeleteTask={(taskId) =>
                    mutate(() => api.deleteTask(taskId))
                  }
                />
              ))}
              {provided.placeholder}

              {canEdit && (
                <form
                  onSubmit={addColumn}
                  className="w-72 shrink-0 rounded-xl bg-slate-200/60 p-3"
                >
                  <input
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value)}
                    placeholder="+ Add column"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </form>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
