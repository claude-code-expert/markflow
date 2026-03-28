'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth-store';
import { useSidebarStore } from '../stores/sidebar-store';
import { useWorkspaceStore } from '../stores/workspace-store';

function Breadcrumb() {
  const pathname = usePathname();
  const { workspaces } = useWorkspaceStore();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs: Array<{ label: string; href?: string }> = [];

  const slug = segments[0];
  if (slug !== undefined) {
    const ws = workspaces.find((w) => w.slug === slug);
    crumbs.push({ label: ws?.name ?? slug, href: `/${slug}/settings` });
  }
  const second = segments[1];
  if (second !== undefined) {
    const pageLabels: Record<string, string> = {
      docs: '문서',
      settings: '설정',
      trash: '휴지통',
      graph: '그래프',
      members: '멤버',
    };
    const label = pageLabels[second] ?? second;
    crumbs.push({ label, href: slug ? `/${slug}/${second}` : undefined });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: 'var(--text-2)' }}>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {i > 0 && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          {c.href && i < crumbs.length - 1 ? (
            <a href={c.href} style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit'; }}
            >
              {c.label}
            </a>
          ) : (
            <span style={i === crumbs.length - 1 ? { color: 'var(--text)', fontWeight: 500 } : undefined}>
              {c.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── Settings Dropdown ─── */

const SETTINGS_MENU = [
  { label: '문서', path: 'docs', icon: '📄' },
  { label: '그래프', path: 'graph', icon: '🔗' },
  { label: '휴지통', path: 'trash', icon: '🗑' },
  { label: '멤버', path: 'settings/members', icon: '👥' },
  { label: 'CSS 테마', path: 'settings/theme', icon: '🎨' },
  { label: '임베드 연동', path: 'settings/embed', icon: '🔌' },
  { label: '설정', path: 'settings', icon: '⚙️' },
];

function SettingsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Extract workspace slug from pathname
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[0];
  const reserved = new Set(['login', 'register', 'verify-email', 'invite', 'workspaces']);
  const wsSlug = slug && !reserved.has(slug) ? slug : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!wsSlug) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        aria-label="설정"
        onClick={() => setOpen(!open)}
        style={{
          width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-sm)', border: 'none',
          background: open ? 'var(--surface-2)' : 'transparent',
          cursor: 'pointer', color: 'var(--text-3)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,.1)',
          minWidth: '180px', padding: '4px', zIndex: 100,
        }}>
          {SETTINGS_MENU.map((item) => {
            const href = `/${wsSlug}/${item.path}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={item.path}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', fontSize: '13px',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? 'var(--accent-2)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--accent-2)' : 'transparent'; }}
              >
                <span style={{ fontSize: '14px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="프로필 메뉴"
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'var(--accent-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--accent)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            right: 0,
            width: '200px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* 사용자 정보 */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{user.email}</div>
          </div>

          {/* 메뉴 항목 */}
          <div style={{ padding: '4px' }}>
            <button
              onClick={() => { setOpen(false); /* TODO: 프로필 수정 모달 */ }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                fontSize: '13px',
                color: 'var(--text-2)',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              프로필 수정
            </button>

            <button
              onClick={() => void handleLogout()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                fontSize: '13px',
                color: 'var(--red)',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-lt)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ onSearchClick }: { onSearchClick?: () => void } = {}) {
  const user = useAuthStore((s) => s.user);
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);

  return (
    <header
      style={{
        gridColumn: '1 / -1',
        height: 'var(--header-h)',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: '16px',
      }}
    >
      {/* Left: Logo + Sidebar toggle + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggleSidebar}
          aria-label="사이드바 토글"
          style={{
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-2)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <line x1="14" y1="6" x2="21" y2="6" />
            <line x1="14" y1="12" x2="21" y2="12" />
            <line x1="14" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '16px', borderRight: '1px solid var(--border)' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>M</span>
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
            MarkFlow
          </span>
        </div>

        <Breadcrumb />
      </div>

      {/* Right: Save status + Search + User avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        <SettingsDropdown />

        <button
          aria-label="검색 (⌘K)"
          onClick={onSearchClick}
          style={{
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-3)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {user && <ProfileMenu />}
      </div>
    </header>
  );
}
