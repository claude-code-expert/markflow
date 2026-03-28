'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspaceStore } from '../stores/workspace-store';
import { CategoryTree, type Category as TreeCategory } from './category-tree';
import { apiFetch } from '../lib/api';
import type { Category as FlatCategory, CategoriesResponse } from '../lib/types';

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

/* ─── nav config ─── */

interface NavDef {
  key: string;
  label: string;
  path: string; // appended to /{slug}/
  icon: React.ReactNode;
}

const docsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const trashIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const membersIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const graphIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="18" cy="6" r="3" />
    <line x1="8.7" y1="7.5" x2="15.3" y2="16.5" /><line x1="15.3" y1="7.5" x2="8.7" y2="16.5" />
  </svg>
);
const settingsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const themeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 000 20 4 4 0 004-4v-1a2 2 0 012-2h1a4 4 0 004-4 10 10 0 00-10-10z" />
    <circle cx="8" cy="10" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="16" cy="10" r="1" />
  </svg>
);
const embedIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);

const NAV_ITEMS: NavDef[] = [
  { key: 'docs', label: '문서', path: 'docs', icon: docsIcon },
  { key: 'trash', label: '휴지통', path: 'trash', icon: trashIcon },
  { key: 'members', label: '멤버', path: 'settings/members', icon: membersIcon },
  { key: 'graph', label: '그래프', path: 'graph', icon: graphIcon },
  { key: 'theme', label: 'CSS 테마', path: 'settings/theme', icon: themeIcon },
  { key: 'embed', label: '임베드 연동', path: 'settings/embed', icon: embedIcon },
  { key: 'settings', label: '설정', path: 'settings', icon: settingsIcon },
];

/* ─── T015: Workspace Selector ─── */

function WorkspaceSelector({ slug }: { slug: string | null }) {
  const { workspaces, fetchWorkspaces } = useWorkspaceStore();
  const current = workspaces.find((ws) => ws.slug === slug);
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
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
        }}>
          {current ? current.name.charAt(0).toUpperCase() : 'M'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13.5px', fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {current?.name ?? 'MarkFlow'}
          </div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
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
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/${ws.slug}/docs`}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: 'inherit',
                background: ws.slug === slug ? 'var(--accent-2)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = ws.slug === slug ? 'var(--accent-2)' : 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ws.slug === slug ? 'var(--accent-2)' : 'transparent'; }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '5px',
                background: ws.slug === slug ? 'var(--accent)' : 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ws.slug === slug ? '#fff' : 'var(--text-2)',
                fontSize: '11px', fontWeight: 700, flexShrink: 0,
              }}>
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: ws.slug === slug ? 600 : 400,
                  color: ws.slug === slug ? 'var(--accent)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>
                  {ws.name}
                </div>
              </div>
              {ws.slug === slug && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </Link>
          ))}

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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{ fontSize: '13px', color: 'var(--text-3)', flex: 1 }}>문서 검색...</span>
        <span style={{
          fontSize: '11px', color: 'var(--text-3)', background: 'var(--surface)',
          padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)',
        }}>
          ⌘K
        </span>
      </div>
    </div>
  );
}

/* ─── T017: Folder Tree Section ─── */

function buildCategoryTree(flat: FlatCategory[]): TreeCategory[] {
  const map = new Map<string, TreeCategory>();
  const roots: TreeCategory[] = [];

  for (const c of flat) {
    map.set(c.id, { id: c.id, name: c.name, parentId: c.parentId, children: [] });
  }
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId) {
      const parent = map.get(c.parentId);
      if (parent) { parent.children.push(node); continue; }
    }
    roots.push(node);
  }
  return roots;
}

function NewFolderInline({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{ padding: '4px 8px 8px', display: 'flex', gap: '4px' }}>
      <input
        autoFocus
        placeholder="폴더 이름..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) onSubmit(name.trim());
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          flex: 1, padding: '5px 8px', fontSize: '12.5px', borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--accent)', outline: 'none', fontFamily: 'inherit',
          background: 'var(--surface)',
        }}
      />
      <button
        onClick={() => name.trim() && onSubmit(name.trim())}
        style={{
          padding: '5px 8px', fontSize: '11px', fontWeight: 500,
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        생성
      </button>
    </div>
  );
}

function FolderTreeSection({ slug }: { slug: string }) {
  const [categories, setCategories] = useState<TreeCategory[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const { workspaces } = useWorkspaceStore();
  const wsId = workspaces.find((ws) => ws.slug === slug)?.id;

  const loadCategories = useCallback(() => {
    if (!wsId) return;
    apiFetch<CategoriesResponse>(`/workspaces/${wsId}/categories`)
      .then((res) => setCategories(buildCategoryTree(res.categories)))
      .catch(() => setCategories([]));
  }, [wsId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateFolder = async (name: string) => {
    if (!wsId) return;
    try {
      await apiFetch(`/workspaces/${wsId}/categories`, {
        method: 'POST',
        body: { name },
      });
      loadCategories();
      setShowNewFolder(false);
    } catch {
      // silently fail
    }
  };

  const pathname = usePathname();
  const docsHref = `/${slug}/docs`;
  const isDocsActive = pathname !== null && (pathname === docsHref || pathname.startsWith(docsHref + '/'));

  return (
    <div style={{ padding: '0 6px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 8px 4px', fontSize: '11px', fontWeight: 600,
        color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
      }}>
        <span>폴더</span>
        <button
          onClick={() => setShowNewFolder(true)}
          aria-label="새 폴더"
          title="새 폴더"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 'var(--radius-sm)',
            color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Inline new folder input */}
      {showNewFolder && (
        <NewFolderInline
          onSubmit={handleCreateFolder}
          onCancel={() => setShowNewFolder(false)}
        />
      )}
      {/* 전체 문서 링크 */}
      <Link
        href={docsHref}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', borderRadius: 'var(--radius-sm)',
          textDecoration: 'none', fontSize: '13.5px',
          color: isDocsActive ? 'var(--accent)' : 'var(--text-2)',
          fontWeight: isDocsActive ? 500 : 400,
          background: isDocsActive ? 'var(--accent-2)' : 'transparent',
        }}
      >
        <span style={{ opacity: isDocsActive ? 1 : 0.65, fontSize: '15px' }}>🗂</span>
        전체 문서
      </Link>
      {/* 카테고리 트리 */}
      {categories.length > 0 ? (
        <CategoryTree
          categories={categories}
          workspaceSlug={slug}
        />
      ) : (
        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-3)' }}>
          폴더가 없습니다
        </div>
      )}
    </div>
  );
}

/* ─── T018: Navigation Items ─── */

function NavSection({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav style={{ padding: '4px 6px' }}>
      <div style={{
        padding: '8px 8px 4px', fontSize: '11px', fontWeight: 600,
        color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
      }}>
        탐색
      </div>
      {NAV_ITEMS.map((item) => {
        const href = `/${slug}/${item.path}`;
        const isActive = pathname !== null && (pathname === href || pathname.startsWith(href + '/'));

        return (
          <Link
            key={item.key}
            href={href}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 12px', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontSize: '13.5px',
              color: isActive ? 'var(--accent)' : 'var(--text-2)',
              fontWeight: isActive ? 500 : 400,
              background: isActive ? 'var(--accent-2)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
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

      {/* Scrollable content — Folder tree only */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {slug && <FolderTreeSection slug={slug} />}
      </div>

    </aside>
  );
}
