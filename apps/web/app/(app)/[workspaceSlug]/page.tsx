'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkspaceStore } from '../../../stores/workspace-store';

export default function WorkspaceHomePage() {
  const router = useRouter();
  const params = useParams<{ workspaceSlug: string }>();
  const workspaceSlug = params.workspaceSlug;
  const { workspaces, isLoading, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (workspaces.length === 0 && !isLoading) {
      void fetchWorkspaces();
    }
  }, [workspaces.length, isLoading, fetchWorkspaces]);

  useEffect(() => {
    if (isLoading) return;

    // slug가 falsy이면 워크스페이스 목록으로 (FR-002)
    if (!workspaceSlug) {
      router.replace('/');
      return;
    }

    // 워크스페이스가 존재하는지 확인
    const found = workspaces.find((ws) => ws.slug === workspaceSlug);
    if (workspaces.length > 0 && !found) {
      // 유효하지 않은 slug → 워크스페이스 목록으로
      router.replace('/');
      return;
    }

    // /{workspaceSlug} → /{workspaceSlug}/docs 리다이렉트
    router.replace(`/${workspaceSlug}/docs`);
  }, [isLoading, workspaceSlug, workspaces, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ fontSize: '14px', color: 'var(--text-3)' }}>이동 중...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
