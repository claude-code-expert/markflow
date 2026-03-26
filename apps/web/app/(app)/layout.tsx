'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth-store';
import { Sidebar } from '../../components/sidebar';
import { AppHeader } from '../../components/app-header';
import { useSidebarStore } from '../../stores/sidebar-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const isSidebarOpen = useSidebarStore((s) => s.isSidebarOpen);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: isSidebarOpen ? 'var(--sidebar-w) 1fr' : '0 1fr',
        gridTemplateRows: 'var(--header-h) 1fr',
        background: 'var(--bg)',
        transition: 'grid-template-columns 0.2s ease',
      }}
    >
      <AppHeader />
      <Sidebar />
      <main className="overflow-y-auto" style={{ background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  );
}
