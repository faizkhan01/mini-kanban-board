'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/boards" className="font-semibold">
          Mini Kanban
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user && (
            <>
              <span className="text-slate-500">{user.name}</span>
              <button
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
