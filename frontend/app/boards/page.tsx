'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RequireAuth } from '@/components/RequireAuth';
import { api, ApiError } from '@/lib/api';
import type { BoardSummary } from '@/lib/types';

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: 'bg-emerald-100 text-emerald-700',
    EDITOR: 'bg-blue-100 text-blue-700',
    VIEWER: 'bg-slate-200 text-slate-600',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[role] ?? ''}`}
    >
      {role.toLowerCase()}
    </span>
  );
}

function BoardsInner() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      setBoards(await api.listBoards());
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.createBoard(name.trim());
      setName('');
      await refresh();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Your boards</h1>

      <form onSubmit={onCreate} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New board name"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : boards.length === 0 ? (
        <p className="mt-8 text-slate-500">
          No boards yet. Create your first one above.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/boards/${b.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{b.name}</h2>
                  <RoleBadge role={b.myRole} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Owner: {b.owner.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {b._count.columns} columns · {b._count.tasks} tasks
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BoardsPage() {
  return (
    <RequireAuth>
      <Navbar />
      <BoardsInner />
    </RequireAuth>
  );
}
