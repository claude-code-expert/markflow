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

const AUTOSAVE_DELAY_MS = 1000;
const MAX_RETRY = 3;

export default function DocEditorPage() {
  const { workspaceSlug, docId } = useParams<{ workspaceSlug: string; docId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { workspaces, currentWorkspace, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();

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

  const permissions = usePermissions(currentWorkspace?.role);
  const {
    content, title, saveStatus,
    setDocument, setContent, setTitle, setSaveStatus, reset,
  } = useEditorStore();

  const [error, setError] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Fetch document — fix wrapper
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
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      reset();
    };
  }, [reset]);

  // Auto-save with retry (FR-009: 실패 시 5초 후 재시도, 최대 3회)
  const saveDocument = useCallback(
    async (newTitle: string, newContent: string) => {
      if (!isMountedRef.current) return;
      setSaveStatus('saving');
      try {
        await apiFetch(
          `/workspaces/${wsId}/documents/${docId}`,
          { method: 'PATCH', body: { title: newTitle, content: newContent } },
        );
        if (isMountedRef.current) {
          setSaveStatus('saved');
          retryCountRef.current = 0;
          void queryClient.invalidateQueries({ queryKey: ['documents', wsId] });
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setSaveStatus('error');
        if (err instanceof ApiError) setError(err.message);

        // Auto-retry
        if (retryCountRef.current < MAX_RETRY) {
          retryCountRef.current += 1;
          saveTimerRef.current = setTimeout(() => {
            void saveDocument(newTitle, newContent);
          }, 5000);
        }
      }
    },
    [wsId, docId, setSaveStatus, queryClient],
  );

  // Debounced auto-save
  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      retryCountRef.current = 0;
      saveTimerRef.current = setTimeout(() => {
        void saveDocument(newTitle, newContent);
      }, AUTOSAVE_DELAY_MS);
    },
    [saveDocument],
  );

  function handleContentChange(newContent: string) {
    setContent(newContent);
    triggerAutoSave(title, newContent);
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    triggerAutoSave(newTitle, content);
  }

  // Beforeunload warning for unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

      {/* Title */}
      <div style={{ padding: '20px 28px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="제목을 입력하세요"
          disabled={isReadOnly}
          aria-label="문서 제목"
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            fontSize: '24px', fontWeight: 700, color: 'var(--text)',
            fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
          }}
        />
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-3)' }}>
          <span>
            마지막 수정: {new Date(doc.updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          {isReadOnly && (
            <span style={{ padding: '2px 8px', background: 'var(--amber-lt)', color: 'var(--amber)', borderRadius: '100px', fontSize: '11px' }}>
              읽기 전용
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MarkdownEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          layout="split"
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
