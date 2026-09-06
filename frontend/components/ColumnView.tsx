'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useState } from 'react';
import type { Column } from '@/lib/types';
import { TaskCard } from './TaskCard';

interface Props {
  column: Column;
  index: number;
  canEdit: boolean;
  onAddTask: (title: string) => void;
  onRenameColumn: (name: string) => void;
  onDeleteColumn: () => void;
  onSaveTask: (
    taskId: string,
    patch: { title?: string; description?: string | null },
  ) => void;
  onDeleteTask: (taskId: string) => void;
}

export function ColumnView({
  column,
  index,
  canEdit,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onSaveTask,
  onDeleteTask,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim());
    setTitle('');
    setAdding(false);
  }

  return (
    <Draggable draggableId={column.id} index={index} isDragDisabled={!canEdit}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-200/60"
        >
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            {renaming ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim() && name !== column.name)
                    onRenameColumn(name.trim());
                  setRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            ) : (
              <h3
                className="text-sm font-semibold text-slate-700"
                onDoubleClick={() => canEdit && setRenaming(true)}
              >
                {column.name}{' '}
                <span className="font-normal text-slate-400">
                  {column.tasks.length}
                </span>
              </h3>
            )}
            {canEdit && !renaming && (
              <button
                onClick={onDeleteColumn}
                title="Delete column"
                className="text-xs text-slate-400 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>

          <Droppable droppableId={column.id} type="TASK">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`flex min-h-[8px] flex-1 flex-col gap-2 px-3 pb-2 ${
                  dropSnapshot.isDraggingOver ? 'bg-slate-300/40' : ''
                }`}
              >
                {column.tasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={i}
                    canEdit={canEdit}
                    onSave={(patch) => onSaveTask(task.id, patch)}
                    onDelete={() => onDeleteTask(task.id)}
                  />
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          {canEdit && (
            <div className="px-3 pb-3 pt-1">
              {adding ? (
                <form onSubmit={submitTask} className="space-y-2">
                  <textarea
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    rows={2}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="w-full rounded-md py-1 text-left text-sm text-slate-500 hover:bg-slate-300/50"
                >
                  + Add task
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
