'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MarkdownEditor, type WikiLinkItem } from '@markflow/editor';
import '@markflow/editor/styles';
import { apiFetch, ApiError } from '../../../../../lib/api';
import { uploadImage, getWorkerUrl, isImageUploadEnabled } from '../../../../../lib/image-upload';
import { useEditorStore } from '../../../../../stores/editor-store';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { usePermissions } from '../../../../../hooks/use-permissions';
import type { DocumentResponse, Category } from '../../../../../lib/types';
import Link from 'next/link';
import { History, PanelRight, Moon, Sun, PenLine, Columns2, Eye, FolderOpen, ChevronDown, Presentation, MessageSquare, HardDrive, X } from 'lucide-react';
import { DocumentMetaPanel } from '../../../../../components/document-meta-panel';
import { VersionHistoryPanel } from '../../../../../components/version-history-panel';
import { VersionHistoryModal } from '../../../../../components/version-history-modal';
import { useToastStore } from '../../../../../stores/toast-store';
import { LinkPreview } from '../../../../../components/link-preview';
import { CommentPanel } from '../../../../../components/comment-panel';
import { StorageGuidePanel } from '../../../../../components/storage-guide-panel';
import { Tooltip } from '../../../../../components/tooltip';
import { parseThemeCss } from '../../../../../lib/parse-theme-css';

export default function DocEditorPage() {
  const { workspaceSlug, docId } = useParams<{ workspaceSlug: string; docId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id;
  const permissions = usePermissions(currentWorkspace?.role);
  const themeVars = useMemo(
    () => currentWorkspace?.themeCss ? parseThemeCss(currentWorkspace.themeCss) : undefined,
    [currentWorkspace?.themeCss],
  );

  const {
    content, title, saveStatus,
    setDocument, setContent, setTitle, setSaveStatus, reset,
  } = useEditorStore();

  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<'meta' | 'version' | 'comment' | null>('meta');
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showStorageGuide, setShowStorageGuide] = useState(false);
  const [storageBannerDismissed, setStorageBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem('mf-storage-banner-dismissed-at');
    if (!dismissedAt) return false;
    return Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000;
  });

  const togglePanel = (panel: 'meta' | 'version' | 'comment') => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };
  const [editorLayout, setEditorLayout] = useState<'editor' | 'split' | 'preview'>('split');
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
  const isMountedRef = useRef(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const wsIdRef = useRef(wsId);
  wsIdRef.current = wsId;

  // Fetch document
  const documentQuery = useQuery({
    queryKey: ['document', wsId, Number(docId)],
    queryFn: async () => {
      const res = await apiFetch<DocumentResponse>(
        `/workspaces/${wsId}/documents/${docId}`,
      );
      return res.document;
    },
    enabled: !!wsId,
  });

  // Fetch categories for inline selector
  const categoriesQuery = useQuery({
    queryKey: ['categories', wsId],
    queryFn: () => apiFetch<{ categories: Category[] }>(`/workspaces/${wsId}/categories`),
    enabled: !!wsId,
  });
  const categoryList = categoriesQuery.data?.categories ?? [];

  // Category change handler
  const handleCategoryChange = useCallback(async (categoryId: number | null) => {
    const currentWsId = wsIdRef.current;
    if (!currentWsId) return;
    try {
      await apiFetch(`/workspaces/${currentWsId}/documents/${docId}`, {
        method: 'PATCH', body: { categoryId },
      });
      void queryClient.invalidateQueries({ queryKey: ['document', currentWsId, Number(docId)] });
    } catch { /* handled by meta panel */ }
  }, [docId, queryClient]);

  // Fetch relations for Prev/Next navigation
  const relationsQuery = useQuery({
    queryKey: ['relations', wsId, Number(docId)],
    queryFn: async () => {
      const res = await apiFetch<{ prev: { id: number; title: string } | null; next: { id: number; title: string } | null }>(
        `/workspaces/${wsId}/documents/${docId}/relations`,
      );
      return res;
    },
    enabled: !!wsId,
  });

  // Image upload callback — 업로드 활성화 + Worker URL 설정 시에만 활성화
  // 비활성화 또는 미설정 시 onImageUpload를 전달하지 않아 에디터 내장 가이드 모달이 표시됨
  const imageUploadEnabled = useMemo(() => isImageUploadEnabled(), []);
  const handleImageUpload = useMemo(() => {
    if (!imageUploadEnabled) return undefined;
    const url = getWorkerUrl();
    if (!url) return undefined;
    return async (file: File): Promise<string> => {
      return uploadImage(file);
    };
  }, [imageUploadEnabled]);

  // Wiki link search callback
  const handleWikiLinkSearch = useCallback(async (query: string): Promise<WikiLinkItem[]> => {
    if (!wsId) return [];
    try {
      const res = await apiFetch<{ documents: Array<{ id: number; title: string }> }>(
        `/workspaces/${wsId}/documents?q=${encodeURIComponent(query)}&limit=8`
      );
      return res.documents.map((d) => ({ id: d.id, title: d.title }));
    } catch {
      return [];
    }
  }, [wsId]);

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
        addToast({ message: '저장되었습니다', type: 'success' });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setSaveStatus('error');
      addToast({ message: '저장에 실패했습니다', type: 'error' });
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      }
    }
  }, [docId, setSaveStatus, queryClient, addToast]);

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
            onClick={() => router.push(`/${workspaceSlug}/doc`)}
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
      <div style={{ padding: '16px 28px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              value={doc.categoryId ?? ''}
              onChange={(e) => void handleCategoryChange(e.target.value ? Number(e.target.value) : null)}
              disabled={isReadOnly}
              aria-label="카테고리 선택"
              style={{
                appearance: 'none', padding: '5px 24px 5px 28px',
                fontSize: '12px', fontWeight: 500, color: 'var(--text-2)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', outline: 'none',
                fontFamily: 'inherit', maxWidth: '160px',
              }}
            >
              <option value="">Root</option>
              {categoryList.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <FolderOpen size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
            <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
          </div>
          <span style={{ color: 'var(--border-2)', fontSize: '18px', fontWeight: 300, lineHeight: 1 }}>/</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {isReadOnly && (
              <span style={{ padding: '2px 8px', background: 'var(--amber-lt)', color: 'var(--amber)', borderRadius: '100px', fontSize: '11px', marginLeft: '4px' }}>
                읽기 전용
              </span>
            )}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px',
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
        </div>
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
          <span>
            마지막 수정: {new Date(doc.updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Tooltip label={editorTheme === 'light' ? '다크 모드' : '라이트 모드'}>
              <button type="button" onClick={() => setEditorTheme(editorTheme === 'light' ? 'dark' : 'light')} style={iconBtnStyle}>
                {editorTheme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
            </Tooltip>
            <div style={sepStyle} />
            <Tooltip label="에디터만">
              <button type="button" onClick={() => setEditorLayout('editor')} style={{ ...iconBtnStyle, background: editorLayout === 'editor' ? 'var(--accent-2)' : 'transparent', color: editorLayout === 'editor' ? 'var(--accent)' : 'var(--text-3)' }}>
                <PenLine size={14} />
              </button>
            </Tooltip>
            <Tooltip label="분할 보기">
              <button type="button" onClick={() => setEditorLayout('split')} style={{ ...iconBtnStyle, background: editorLayout === 'split' ? 'var(--accent-2)' : 'transparent', color: editorLayout === 'split' ? 'var(--accent)' : 'var(--text-3)' }}>
                <Columns2 size={14} />
              </button>
            </Tooltip>
            <Tooltip label="미리보기만">
              <button type="button" onClick={() => setEditorLayout('preview')} style={{ ...iconBtnStyle, background: editorLayout === 'preview' ? 'var(--accent-2)' : 'transparent', color: editorLayout === 'preview' ? 'var(--accent)' : 'var(--text-3)' }}>
                <Eye size={14} />
              </button>
            </Tooltip>
            <div style={sepStyle} />
            <Tooltip label="프레젠테이션">
              <button type="button" onClick={() => window.open(`/present/${workspaceSlug}/${docId}`, '_blank', 'noopener')} style={iconBtnStyle}>
                <Presentation size={14} />
              </button>
            </Tooltip>
            <Tooltip label="이미지 저장소">
              <button type="button" onClick={() => { setShowStorageGuide((v) => !v); if (!showStorageGuide) setActivePanel(null); }} style={{ ...iconBtnStyle, background: showStorageGuide ? 'var(--accent-2)' : 'transparent', color: showStorageGuide ? 'var(--accent)' : 'var(--text-3)' }}>
                <HardDrive size={14} />
              </button>
            </Tooltip>
            <div style={sepStyle} />
            <Tooltip label="댓글">
              <button type="button" onClick={() => togglePanel('comment')} style={{ ...iconBtnStyle, background: activePanel === 'comment' ? 'var(--accent-2)' : 'transparent', color: activePanel === 'comment' ? 'var(--accent)' : 'var(--text-3)' }}>
                <MessageSquare size={14} />
              </button>
            </Tooltip>
            <Tooltip label="문서 속성">
              <button type="button" onClick={() => togglePanel('meta')} style={{ ...iconBtnStyle, background: activePanel === 'meta' ? 'var(--accent-2)' : 'transparent', color: activePanel === 'meta' ? 'var(--accent)' : 'var(--text-3)' }}>
                <PanelRight size={14} />
              </button>
            </Tooltip>
            <Tooltip label="버전 기록">
              <button type="button" onClick={() => togglePanel('version')} style={{ ...iconBtnStyle, background: activePanel === 'version' ? 'var(--accent-2)' : 'transparent', color: activePanel === 'version' ? 'var(--accent)' : 'var(--text-3)' }}>
                <History size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Storage not configured banner */}
      {imageUploadEnabled && !getWorkerUrl() && !showStorageGuide && !storageBannerDismissed && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '8px 16px', fontSize: '12.5px',
            background: 'var(--amber-lt, #fef3c7)', color: 'var(--amber, #92400e)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={() => { setShowStorageGuide(true); setActivePanel(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', flex: 1,
              background: 'none', border: 'none', color: 'inherit',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
              textAlign: 'left' as const, padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>이미지 업로드를 사용하려면 저장소 설정이 필요합니다.</span>
            <span style={{ fontWeight: 600, marginLeft: '4px' }}>설정하기 →</span>
          </button>
          <button
            type="button"
            aria-label="닫기"
            onClick={(e) => {
              e.stopPropagation();
              localStorage.setItem('mf-storage-banner-dismissed-at', String(Date.now()));
              setStorageBannerDismissed(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '20px', height: '20px', flexShrink: 0,
              background: 'none', border: 'none', color: 'inherit',
              cursor: 'pointer', borderRadius: '4px', opacity: 0.6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editor + Meta Panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <style>{`.mf-toolbar-spacer { display: none !important; }`}</style>
        <div ref={editorContainerRef} style={{ flex: 1, overflow: 'hidden' }}>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height="100%"
            layout={editorLayout}
            theme={editorTheme}
            readOnly={isReadOnly}
            onWikiLinkSearch={handleWikiLinkSearch}
            onImageUpload={handleImageUpload}
            onImageUploadGuide={() => {
              if (!imageUploadEnabled) {
                router.push(`/${workspaceSlug}/settings/storage`);
              } else {
                setShowStorageGuide(true); setActivePanel(null);
              }
            }}
            themeVars={themeVars}
          />
          {wsId && (
            <LinkPreview
              containerRef={editorContainerRef}
              workspaceId={wsId}
            />
          )}
        </div>

        {/* Meta Panel */}
        {activePanel === 'meta' && wsId && (
          <DocumentMetaPanel
            document={{
              id: doc.id,
              title: doc.title,
              categoryId: doc.categoryId ?? null,
              categoryPath: doc.categoryId != null
                ? (categoryList.find((c) => c.id === doc.categoryId)?.name ?? null)
                : null,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
              author: { id: doc.authorId, name: String(doc.authorId) },
            }}
            workspaceSlug={workspaceSlug}
            workspaceId={wsId}
            role={currentWorkspace?.role ?? null}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Comment Panel */}
        {activePanel === 'comment' && wsId && (
          <CommentPanel
            workspaceId={wsId}
            documentId={docId}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Version History Side Panel */}
        {activePanel === 'version' && wsId && (
          <VersionHistoryPanel
            open={activePanel === 'version'}
            onClose={() => setActivePanel(null)}
            workspaceId={wsId}
            documentId={docId}
            currentContent={content}
            onRestore={(restoredContent) => setContent(restoredContent)}
            onOpenFullModal={() => { setActivePanel(null); setShowVersionModal(true); }}
          />
        )}

        {/* Storage Guide Panel — 독립 오버레이 */}
        {showStorageGuide && (
          <StorageGuidePanel
            onClose={() => setShowStorageGuide(false)}
            onConfigured={() => setShowStorageGuide(false)}
          />
        )}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '50px', padding: '0 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {relationsQuery.data.prev ? (
            <Link
              href={`/${workspaceSlug}/doc/${relationsQuery.data.prev.id}`}
              title={`이전 문서: ${relationsQuery.data.prev.title}`}
              style={{
                maxWidth: '200px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0 12px', background: '#FFFFFF', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit',
                fontSize: '12px', transition: 'border-color 0.15s',
              }}
            >
              <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>←</span>
              <span style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {relationsQuery.data.prev.title}
              </span>
            </Link>
          ) : <div />}
          {relationsQuery.data.next ? (
            <Link
              href={`/${workspaceSlug}/doc/${relationsQuery.data.next.id}`}
              title={`다음 문서: ${relationsQuery.data.next.title}`}
              style={{
                maxWidth: '200px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px',
                padding: '0 12px', background: '#FFFFFF', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit',
                fontSize: '12px', transition: 'border-color 0.15s', marginLeft: 'auto',
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {relationsQuery.data.next.title}
              </span>
              <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>→</span>
            </Link>
          ) : <div />}
        </div>
      )}

    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  width: 28, height: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', borderRadius: 'var(--radius-sm)',
  background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
};

const sepStyle: React.CSSProperties = {
  width: 1, height: 14, background: 'var(--border)', margin: '0 4px',
};
