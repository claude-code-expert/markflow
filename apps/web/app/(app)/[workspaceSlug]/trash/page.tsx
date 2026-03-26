'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../../../lib/api';
import type { Document, TrashResponse, RestoreResponse } from '../../../../lib/types';
import { useWorkspaceStore } from '../../../../stores/workspace-store';

interface ToastState {
  message: string;
  visible: boolean;
}

export default function TrashPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = use(params);
  const queryClient = useQueryClient();
  const { workspaces, currentWorkspace, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  useEffect(() => {
    if (workspaces.length === 0) void fetchWorkspaces();
  }, [workspaces.length, fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      const found = workspaces.find((ws) => ws.slug === workspaceSlug);
      if (found) setCurrentWorkspace(found);
    }
  }, [currentWorkspace, workspaces, workspaceSlug, setCurrentWorkspace]);

  const wsId = currentWorkspace?.id;

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
  }, []);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  // Fetch trashed documents
  const trashQuery = useQuery({
    queryKey: ['trash', wsId],
    queryFn: () =>
      apiFetch<TrashResponse>(
        `/workspaces/${wsId}/documents/trash`,
      ),
    enabled: !!wsId,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (docId: string) =>
      apiFetch<RestoreResponse>(
        `/workspaces/${wsId}/documents/${docId}/restore`,
        { method: 'POST' },
      ),
    onSuccess: (_data, docId) => {
      const restoredDoc = documents.find((d) => d.id === docId);
      const title = restoredDoc?.title ?? '문서';
      showToast(`"${title}" 문서가 복원되었습니다.`);
      void queryClient.invalidateQueries({ queryKey: ['trash', wsId] });
      void queryClient.invalidateQueries({ queryKey: ['documents', wsId] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        showToast(`복원 실패: ${err.message}`);
      } else {
        showToast('복원 중 오류가 발생했습니다.');
      }
    },
  });

  function formatDeletedDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const documents: Document[] = trashQuery.data?.documents ?? [];

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          휴지통
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: 'var(--text-3)',
            lineHeight: 1.5,
          }}
        >
          삭제된 문서를 확인하고 복원할 수 있습니다.
        </p>
      </div>

      {/* Loading */}
      {trashQuery.isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '2px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
              불러오는 중...
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!trashQuery.isLoading && documents.length === 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '64px 24px',
            textAlign: 'center',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-3)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px', opacity: 0.5 }}
          >
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text)',
              margin: '0 0 4px',
            }}
          >
            휴지통이 비어있습니다
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
            삭제된 문서가 없습니다.
          </p>
        </div>
      )}

      {/* Document List */}
      {!trashQuery.isLoading && documents.length > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {documents.map((doc, idx) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: idx > 0 ? '1px solid var(--surface-3)' : 'none',
                gap: 16,
              }}
            >
              {/* Document Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-3)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.title}
                  </span>
                </div>
                {doc.deletedAt && (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-3)',
                      paddingLeft: 24,
                    }}
                  >
                    {formatDeletedDate(doc.deletedAt)} 삭제됨
                  </span>
                )}
              </div>

              {/* Restore Button */}
              <button
                type="button"
                onClick={() => restoreMutation.mutate(doc.id)}
                disabled={restoreMutation.isPending}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--accent)',
                  background: 'transparent',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: restoreMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: restoreMutation.isPending ? 0.5 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!restoreMutation.isPending) {
                    e.currentTarget.style.background = 'var(--accent-2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                복원
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toast Notification (FR-014) */}
      {toast.visible && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--green)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Spin animation for loading indicator */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
