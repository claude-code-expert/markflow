'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '../stores/auth-store';
import { useEditorStore } from '../stores/editor-store';
import { useSidebarStore } from '../stores/sidebar-store';

function SaveStatusIndicator() {
  const saveStatus = useEditorStore((s) => s.saveStatus);

  if (saveStatus === 'saving') {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>저장 중...</span>;
  }
  if (saveStatus === 'saved') {
    return (
      <span style={{ color: 'var(--green)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        저장됨
      </span>
    );
  }
  if (saveStatus === 'error') {
    return <span style={{ color: 'var(--red)', fontSize: '12px' }}>저장 실패</span>;
  }
  return null;
}

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs: Array<{ label: string; href?: string }> = [];

  const first = segments[0];
  if (first !== undefined) {
    crumbs.push({ label: first, href: `/${first}` });
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
    crumbs.push({ label: pageLabels[second] ?? second });
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
          <span style={i === crumbs.length - 1 ? { color: 'var(--text)', fontWeight: 500 } : undefined}>
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);
  const pathname = usePathname();
  const isEditorPage = /\/docs\/[^/]+$/.test(pathname);

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
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
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
        {isEditorPage && <SaveStatusIndicator />}

        <button
          aria-label="검색 (⌘K)"
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

        {user && (
          <div
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
            }}
            aria-label={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
