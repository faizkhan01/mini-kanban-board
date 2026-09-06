'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BoardView } from '@/components/BoardView';
import { Navbar } from '@/components/Navbar';
import { RequireAuth } from '@/components/RequireAuth';
import { ShareDialog } from '@/components/ShareDialog';
import { api, ApiError } from '@/lib/api';
import type { BoardDetail } from '@/lib/types';

function BoardInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.getBoard(id);
      setBoard(data);
      setName(data.name);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="p-8 text-slate-500">Loading…</p>;
  }
  if (error || !board) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error ?? 'Board not found'}</p>
        <Link href="/boards" className="mt-2 inline-block text-sm underline">
          Back to boards
        </Link>
      </div>
    );
  }

  const isOwner = board.myRole === 'OWNER';
  const canEdit = isOwner || board.myRole === 'EDITOR';

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/boards" className="text-sm text-slate-400 hover:text-slate-700">
            ← Boards
          </Link>
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={async () => {
                setRenaming(false);
                if (name.trim() && name !== board.name) {
                  try {
                    await api.renameBoard(board.id, name.trim());
                    load();
                  } catch (err) {
                    setError((err as ApiError).message);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="rounded border border-slate-300 px-2 py-1 text-lg font-semibold"
            />
          ) : (
            <h1
              className="text-lg font-semibold"
              onDoubleClick={() => canEdit && setRenaming(true)}
            >
              {board.name}
            </h1>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {board.myRole.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={() => setSharing(true)}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Share ({board.members.length})
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete board “${board.name}”? This cannot be undone.`))
                    return;
                  try {
                    await api.deleteBoard(board.id);
                    router.push('/boards');
                  } catch (err) {
                    setError((err as ApiError).message);
                  }
                }}
                className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <BoardView board={board} setBoard={setBoard} reload={load} />
      </div>

      {sharing && (
        <ShareDialog
          board={board}
          onClose={() => setSharing(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

export default function BoardPage() {
  return (
    <RequireAuth>
      <Navbar />
      <BoardInner />
    </RequireAuth>
  );
}
