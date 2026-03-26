'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '../../stores/workspace-store';
import type { Workspace } from '../../lib/types';
import { CreateWorkspaceModal } from '../../components/create-workspace-modal';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'var(--purple-lt)', text: 'var(--purple)' },
  admin: { bg: 'var(--accent-2)', text: 'var(--accent)' },
  editor: { bg: 'var(--green-lt)', text: 'var(--green)' },
  viewer: { bg: 'var(--surface-2)', text: 'var(--text-3)' },
};

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
  viewer: '뷰어',
};

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 30) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS['viewer']!;
  const label = ROLE_LABELS[role] ?? role;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '100px',
        fontSize: '11.5px',
        fontWeight: 500,
        background: colors.bg,
        color: colors.text,
      }}
    >
      {label}
    </span>
  );
}

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const slug = workspace.slug;
  if (!slug) return null;

  return (
    <Link
      href={`/${slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Icon */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius)',
          background: 'var(--accent-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--accent)',
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
        }}
      >
        {workspace.name.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {workspace.name}
          </span>
          <RoleBadge role={workspace.role} />
          {workspace.isPublic && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '100px' }}>
              공개
            </span>
          )}
        </div>
        <p style={{ marginTop: '2px', fontSize: '12px', color: 'var(--text-3)' }}>
          /{workspace.slug} · {formatRelativeTime(workspace.lastActivityAt)}
        </p>
      </div>

      {/* Arrow */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

export default function WorkspaceListPage() {
  const router = useRouter();
  const { workspaces, isLoading, fetchWorkspaces } = useWorkspaceStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  // FR-003: 워크스페이스 1개일 때 자동 리다이렉트
  useEffect(() => {
    if (!isLoading && workspaces.length === 1) {
      const ws = workspaces[0];
      if (ws?.slug) {
        router.replace(`/${ws.slug}`);
      }
    }
  }, [isLoading, workspaces, router]);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            워크스페이스
          </h1>
          <p style={{ marginTop: '4px', fontSize: '14px', color: 'var(--text-2)' }}>
            팀과 함께 지식을 관리하세요
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          워크스페이스 만들기
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
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
            <p style={{ fontSize: '14px', color: 'var(--text-3)' }}>워크스페이스를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* Empty State — US1-AS4 */}
      {!isLoading && workspaces.length === 0 && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '64px 32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            첫 워크스페이스를 만들어보세요
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>
            팀과 함께 지식을 관리하세요.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            워크스페이스 만들기
          </button>
        </div>
      )}

      {/* Workspace List — prototype .ws-list */}
      {!isLoading && workspaces.length > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {workspaces.map((ws) => (
            <WorkspaceRow key={ws.id} workspace={ws} />
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
