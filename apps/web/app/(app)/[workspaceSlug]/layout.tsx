'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkspaceStore } from '../../../stores/workspace-store';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const { workspaces, isLoading, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();
  const [status, setStatus] = useState<'loading' | 'found' | 'not-found'>('loading');

  useEffect(() => {
    if (workspaces.length === 0 && !isLoading) {
      void fetchWorkspaces();
    }
  }, [workspaces.length, isLoading, fetchWorkspaces]);

  useEffect(() => {
    if (isLoading) return;
    if (workspaces.length === 0) return;

    const found = workspaces.find((ws) => ws.slug === workspaceSlug);
    if (found) {
      setCurrentWorkspace(found);
      setStatus('found');
    } else {
      setStatus('not-found');
    }
  }, [isLoading, workspaces, workspaceSlug, setCurrentWorkspace]);

  if (status === 'not-found') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '64px 32px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--red-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 style={{
            fontSize: '18px', fontWeight: 600, color: 'var(--text)',
            fontFamily: 'var(--font-heading)', marginBottom: '8px',
          }}>
            워크스페이스를 찾을 수 없습니다
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>
            &quot;{workspaceSlug}&quot; 주소의 워크스페이스가 존재하지 않거나 삭제되었습니다.
          </p>
          <button
            onClick={() => router.push('/workspaces')}
            style={{
              padding: '9px 18px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)', fontSize: '13.5px',
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            워크스페이스 목록으로
          </button>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--text-3)' }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
