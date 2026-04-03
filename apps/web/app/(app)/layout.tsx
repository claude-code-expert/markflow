'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Sidebar } from '../../components/sidebar';
import { AppHeader } from '../../components/app-header';
import { SearchModal } from '../../components/search-modal';
import { useSidebarStore } from '../../stores/sidebar-store';
import { apiFetch } from '../../lib/api';
import { useToastStore } from '../../stores/toast-store';
import type { DocumentResponse } from '../../lib/types';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const isSidebarOpen = useSidebarStore((s) => s.isSidebarOpen);
  const { currentWorkspace } = useWorkspaceStore();
  const addToast = useToastStore((s) => s.addToast);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
  }, []);

  const handleNewDoc = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const { document } = await apiFetch<DocumentResponse>(
        `/workspaces/${currentWorkspace.id}/documents`,
        { method: 'POST', body: { title: '제목 없음' } },
      );
      router.push(`/${currentWorkspace.slug}/docs/${document.id}`);
    } catch {
      addToast({ message: '문서 생성에 실패했습니다', type: 'error' });
    }
  }, [currentWorkspace, router, addToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <AppHeader onSearchClick={handleSearchToggle} onNewDoc={() => void handleNewDoc()} />
      <Sidebar onSearchClick={handleSearchToggle} />
      <main className="overflow-y-auto" style={{ background: 'var(--bg)' }}>
        {children}
      </main>
      <SearchModal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
