'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';
import { CategoryTree, type Category as TreeCategory } from './category-tree';
import { apiFetch } from '../lib/api';
import type { Category as FlatCategory, CategoriesResponse } from '../lib/types';

/* ─── helpers ─── */

function extractWorkspaceSlug(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first !== undefined) {
    const reserved = new Set(['login', 'register', 'verify-email', 'invite']);
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

const NAV_ITEMS: NavDef[] = [
  { key: 'docs', label: '문서', path: 'docs', icon: docsIcon },
  { key: 'trash', label: '휴지통', path: 'trash', icon: trashIcon },
  { key: 'members', label: '멤버', path: 'settings/members', icon: membersIcon },
  { key: 'graph', label: '그래프', path: 'graph', icon: graphIcon },
  { key: 'settings', label: '설정', path: 'settings', icon: settingsIcon },
];

/* ─── T015: Workspace Selector ─── */

function WorkspaceSelector({ slug }: { slug: string | null }) {
  const { workspaces } = useWorkspaceStore();
  const current = workspaces.find((ws) => ws.slug === slug);

  return (
    <Link
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        margin: '8px 10px',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </Link>
  );
}

/* ─── T016: Search Bar ─── */

function SearchBar() {
  return (
    <div style={{ padding: '0 10px', marginBottom: '8px' }}>
      <div
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

function FolderTreeSection({ slug }: { slug: string }) {
  const [categories, setCategories] = useState<TreeCategory[]>([]);
  const { workspaces } = useWorkspaceStore();
  const wsId = workspaces.find((ws) => ws.slug === slug)?.id;

  useEffect(() => {
    if (!wsId) return;
    apiFetch<CategoriesResponse>(`/workspaces/${wsId}/categories`)
      .then((res) => setCategories(buildCategoryTree(res.categories)))
      .catch(() => setCategories([]));
  }, [wsId]);

  return (
    <div style={{ padding: '0 6px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 8px 4px', fontSize: '11px', fontWeight: 600,
        color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
      }}>
        <span>문서</span>
      </div>
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
        const isActive = pathname === href || pathname.startsWith(href + '/');

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

/* ─── T019: User Profile Footer ─── */

function UserFooter() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const pathname = usePathname();
  const slug = extractWorkspaceSlug(pathname);
  const currentWs = workspaces.find((ws) => ws.slug === slug);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)', fontSize: '11px', fontWeight: 600, flexShrink: 0,
      }}>
        {user?.name?.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {user?.name ?? '사용자'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          {currentWs?.role ? { owner: '소유자', admin: '관리자', editor: '편집자', viewer: '뷰어' }[currentWs.role] ?? currentWs.role : ''}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleLogout()}
        aria-label="로그아웃"
        style={{
          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Main Sidebar ─── */

export function Sidebar() {
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
      {slug && <SearchBar />}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* T017: Folder Tree */}
        {slug && <FolderTreeSection slug={slug} />}

        {/* Divider */}
        {slug && <div style={{ height: '1px', background: 'var(--border)', margin: '8px 14px' }} />}

        {/* T018: Navigation */}
        {slug && <NavSection slug={slug} />}
      </div>

      {/* T019: User Footer */}
      <UserFooter />
    </aside>
  );
}
