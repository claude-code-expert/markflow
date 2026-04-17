'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MarkdownEditor, type WikiLinkItem } from '@markflow/editor';
import '@markflow/editor/styles';
import { apiFetch, ApiError } from '../../../../../lib/api';
import { uploadImage, getWorkerUrl, isImageUploadEnabled } from '../../../../../lib/image-upload';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { usePermissions } from '../../../../../hooks/use-permissions';
import type { DocumentResponse, Category } from '../../../../../lib/types';
import { Moon, Sun, PenLine, Columns2, Eye, FolderOpen, ChevronDown, HardDrive, X } from 'lucide-react';
import { useToastStore } from '../../../../../stores/toast-store';
import { StorageGuidePanel } from '../../../../../components/storage-guide-panel';
import { Tooltip } from '../../../../../components/tooltip';
import { ConfirmModal } from '../../../../../components/confirm-modal';
import { parseThemeCss } from '../../../../../lib/parse-theme-css';

// 제목 최초 입력 후 임시저장 확인 모달이 뜨기까지 대기 시간
const DRAFT_PROMPT_DELAY_MS = 5 * 60 * 1000;

export default function NewDocPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const searchParams = useSearchParams();
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

  // Local editor state (not persisted until save)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(() => {
    const param = searchParams.get('categoryId');
    return param ? Number(param) : null;
  });
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'error'>('unsaved');
  const [error, setError] = useState('');

  const [editorLayout, setEditorLayout] = useState<'editor' | 'split' | 'preview'>('split');
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
  const [showStorageGuide, setShowStorageGuide] = useState(false);
  const [storageBannerDismissed, setStorageBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem('mf-storage-banner-dismissed-at');
    if (!dismissedAt) return false;
    return Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000;
  });

  // 5분 경과 시 뜨는 임시저장 확인 모달 상태
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  // 취소 시 세션 내 다시 묻지 않도록 잠금
  const draftPromptDismissedRef = useRef(false);

  const isMountedRef = useRef(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const wsIdRef = useRef(wsId);
  wsIdRef.current = wsId;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch categories for inline selector
  const categoriesQuery = useQuery({
    queryKey: ['categories', wsId],
    queryFn: () => apiFetch<{ categories: Category[] }>(`/workspaces/${wsId}/categories`),
    enabled: !!wsId,
  });
  const categoryList = categoriesQuery.data?.categories ?? [];

  // Image upload
  const imageUploadEnabled = useMemo(() => isImageUploadEnabled(), []);
  const handleImageUpload = useMemo(() => {
    if (!imageUploadEnabled) return undefined;
    const url = getWorkerUrl();
    if (!url) return undefined;
    return async (file: File): Promise<string> => uploadImage(file);
  }, [imageUploadEnabled]);

  // Wiki link search
  const handleWikiLinkSearch = useCallback(async (query: string): Promise<WikiLinkItem[]> => {
    if (!wsId) return [];
    try {
      const res = await apiFetch<{ documents: Array<{ id: number; title: string }> }>(
        `/workspaces/${wsId}/documents?q=${encodeURIComponent(query)}&limit=8`,
      );
      return res.documents.map((d) => ({ id: d.id, title: d.title }));
    } catch {
      return [];
    }
  }, [wsId]);

  // 첫 저장 = 문서 생성 (POST) → 생성 후 에디터 페이지로 replace
  // status='draft' 이면 임시저장, 기본 'published' 는 일반 저장
  const handleSave = useCallback(async (status: 'draft' | 'published' = 'published') => {
    const currentWsId = wsIdRef.current;
    if (!currentWsId) {
      setError('워크스페이스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!title.trim()) {
      addToast({ message: '제목을 입력해주세요', type: 'error' });
      return;
    }

    setSaveStatus('saving');
    setError('');
    try {
      const { document } = await apiFetch<DocumentResponse>(
        `/workspaces/${currentWsId}/documents`,
        {
          method: 'POST',
          body: {
            title: title.trim(),
            content,
            status,
            ...(categoryId ? { categoryId } : {}),
          },
        },
      );
      if (isMountedRef.current) {
        void queryClient.invalidateQueries({ queryKey: ['documents', currentWsId] });
        addToast({
          message: status === 'draft' ? '임시저장되었습니다' : '문서가 생성되었습니다',
          type: 'success',
        });
        // draft 도 문서 페이지로 이동하여 계속 작성 가능
        router.replace(`/${workspaceSlug}/doc/${document.id}`);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setSaveStatus('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      }
      addToast({ message: '저장에 실패했습니다', type: 'error' });
    }
  }, [title, content, categoryId, queryClient, addToast, router, workspaceSlug]);

  // 임시저장 모달 확인 핸들러. 로딩 상태는 saveStatus === 'saving' 으로 이미 추적 중이므로
  // 별도 state 는 두지 않는다.
  const handleConfirmDraft = useCallback(async () => {
    try {
      await handleSave('draft');
    } finally {
      if (isMountedRef.current) {
        setDraftPromptOpen(false);
      }
    }
  }, [handleSave]);

  // 임시저장 모달 취소 핸들러 (세션 내 재노출 안 함)
  const handleCancelDraft = useCallback(() => {
    draftPromptDismissedRef.current = true;
    setDraftPromptOpen(false);
  }, []);

  // Ctrl+S / Cmd+S — 수동 저장은 published 로 바로 진행
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSave('published');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Beforeunload / 타이머 콜백에서 최신 값 참조용 (리스너 재등록 방지)
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  contentRef.current = content;
  titleRef.current = title;

  // 제목이 처음 입력된 순간부터 5분 타이머 시작 → 경과 시 임시저장 확인 모달 표시
  // - 의존성에 title 자체가 아닌 hasTitle(boolean) 만 두어 키 입력마다 리셋되지 않음
  // - 제목이 빈 문자열이 되면 타이머 취소
  // - 사용자가 한 번 '계속 작성' 으로 닫았으면 세션 내 다시 뜨지 않음
  // - 모달이 이미 열려있거나 이미 저장 중이면 타이머 재등록 없음
  const hasTitle = title.trim().length > 0;
  useEffect(() => {
    if (!hasTitle) return;
    if (draftPromptDismissedRef.current) return;
    if (draftPromptOpen) return;
    if (saveStatus === 'saving') return;

    const timerId = window.setTimeout(() => {
      // 타이머 발화 시점에도 조건 재확인 (경쟁 방지)
      if (!isMountedRef.current) return;
      if (draftPromptDismissedRef.current) return;
      if (!titleRef.current.trim()) return;
      setDraftPromptOpen(true);
    }, DRAFT_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [hasTitle, draftPromptOpen, saveStatus]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (contentRef.current || titleRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!permissions.canCreateDocument) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-3)' }}>문서 생성 권한이 없습니다.</p>
      </div>
    );
  }

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
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
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
            autoFocus
            aria-label="문서 제목"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '24px', fontWeight: 700, color: 'var(--text)',
              fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => void handleSave('published')}
              disabled={saveStatus === 'saving'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px',
                padding: '7px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: 500, flexShrink: 0,
                transition: 'background 0.15s, opacity 0.15s',
                ...(saveStatus === 'saving'
                  ? { background: 'var(--surface-2)', color: 'var(--text-3)', opacity: 0.7 }
                  : saveStatus === 'error'
                    ? { background: 'var(--red-lt)', color: 'var(--red)' }
                    : { background: 'var(--accent)', color: '#fff' }),
              }}
            >
              {saveStatus === 'saving' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  저장 중...
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
          </div>
        </div>
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
          <span>새 문서</span>
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
            <Tooltip label="이미지 저장소">
              <button type="button" onClick={() => setShowStorageGuide((v) => !v)} style={{ ...iconBtnStyle, background: showStorageGuide ? 'var(--accent-2)' : 'transparent', color: showStorageGuide ? 'var(--accent)' : 'var(--text-3)' }}>
                <HardDrive size={14} />
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
            onClick={() => { setShowStorageGuide(true); }}
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

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <style>{`.mf-toolbar-spacer { display: none !important; }`}</style>
        <div ref={editorContainerRef} style={{ flex: 1, overflow: 'hidden' }}>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height="100%"
            layout={editorLayout}
            theme={editorTheme}
            onWikiLinkSearch={handleWikiLinkSearch}
            onImageUpload={handleImageUpload}
            onImageUploadGuide={() => {
              if (!imageUploadEnabled) {
                router.push(`/${workspaceSlug}/settings/storage`);
              } else {
                setShowStorageGuide(true);
              }
            }}
            themeVars={themeVars}
          />
        </div>

        {/* Storage Guide Panel */}
        {showStorageGuide && (
          <StorageGuidePanel
            onClose={() => setShowStorageGuide(false)}
            onConfigured={() => setShowStorageGuide(false)}
          />
        )}
      </div>

      {/* 5분 경과 시 임시저장 확인 모달 */}
      <ConfirmModal
        open={draftPromptOpen}
        onClose={handleCancelDraft}
        onConfirm={() => void handleConfirmDraft()}
        title="임시저장 하시겠습니까?"
        message="작성을 시작한 지 5분이 지났습니다. 현재 내용을 임시저장할까요?"
        confirmLabel="임시저장"
        cancelLabel="계속 작성"
        isLoading={saveStatus === 'saving'}
      />
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
