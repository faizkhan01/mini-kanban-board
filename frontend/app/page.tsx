'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/boards' : '/login');
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-slate-500">
      Loading…
    </main>
  );
}
