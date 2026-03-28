'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MarkdownEditor } from '@markflow/editor';
import '@markflow/editor/styles';
import { apiFetch, ApiError } from '../../../../../lib/api';
import { useEditorStore } from '../../../../../stores/editor-store';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { usePermissions } from '../../../../../hooks/use-permissions';
import type { DocumentResponse } from '../../../../../lib/types';
import Link from 'next/link';
import { DocumentMetaPanel } from '../../../../../components/document-meta-panel';
import { VersionHistoryPanel } from '../../../../../components/version-history-panel';
import { VersionHistoryModal } from '../../../../../components/version-history-modal';

export default function DocEditorPage() {
  const { workspaceSlug, docId } = useParams<{ workspaceSlug: string; docId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id;
  const permissions = usePermissions(currentWorkspace?.role);

  const {
    content, title, saveStatus,
    setDocument, setContent, setTitle, setSaveStatus, reset,
  } = useEditorStore();

  const [error, setError] = useState('');
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const isMountedRef = useRef(true);
  const wsIdRef = useRef(wsId);
  wsIdRef.current = wsId;

  // Fetch document
  const documentQuery = useQuery({
    queryKey: ['document', wsId, docId],
    queryFn: async () => {
      const res = await apiFetch<DocumentResponse>(
        `/workspaces/${wsId}/documents/${docId}`,
      );
      return res.document;
    },
    enabled: !!wsId,
  });

  // Fetch relations for Prev/Next navigation
  const relationsQuery = useQuery({
    queryKey: ['relations', wsId, docId],
    queryFn: async () => {
      const res = await apiFetch<{ prev: { id: string; title: string } | null; next: { id: string; title: string } | null }>(
        `/workspaces/${wsId}/documents/${docId}/relations`,
      );
      return res;
    },
    enabled: !!wsId,
  });

  // Initialize editor store
  useEffect(() => {
    if (documentQuery.data) {
      setDocument(documentQuery.data.id, documentQuery.data.title, documentQuery.data.content);
    }
  }, [documentQuery.data, setDocument]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      reset();
    };
  }, [reset]);

  // 수동 저장만 — 버튼 클릭 또는 Cmd+S
  const handleSave = useCallback(async () => {
    const currentWsId = wsIdRef.current;
    if (!currentWsId) {
      setError('워크스페이스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const { title: currentTitle, content: currentContent } = useEditorStore.getState();
    setSaveStatus('saving');
    setError('');
    try {
      await apiFetch(
        `/workspaces/${currentWsId}/documents/${docId}`,
        { method: 'PATCH', body: { title: currentTitle, content: currentContent } },
      );
      if (isMountedRef.current) {
        setSaveStatus('saved');
        void queryClient.invalidateQueries({ queryKey: ['documents', currentWsId] });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setSaveStatus('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      }
    }
  }, [docId, setSaveStatus, queryClient]);

  // Ctrl+S / Cmd+S 단축키 저장
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Beforeunload — ref로 추적하여 리스너 재등록 방지
  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatusRef.current === 'unsaved') {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Loading
  if (documentQuery.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--text-3)' }}>문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error
  if (documentQuery.error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            문서를 찾을 수 없습니다
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>
            삭제되었거나 접근 권한이 없는 문서입니다.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${workspaceSlug}/docs`)}
            style={{
              padding: '9px 18px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)', fontSize: '13.5px',
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            문서 목록으로
          </button>
        </div>
      </div>
    );
  }

  const doc = documentQuery.data;
  if (!doc) return null;

  const isReadOnly = !permissions.canEditDocument;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Error banner */}
      {error && (
        <div style={{
          padding: '8px 16px', background: 'var(--red-lt)', borderBottom: '1px solid var(--red)',
          fontSize: '13px', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '13px' }}>
            닫기
          </button>
        </div>
      )}

      {/* Title + Save button */}
      <div style={{ padding: '20px 28px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            disabled={isReadOnly}
            aria-label="문서 제목"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '24px', fontWeight: 700, color: 'var(--text)',
              fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
            }}
          />
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                flexShrink: 0, transition: 'background 0.15s, opacity 0.15s',
                ...(saveStatus === 'saved'
                  ? { background: 'var(--green-lt)', color: 'var(--green)' }
                  : saveStatus === 'saving'
                    ? { background: 'var(--surface-2)', color: 'var(--text-3)' }
                    : saveStatus === 'error'
                      ? { background: 'var(--red-lt)', color: 'var(--red)' }
                      : { background: 'var(--accent)', color: '#fff' }),
                ...((saveStatus === 'saving' || saveStatus === 'saved') ? { opacity: 0.7, cursor: 'default' } : {}),
              }}
            >
              {saveStatus === 'saving' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  저장 중...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  저장됨
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  재시도
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  저장
                </>
              )}
            </button>
          )}
        </div>
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-3)' }}>
          <span>
            마지막 수정: {new Date(doc.updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <span style={{ marginLeft: 'auto' }} />
          <button
            onClick={() => setShowVersionModal(!showVersionModal)}
            style={{
              padding: '2px 8px', background: showVersionModal ? 'var(--accent-2)' : 'var(--surface-2)',
              color: showVersionModal ? 'var(--accent)' : 'var(--text-3)',
              borderRadius: '100px', fontSize: '11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            버전 기록
          </button>
          <button
            onClick={() => setShowMetaPanel(!showMetaPanel)}
            style={{
              padding: '2px 8px', background: showMetaPanel ? 'var(--accent-2)' : 'var(--surface-2)',
              color: showMetaPanel ? 'var(--accent)' : 'var(--text-3)',
              borderRadius: '100px', fontSize: '11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            문서 속성
          </button>
          {isReadOnly && (
            <span style={{ padding: '2px 8px', background: 'var(--amber-lt)', color: 'var(--amber)', borderRadius: '100px', fontSize: '11px' }}>
              읽기 전용
            </span>
          )}
        </div>
      </div>

      {/* Editor + Meta Panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height="100%"
            layout="split"
            readOnly={isReadOnly}
          />
        </div>

        {/* Meta Panel */}
        {showMetaPanel && wsId && (
          <DocumentMetaPanel
            document={{
              id: doc.id,
              title: doc.title,
              categoryId: doc.categoryId ?? null,
              categoryPath: doc.categoryId ?? null,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
              author: { id: doc.authorId, name: doc.authorId },
            }}
            workspaceSlug={workspaceSlug}
            workspaceId={wsId}
            role={currentWorkspace?.role ?? null}
            onClose={() => setShowMetaPanel(false)}
          />
        )}

        {/* Version History Side Panel */}
        <VersionHistoryPanel
          open={showVersionPanel}
          onClose={() => setShowVersionPanel(false)}
          workspaceSlug={workspaceSlug}
          documentId={docId}
          onOpenFullModal={() => { setShowVersionPanel(false); setShowVersionModal(true); }}
        />
      </div>

      {/* Version History Full Modal */}
      {wsId && (
        <VersionHistoryModal
          open={showVersionModal}
          onClose={() => setShowVersionModal(false)}
          workspaceId={wsId}
          documentId={docId}
          currentContent={content}
          hasUnsavedChanges={saveStatus === 'unsaved'}
          onRestore={(restoredContent) => setContent(restoredContent)}
        />
      )}

      {/* Prev/Next Navigation */}
      {relationsQuery.data && (relationsQuery.data.prev || relationsQuery.data.next) && (
        <div style={{ display: 'flex', gap: '16px', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          {relationsQuery.data.prev ? (
            <Link
              href={`/${workspaceSlug}/docs/${relationsQuery.data.prev.id}`}
              style={{
                flex: 1, padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                ← 이전 문서
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                {relationsQuery.data.prev.title}
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
          {relationsQuery.data.next ? (
            <Link
              href={`/${workspaceSlug}/docs/${relationsQuery.data.next.id}`}
              style={{
                flex: 1, padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)', textAlign: 'right', textDecoration: 'none', color: 'inherit',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                다음 문서 →
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                {relationsQuery.data.next.title}
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
        </div>
      )}

    </div>
  );
}
