'use client';

import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { apiFetch } from '../../../../../lib/api';
import { useToastStore } from '../../../../../stores/toast-store';

const PRESETS = ['default', 'github', 'notion', 'dark', 'academic'] as const;

const PRESET_CSS: Record<string, string> = {
  default: `--mf-font-body: 'DM Sans', sans-serif;\n--mf-color-heading: #1a1916;\n--mf-line-height: 1.75;\n--mf-max-width: 720px;`,
  github: `--mf-font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n--mf-color-heading: #24292e;\n--mf-color-link: #0366d6;\n--mf-max-width: 800px;`,
  notion: `--mf-font-body: ui-sans-serif, 'Segoe UI', sans-serif;\n--mf-color-heading: #37352f;\n--mf-color-body: #37352f;\n--mf-line-height: 1.9;\n--mf-max-width: 700px;`,
  dark: `--mf-color-heading: #f1f0ec;\n--mf-color-body: #b5b3aa;\n--mf-color-code-bg: #1a1917;`,
  academic: `--mf-font-body: 'Georgia', serif;\n--mf-color-heading: #1a1a1a;\n--mf-line-height: 1.85;\n--mf-max-width: 680px;`,
};

export default function ThemeSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const [preset, setPreset] = useState('default');
  const [css, setCss] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) void loadTheme();
  }, [currentWorkspace]);

  const loadTheme = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ preset: string; css: string }>(`/workspaces/${currentWorkspace.id}/theme`);
      setPreset(res.preset);
      setCss(res.css);
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (p: string) => {
    setPreset(p);
    setCss(PRESET_CSS[p] ?? '');
  };

  const handleValidate = () => {
    // Simple client-side check: all properties start with --mf-
    const lines = css.split(';').map((l) => l.trim()).filter(Boolean);
    const invalid = lines.filter((l) => {
      const colonIdx = l.indexOf(':');
      if (colonIdx <= 0) return true;
      return !l.slice(0, colonIdx).trim().startsWith('--mf-');
    });
    if (invalid.length === 0) {
      addToast({ message: 'CSS 유효성 검사 통과', type: 'success' });
    } else {
      addToast({ message: `허용되지 않는 속성: ${invalid.map((l) => l.split(':')[0]?.trim()).join(', ')}`, type: 'error' });
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace) return;
    setSaving(true);
    try {
      await apiFetch(`/workspaces/${currentWorkspace.id}/theme`, {
        method: 'PATCH',
        body: { preset, css },
      });
      addToast({ message: '워크스페이스에 적용되었습니다', type: 'success' });
    } catch {
      addToast({ message: 'CSS 저장에 실패했습니다', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-3)' }}>로딩 중...</div>;

  return (
    <div style={{ padding: '36px 40px', maxWidth: '700px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>CSS 테마 시스템</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '32px' }}>
        워크스페이스 단위로 문서 프리뷰 CSS를 커스터마이징합니다. Admin 이상만 편집 가능합니다.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
          프리셋 선택
        </h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => handlePresetSelect(p)}
              style={{
                padding: '9px 18px', fontSize: '13.5px', fontWeight: 500,
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${preset === p ? 'var(--accent)' : 'var(--border-2)'}`,
                background: preset === p ? 'var(--accent-2)' : 'var(--surface)',
                color: preset === p ? 'var(--accent)' : 'var(--text-2)',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* CSS Editor */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>CSS 편집기</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleValidate}
              style={{
                padding: '6px 13px', fontSize: '12.5px', fontWeight: 500,
                background: 'var(--surface)', color: 'var(--text-2)',
                border: '1.5px solid var(--border-2)', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              검증
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 13px', fontSize: '12.5px', fontWeight: 500,
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장 & 적용'}
            </button>
          </div>
        </div>
        <textarea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          rows={14}
          style={{
            width: '100%', background: 'var(--text)', color: '#e2e8f0',
            borderRadius: 'var(--radius)', padding: '20px',
            fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.7',
            minHeight: '200px', resize: 'none', border: 'none', outline: 'none',
          }}
        />
        <div style={{
          background: 'var(--amber-lt)', border: '1px solid var(--amber)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12.5px',
          marginTop: '12px', color: 'var(--text-2)',
        }}>
          Phase 1: CSS 변수(<code>--mf-*</code>) 오버라이드만 허용합니다.
        </div>
      </div>
    </div>
  );
}
