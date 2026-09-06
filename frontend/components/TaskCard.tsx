'use client';

import { Draggable } from '@hello-pangea/dnd';
import { useState } from 'react';
import type { Task } from '@/lib/types';

interface Props {
  task: Task;
  index: number;
  canEdit: boolean;
  onSave: (patch: { title?: string; description?: string | null }) => void;
  onDelete: () => void;
}

export function TaskCard({ task, index, canEdit, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');

  function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({ title: trimmed, description: description.trim() || null });
    setEditing(false);
  }

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm ${
            snapshot.isDragging ? 'ring-2 ring-slate-400' : ''
          }`}
        >
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setTitle(task.title);
                    setDescription(task.description ?? '');
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-medium">{task.title}</p>
              {task.description && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                  {task.description}
                </p>
              )}
              {canEdit && (
                <div className="mt-2 flex gap-3 text-xs text-slate-400">
                  <button
                    onClick={() => setEditing(true)}
                    className="hover:text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={onDelete}
                    className="hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Draggable>
  );
}
