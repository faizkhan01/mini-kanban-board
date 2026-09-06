'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { BoardDetail } from '@/lib/types';

interface Props {
  board: BoardDetail;
  onClose: () => void;
  onChanged: () => void;
}

export function ShareDialog({ board, onClose, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share “{board.name}”</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api.shareBoard(board.id, email.trim(), role);
              setEmail('');
            });
          }}
          className="mt-4 flex gap-2"
        >
          <input
            type="email"
            required
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            Add
          </button>
        </form>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span>
              {board.owner.name}{' '}
              <span className="text-slate-400">({board.owner.email})</span>
            </span>
            <span className="text-xs font-medium text-emerald-700">owner</span>
          </li>
          {board.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
            >
              <span>
                {m.user.name}{' '}
                <span className="text-slate-400">({m.user.email})</span>
              </span>
              <span className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={(e) =>
                    run(() =>
                      api.updateMember(
                        board.id,
                        m.userId,
                        e.target.value as 'EDITOR' | 'VIEWER',
                      ),
                    )
                  }
                  className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                >
                  <option value="EDITOR">editor</option>
                  <option value="VIEWER">viewer</option>
                </select>
                <button
                  onClick={() =>
                    run(() => api.removeMember(board.id, m.userId))
                  }
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
