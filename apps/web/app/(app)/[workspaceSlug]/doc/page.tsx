'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../lib/api';
import type {
  DocumentsResponse,
  TagsResponse,
  Document,
  Tag,
} from '../../../../lib/types';
import { useWorkspaceStore } from '../../../../stores/workspace-store';
import { usePermissions } from '../../../../hooks/use-permissions';
import { CategoryTree, type Category } from '../../../../components/category-tree';
import { FolderContextMenu } from '../../../../components/folder-context-menu';
import { NewDocModal } from '../../../../components/new-doc-modal';
import { NewFolderModal } from '../../../../components/new-folder-modal';
import { ImportExportModal } from '../../../../components/import-export-modal';
import { flattenCategories } from '../../../../lib/category-utils';
import { Download, Plus } from 'lucide-react';
import { Tooltip } from '../../../../components/tooltip';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface CategoriesTreeResponse {
  categories: Category[];
}

type SortField = 'title' | 'updatedAt' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatDate(dateStr);
}

/** Flatten a Category tree to a lookup map for category names */
function buildCategoryMap(cats: Category[]): Map<number, string> {
  const map = new Map<number, string>();
  function walk(items: Category[], prefix: string) {
    for (const c of items) {
      const path = prefix ? `${prefix} / ${c.name}` : c.name;
      map.set(c.id, path);
      if (c.children && c.children.length > 0) walk(c.children, path);
    }
  }
  walk(cats, '');
  return map;
}

// ---------------------------------------------------------------------------
// Shared inline style fragments (MarkFlow design tokens)
// ---------------------------------------------------------------------------

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 18px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13.5px',
  fontWeight: 500,
  lineHeight: 1,
  transition: 'all .15s ease',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--accent)',
  color: '#fff',
  boxShadow: '0 1px 3px rgba(26,86,219,.3)',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--surface)',
  color: 'var(--text-2)',
  border: '1.5px solid var(--border)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocsPage() {
  const params = useParams<{ workspaceSlug: string }>();
  const workspaceSlug = params.workspaceSlug;

  const router = useRouter();
  const searchParams = useSearchParams();

  const { workspaces, currentWorkspace, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  // Resolve workspace from slug
  useEffect(() => {
    if (workspaces.length === 0) {
      void fetchWorkspaces();
    }
  }, [workspaces.length, fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      const found = workspaces.find((ws) => ws.name === decodeURIComponent(workspaceSlug));
      if (found) setCurrentWorkspace(found);
    }
  }, [currentWorkspace, workspaces, workspaceSlug, setCurrentWorkspace]);

  const wsId = currentWorkspace?.id;
  const permissions = usePermissions(currentWorkspace?.role);

  const categoryIdParam = searchParams.get('categoryId');

  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<number | null>(null);
  const [newDocCategoryId, setNewDocCategoryId] = useState<number | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    category: Category;
    position: { x: number; y: number };
  } | null>(null);

  // Import/Export modal
  const [showImportExport, setShowImportExport] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const tagsQuery = useQuery({
    queryKey: ['workspace-tags', wsId],
    queryFn: () =>
      apiFetch<TagsResponse>(
        `/workspaces/${wsId}/tags`,
      ),
    enabled: !!wsId,
  });

  const workspaceTags: Tag[] = tagsQuery.data?.tags ?? [];

  const categoriesQuery = useQuery({
    queryKey: ['categories', wsId],
    queryFn: () =>
      apiFetch<CategoriesTreeResponse>(
        `/workspaces/${wsId}/categories`,
      ),
    enabled: !!wsId,
  });

  const documentsQuery = useQuery({
    queryKey: [
      'documents',
      wsId,
      categoryIdParam,
      sortField,
      sortOrder,
      searchQuery,
      selectedTag,
      page,
      pageSize,
    ],
    queryFn: () => {
      const qp = new URLSearchParams();
      qp.set('page', String(page));
      qp.set('limit', String(pageSize));
      qp.set('sort', sortField);
      qp.set('order', sortOrder);
      if (categoryIdParam) qp.set('categoryId', categoryIdParam);
      if (searchQuery.trim()) qp.set('q', searchQuery.trim());
      if (selectedTag) qp.set('tag', selectedTag);
      return apiFetch<DocumentsResponse>(
        `/workspaces/${wsId}/documents?${qp.toString()}`,
      );
    },
    enabled: !!wsId,
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [categoryIdParam, sortField, sortOrder, searchQuery, selectedTag, pageSize]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField],
  );


  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const categories = categoriesQuery.data?.categories ?? [];
  const documents: Document[] = documentsQuery.data?.documents ?? [];
  const totalPages = documentsQuery.data
    ? Math.ceil(documentsQuery.data.total / pageSize)
    : 0;

  const categoryMap = buildCategoryMap(categories);

  // Breadcrumb for current category
  const currentCategoryBreadcrumb = (() => {
    if (!categoryIdParam || categories.length === 0) return null;
    const targetNumId = Number(categoryIdParam);
    const path: string[] = [];
    function findPath(cats: Category[], targetId: number): boolean {
      for (const cat of cats) {
        if (cat.id === targetId) {
          path.push(cat.name);
          return true;
        }
        if (cat.children && cat.children.length > 0) {
          path.push(cat.name);
          if (findPath(cat.children, targetId)) return true;
          path.pop();
        }
      }
      return false;
    }
    findPath(categories, targetNumId);
    return path.length > 0 ? path : null;
  })();

  const workspaceName = currentWorkspace?.name ?? '워크스페이스';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {/* ================================================================ */}
      {/* Category Sidebar                                                 */}
      {/* ================================================================ */}
      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '28px 32px 32px' }}>

          {/* -------------------------------------------------------------- */}
          {/* Page Header                                                     */}
          {/* -------------------------------------------------------------- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-heading, var(--font-h))',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {workspaceName}
              </h1>

              {/* Breadcrumb */}
              {currentCategoryBreadcrumb && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 6,
                    fontSize: '13px',
                    color: 'var(--text-3)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/${workspaceSlug}/doc`)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      padding: 0,
                    }}
                  >
                    전체
                  </button>
                  {currentCategoryBreadcrumb.map((segment, idx) => (
                    <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                      <span
                        style={{
                          fontWeight:
                            idx === currentCategoryBreadcrumb.length - 1
                              ? 500
                              : 400,
                          color:
                            idx === currentCategoryBreadcrumb.length - 1
                              ? 'var(--text-2)'
                              : 'var(--text-3)',
                        }}
                      >
                        {segment}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {!currentCategoryBreadcrumb && documentsQuery.data && (
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                  {documentsQuery.data.total}개 문서
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Import/Export */}
              {permissions.canImportExport && (
                <button
                  type="button"
                  onClick={() => setShowImportExport(true)}
                  style={btnSecondary}
                >
                  <Download size={14} />
                  가져오기 / 내보내기
                </button>
              )}

              {/* New document */}
              {permissions.canCreateDocument && (
                <button
                  type="button"
                  onClick={() => {
                    setNewDocCategoryId(categoryIdParam ? Number(categoryIdParam) : null);
                    setShowNewDocModal(true);
                  }}
                  style={btnPrimary}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  새 문서
                </button>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Toolbar: Search / Sort / Tag filter / View toggle              */}
          {/* -------------------------------------------------------------- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {/* Search */}
            <div
              style={{
                flex: 1,
                maxWidth: 360,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: 'var(--text-3)', flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문서 제목, 내용 검색..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  flex: 1,
                  fontSize: '13.5px',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Sort dropdown */}
            <select
              value={`${sortField}:${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(':') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
            >
              <option value="updatedAt:desc">수정일 (최신)</option>
              <option value="updatedAt:asc">수정일 (오래된)</option>
              <option value="createdAt:desc">생성일 (최신)</option>
              <option value="createdAt:asc">생성일 (오래된)</option>
              <option value="title:asc">이름 (오름차순)</option>
              <option value="title:desc">이름 (내림차순)</option>
            </select>

            {/* Tag filter */}
            {workspaceTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">전체 태그</option>
                {workspaceTags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
            )}

            {/* Order toggle */}
            <Tooltip label={sortOrder === 'asc' ? '���름차순' : '내림차��'}>
              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  transition: 'all .12s',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{
                    transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                    transition: 'transform .15s ease',
                  }}
                >
                  <path d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </Tooltip>

            {/* View toggle */}
            <div
              style={{
                display: 'flex',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: 'var(--surface)',
              }}
            >
              <Tooltip label="그리드" position="top">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 32,
                    border: 'none',
                    cursor: 'pointer',
                    color: viewMode === 'grid' ? 'var(--text)' : 'var(--text-3)',
                    background:
                      viewMode === 'grid' ? 'var(--surface-2, #F1F0EC)' : 'transparent',
                    transition: 'all .12s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip label="리스트" position="top">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 32,
                    border: 'none',
                    cursor: 'pointer',
                    color: viewMode === 'list' ? 'var(--text)' : 'var(--text-3)',
                    background:
                      viewMode === 'list' ? 'var(--surface-2, #F1F0EC)' : 'transparent',
                    transition: 'all .12s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </Tooltip>
            </div>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ padding: '5px 24px 5px 8px', fontSize: '12px' }}
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Loading State                                                   */}
          {/* -------------------------------------------------------------- */}
          {documentsQuery.isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 0',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '2.5px solid var(--accent)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  marginBottom: 16,
                }}
              />
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                문서를 불러오는 중...
              </p>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Error State                                                     */}
          {/* -------------------------------------------------------------- */}
          {documentsQuery.error && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(220,38,38,.2)',
                background: 'var(--red-lt, #FFF1F2)',
                color: 'var(--red, #DC2626)',
                fontSize: 13,
              }}
            >
              문서 목록을 불러오는 중 오류가 발생했습니다.
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Empty State                                                     */}
          {/* -------------------------------------------------------------- */}
          {!documentsQuery.isLoading &&
            !documentsQuery.error &&
            documents.length === 0 && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg, 14px)',
                  padding: '64px 32px',
                  textAlign: 'center',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  style={{ color: 'var(--text-3)', margin: '0 auto 16px', display: 'block', opacity: 0.5 }}
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading, var(--font-h))',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 6,
                  }}
                >
                  {searchQuery ? '검색 결과가 없습니다' : '문서가 없습니다'}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-3)',
                    marginBottom: 20,
                  }}
                >
                  {searchQuery
                    ? '다른 키워드로 검색해보세요.'
                    : '새 문서를 작성하여 지식을 기록하세요.'}
                </p>
                {!searchQuery && permissions.canCreateDocument && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewDocCategoryId(categoryIdParam ? Number(categoryIdParam) : null);
                      setShowNewDocModal(true);
                    }}
                    style={btnPrimary}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    새 문서 작성
                  </button>
                )}
              </div>
            )}

          {/* -------------------------------------------------------------- */}
          {/* Grid View                                                       */}
          {/* -------------------------------------------------------------- */}
          {!documentsQuery.isLoading &&
            documents.length > 0 &&
            viewMode === 'grid' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 16,
                }}
              >
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() =>
                      router.push(`/${workspaceSlug}/doc/${doc.id}`)
                    }
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg, 14px)',
                      padding: 20,
                      cursor: 'pointer',
                      transition: 'all .2s',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    {/* Doc icon */}
                    <div style={{ marginBottom: 12 }}>
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={1.5}
                      >
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading, var(--font-h))',
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: 8,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.title}
                    </h3>

                    {/* Excerpt (first ~120 chars of content) */}
                    {doc.content && (
                      <p
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--text-3)',
                          lineHeight: 1.55,
                          marginBottom: 12,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {doc.content.slice(0, 120)}
                      </p>
                    )}

                    {/* Category badge */}
                    {doc.categoryId && (
                      <div style={{ marginBottom: 10 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-2, #F1F0EC)',
                            fontSize: '11px',
                            color: 'var(--text-3)',
                            fontWeight: 500,
                          }}
                        >
                          {categoryMap.get(doc.categoryId) ?? doc.categoryId}
                        </span>
                      </div>
                    )}

                    {/* Meta */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '11.5px',
                        color: 'var(--text-3)',
                      }}
                    >
                      <span>{formatRelativeDate(doc.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

          {/* -------------------------------------------------------------- */}
          {/* List View                                                       */}
          {/* -------------------------------------------------------------- */}
          {!documentsQuery.isLoading &&
            documents.length > 0 &&
            viewMode === 'list' && (
              <div>
                {/* Table header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 120px 100px',
                    gap: 12,
                    padding: '10px 16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--text-3)',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('title')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      letterSpacing: 'inherit',
                      textTransform: 'inherit' as const,
                      color: sortField === 'title' ? 'var(--text-2)' : 'var(--text-3)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    이름
                    {sortField === 'title' && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        style={{
                          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                          transition: 'transform .15s',
                        }}
                      >
                        <path d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  <span>카테고리</span>
                  <button
                    type="button"
                    onClick={() => handleSort('updatedAt')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      letterSpacing: 'inherit',
                      textTransform: 'inherit' as const,
                      color: sortField === 'updatedAt' ? 'var(--text-2)' : 'var(--text-3)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    수정일
                    {sortField === 'updatedAt' && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        style={{
                          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                          transition: 'transform .15s',
                        }}
                      >
                        <path d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  <span>작성자</span>
                </div>

                {/* Rows */}
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() =>
                      router.push(`/${workspaceSlug}/doc/${doc.id}`)
                    }
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 120px 100px',
                      gap: 12,
                      alignItems: 'center',
                      width: '100%',
                      padding: '14px 16px',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      marginBottom: 6,
                      cursor: 'pointer',
                      transition: 'all .15s',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    {/* Title cell */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-3)"
                        strokeWidth={1.5}
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

                    {/* Category badge */}
                    <div>
                      {doc.categoryId ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-2, #F1F0EC)',
                            fontSize: '11px',
                            color: 'var(--text-3)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {categoryMap.get(doc.categoryId) ?? doc.categoryId}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          -
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {formatRelativeDate(doc.updatedAt)}
                    </span>

                    {/* Author */}
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.authorId}
                    </span>
                  </button>
                ))}
              </div>
            )}

          {/* -------------------------------------------------------------- */}
          {/* Pagination                                                      */}
          {/* -------------------------------------------------------------- */}
          {/* Footer: count + load more */}
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 12, marginTop: 24,
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {documents.length} / {documentsQuery.data?.total ?? 0}건
            </p>
            {totalPages > 1 && page < totalPages && (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '9px 32px', fontSize: 13, fontWeight: 500,
                  color: 'var(--text-2)', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                }}
              >
                더보기
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ================================================================ */}
      {/* Context Menu                                                      */}
      {/* ================================================================ */}
      {contextMenu && (
        <FolderContextMenu
          category={contextMenu.category}
          workspaceSlug={workspaceSlug}
          workspaceId={wsId ?? 0}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onNewDoc={() => {
            setNewDocCategoryId(contextMenu.category.id);
            setShowNewDocModal(true);
          }}
          onRefresh={() => void categoriesQuery.refetch()}
        />
      )}

      {/* ================================================================ */}
      {/* Modals                                                            */}
      {/* ================================================================ */}
      <NewDocModal
        open={showNewDocModal}
        onClose={() => setShowNewDocModal(false)}
        workspaceSlug={workspaceSlug}
        workspaceId={currentWorkspace?.id ?? 0}
        categories={flattenCategories(categories).map((c) => ({ id: c.id, name: c.path }))}
      />
      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        workspaceId={wsId ?? 0}
        categories={categories}
        defaultParentId={newFolderParentId}
        onCreated={() => void categoriesQuery.refetch()}
      />
      {wsId && (
        <ImportExportModal
          open={showImportExport}
          onClose={() => {
            setShowImportExport(false);
            void documentsQuery.refetch();
            void categoriesQuery.refetch();
          }}
          workspaceId={wsId}
          workspaceSlug={workspaceSlug}
          currentCategoryId={categoryIdParam ? Number(categoryIdParam) : undefined}
        />
      )}

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
