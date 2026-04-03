'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowDownAZ, ArrowDownWideNarrow, Briefcase, FileText, Search, FolderOpen, Command, ChevronDown, Plus, Check, LayoutGrid,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace-store';
import { CategoryTree, type Category as TreeCategory, type TreeDocument } from './category-tree';
import { apiFetch } from '../lib/api';
import { FolderContextMenu } from './folder-context-menu';
import { DocContextMenu } from './doc-context-menu';

/* ─── helpers ─── */

function extractWorkspaceSlug(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first !== undefined) {
    const reserved = new Set(['login', 'register', 'verify-email', 'invite', 'workspaces']);
    if (!reserved.has(first)) return first;
  }
  return null;
}


/* ─── T015: Workspace Selector ─── */

function WorkspaceSelector({ slug }: { slug: string | null }) {
  const { workspaces, fetchWorkspaces } = useWorkspaceStore();
  const decodedSlug = slug ? decodeURIComponent(slug) : null;
  const current = workspaces.find((ws) => ws.name === decodedSlug);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 워크스페이스 목록이 비어있으면 fetch
  useEffect(() => {
    if (workspaces.length === 0) {
      void fetchWorkspaces();
    }
  }, [workspaces.length, fetchWorkspaces]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', margin: '8px 10px' }}>
      {/* 현재 워크스페이스 버튼 */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: open ? 'var(--surface-2)' : 'transparent',
          cursor: 'pointer',
          color: 'inherit',
          transition: 'background 0.15s',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--surface-2)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: current ? 'var(--accent)' : 'var(--surface-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: current ? '#fff' : 'var(--text-2)', flexShrink: 0,
        }}>
          <Briefcase size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13.5px', fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {current?.name ?? '워크스페이스 선택'}
          </div>
        </div>
        <ChevronDown
          size={14}
          color="var(--text-3)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {/* 워크스페이스 드롭다운 목록 */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          maxHeight: '240px',
          overflowY: 'auto',
          padding: '4px',
        }}>
          {workspaces.map((ws) => {
            const isSelected = ws.name === decodedSlug;
            return (
            <Link
              key={ws.id}
              href={`/${encodeURIComponent(ws.name)}/doc`}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: 'inherit',
                background: isSelected ? 'var(--accent-2)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isSelected ? 'var(--accent-2)' : 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--accent-2)' : 'transparent'; }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '5px',
                background: isSelected ? 'var(--accent)' : 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isSelected ? '#fff' : 'var(--text-2)',
                flexShrink: 0,
              }}>
                <Briefcase size={12} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? 'var(--accent)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>
                  {ws.name}
                </div>
              </div>
              {isSelected && (
                <Check size={14} color="var(--accent)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              )}
            </Link>
            );
          })}

          {/* 워크스페이스 목록 전체 보기 */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px' }}>
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                textDecoration: 'none', fontSize: '12px', color: 'var(--text-3)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <LayoutGrid size={12} />
              전체 워크스페이스
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── T016: Search Bar ─── */

function SearchBar({ onClick }: { onClick?: () => void }) {
  return (
    <div style={{ padding: '0 10px', marginBottom: '8px' }}>
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        }}
      >
        <Search size={14} color="var(--text-3)" />
        <span style={{ fontSize: '13px', color: 'var(--text-3)', flex: 1 }}>문서 검색...</span>
        <span style={{
          fontSize: '11px', color: 'var(--text-3)', background: 'var(--surface)',
          padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)',
          display: 'inline-flex', alignItems: 'center', gap: '2px',
        }}>
          <Command size={11} />K
        </span>
      </div>
    </div>
  );
}

/* ─── T017: Folder Tree Section ─── */

type FolderSort = 'name' | 'date';

const INDENT_PX = 16;
const BASE_PL = 10;

interface CategoryTreeResponse {
  categories: TreeCategory[];
  uncategorized: TreeDocument[];
}

function NewFolderInline({ onSubmit, onCancel }: { onSubmit: (name: string) => Promise<void> | void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim());
    } finally {
      setSubmitting(false);
    }
  }, [name, submitting, onSubmit]);

  return (
    <div style={{ padding: '4px 8px 8px', display: 'flex', gap: '4px' }}>
      <input
        autoFocus
        placeholder="폴더 이름..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        disabled={submitting}
        style={{
          flex: 1, padding: '5px 8px', fontSize: '12.5px', borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--accent)', outline: 'none', fontFamily: 'inherit',
          background: 'var(--surface)',
        }}
      />
      <button
        onClick={() => void handleSubmit()}
        disabled={submitting}
        style={{
          padding: '5px 8px', fontSize: '11px', fontWeight: 500,
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 'var(--radius-sm)', cursor: submitting ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: submitting ? 0.6 : 1,
        }}
      >
        생성
      </button>
    </div>
  );
}

function latestUpdatedAt(cat: TreeCategory): string {
  const dates = cat.documents.map((d) => d.updatedAt);
  for (const child of cat.children) {
    const childLatest = latestUpdatedAt(child);
    if (childLatest) dates.push(childLatest);
  }
  return dates.length > 0 ? dates.sort().reverse()[0]! : '';
}

function sortCategories(cats: TreeCategory[], sort: FolderSort): TreeCategory[] {
  return [...cats].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'ko');
    return latestUpdatedAt(b).localeCompare(latestUpdatedAt(a));
  }).map((cat) => ({
    ...cat,
    children: sortCategories(cat.children, sort),
  }));
}

function FolderTreeSection({ slug }: { slug: string }) {
  const [categories, setCategories] = useState<TreeCategory[]>([]);
  const [uncategorized, setUncategorized] = useState<TreeDocument[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderSort, setFolderSort] = useState<FolderSort>('name');
  const { workspaces } = useWorkspaceStore();
  const wsId = workspaces.find((ws) => ws.name === decodeURIComponent(slug))?.id;
  const pathname = usePathname();

  // Context menu state
  const [folderMenu, setFolderMenu] = useState<{ category: TreeCategory; pos: { x: number; y: number } } | null>(null);
  const [docMenu, setDocMenu] = useState<{ doc: TreeDocument; pos: { x: number; y: number } } | null>(null);

  const handleFolderContextMenu = useCallback((e: React.MouseEvent, category: TreeCategory) => {
    e.preventDefault();
    setDocMenu(null);
    setFolderMenu({ category, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const handleDocContextMenu = useCallback((e: React.MouseEvent, doc: TreeDocument) => {
    e.preventDefault();
    setFolderMenu(null);
    setDocMenu({ doc, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const loadData = useCallback(() => {
    if (!wsId) return;
    apiFetch<CategoryTreeResponse>(`/workspaces/${wsId}/categories/tree`)
      .then((res) => {
        setCategories(res.categories);
        setUncategorized(res.uncategorized);
      })
      .catch(() => {
        setCategories([]);
        setUncategorized([]);
      });
  }, [wsId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // pathname 변경 시 refetch (문서 저장/생성 후 갱신)
  useEffect(() => {
    loadData();
  }, [pathname, loadData]);

  const handleCreateFolder = async (name: string) => {
    if (!wsId) return;
    try {
      await apiFetch(`/workspaces/${wsId}/categories`, {
        method: 'POST',
        body: { name },
      });
      loadData();
      setShowNewFolder(false);
    } catch {
      // silently fail
    }
  };

  const docsHref = `/${slug}/doc`;
  const isDocsActive = pathname !== null && (pathname === docsHref || pathname.startsWith(docsHref + '/'));

  // 현재 열린 문서 ID 추출
  const docIdMatch = pathname?.match(/\/doc\/([^/]+)/);
  const currentDocId = docIdMatch?.[1] ? Number(docIdMatch[1]) : null;

  const sortedCategories = sortCategories(categories, folderSort);

  return (
    <div style={{ padding: '0 6px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 8px 4px', fontSize: '11px', fontWeight: 600,
        color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
      }}>
        <span>폴더</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* 정렬 토글 */}
          <button
            onClick={() => setFolderSort((s) => (s === 'name' ? 'date' : 'name'))}
            aria-label={folderSort === 'name' ? '날짜순 정렬' : '이름순 정렬'}
            title={folderSort === 'name' ? '날짜순 정렬' : '이름순 정렬'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 'var(--radius-sm)',
              color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            {folderSort === 'name'
              ? <ArrowDownAZ size={12} strokeWidth={2.5} />
              : <ArrowDownWideNarrow size={12} strokeWidth={2.5} />}
          </button>
          {/* 폴더 추가 */}
          <button
            onClick={() => setShowNewFolder((v) => !v)}
            aria-label={showNewFolder ? '폴더 입력 닫기' : '폴더 만들기'}
            title={showNewFolder ? '폴더 입력 닫기' : '폴더 만들기'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 'var(--radius-sm)',
              color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer',
              transition: 'transform 0.15s ease',
              transform: showNewFolder ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            {showNewFolder ? <ChevronDown size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Inline new folder input */}
      {showNewFolder && (
        <NewFolderInline
          onSubmit={handleCreateFolder}
          onCancel={() => setShowNewFolder(false)}
        />
      )}

      {/* 전체 문서 링크 — depth 0 */}
      <Link
        href={docsHref}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: `6px 10px`, paddingLeft: `${BASE_PL}px`,
          borderRadius: 'var(--radius-sm)',
          textDecoration: 'none', fontSize: '13.5px',
          color: isDocsActive ? 'var(--accent)' : 'var(--text-2)',
          fontWeight: isDocsActive ? 500 : 400,
          background: isDocsActive ? 'var(--accent-2)' : 'transparent',
        }}
      >
        <FolderOpen size={16} style={{ opacity: isDocsActive ? 1 : 0.65, flexShrink: 0 }} />
        전체 문서
      </Link>

      {/* 미분류 문서 — depth 1 */}
      {uncategorized.length > 0 && (
        <div>
          {uncategorized.map((doc) => {
            const docHref = `/${slug}/doc/${doc.id}`;
            const isDocActive = currentDocId === doc.id;
            return (
              <Link
                key={doc.id}
                href={docHref}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px',
                  paddingLeft: `${BASE_PL + INDENT_PX}px`,
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', fontSize: '13px',
                  fontWeight: isDocActive ? 500 : 400,
                  color: isDocActive ? 'var(--accent)' : 'var(--text-2)',
                  background: isDocActive ? 'var(--accent-2)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!isDocActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isDocActive ? 'var(--accent-2)' : 'transparent'; }}
                onContextMenu={(e) => handleDocContextMenu(e, doc)}
              >
                <FileText size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                <span style={{
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {doc.title || '제목 없음'}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* 카테고리 트리 (문서 포함) */}
      {sortedCategories.length > 0 && (
        <CategoryTree
          categories={sortedCategories}
          workspaceSlug={slug}
          currentDocId={currentDocId}
          onContextMenu={handleFolderContextMenu}
          onDocContextMenu={handleDocContextMenu}
          onReorder={(orderedIds) => {
            if (!wsId) return;
            void apiFetch(`/workspaces/${wsId}/categories/reorder`, {
              method: 'PUT',
              body: { orderedIds },
            }).then(() => loadData());
          }}
          basePl={BASE_PL}
          indentPx={INDENT_PX}
        />
      )}

      {/* Folder context menu */}
      {folderMenu && wsId && (
        <FolderContextMenu
          category={folderMenu.category}
          workspaceSlug={slug}
          workspaceId={wsId}
          position={folderMenu.pos}
          onClose={() => setFolderMenu(null)}
          onRefresh={loadData}
        />
      )}

      {/* Document context menu */}
      {docMenu && wsId && (
        <DocContextMenu
          doc={docMenu.doc}
          workspaceSlug={slug}
          workspaceId={wsId}
          position={docMenu.pos}
          onClose={() => setDocMenu(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

/* ─── Main Sidebar ─── */

export function Sidebar({ onSearchClick }: { onSearchClick?: () => void } = {}) {
  const pathname = usePathname();
  const slug = extractWorkspaceSlug(pathname);

  return (
    <aside
      style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* T015: Workspace Selector */}
      <WorkspaceSelector slug={slug} />

      {/* T016: Search Bar */}
      {slug && <SearchBar onClick={onSearchClick} />}

      {/* Scrollable content — Document tree */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {slug && <FolderTreeSection slug={slug} />}
      </div>

    </aside>
  );
}
