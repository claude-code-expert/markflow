'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { apiFetch } from '../../../../../lib/api';
import { useToastStore } from '../../../../../stores/toast-store';
import { parseMarkdown } from '@markflow/editor';
import '@markflow/editor/styles';

const PRESETS = ['default', 'github', 'notion', 'dark', 'academic'] as const;

const PRESET_CSS: Record<string, string> = {
  default: `/* ── 타이포그래피 ── */
--mf-font-body: system-ui, -apple-system, sans-serif;
--mf-font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
--mf-line-height: 1.75;

/* ── 제목 공통 ── */
--mf-color-heading: #111827;
--mf-heading-font-weight: 700;

/* ── 제목 개별 (생략 시 공통값 사용) ── */
/* --mf-h1-color: #111827; */
/* --mf-h1-bg: transparent; */
/* --mf-h1-font-size: 2em; */
/* --mf-h1-padding: 0 0 0.3em 0; */
/* --mf-h2-color: #111827; */
/* --mf-h2-bg: transparent; */
/* --mf-h2-font-size: 1.5em; */
/* --mf-h3-color: #111827; */
/* --mf-h3-bg: transparent; */
/* --mf-h3-font-size: 1.25em; */

/* ── 본문 ── */
--mf-color-text: #374151;

/* ── 링크 ── */
--mf-color-link: #2563eb;
/* --mf-color-link-hover: #1d4ed8; */
/* --mf-link-decoration: underline; */

/* ── 인라인 코드 ── */
--mf-color-code-bg: #f3f4f6;
--mf-color-code-text: #7c3aed;

/* ── 코드 블록 (pre) ── */
--mf-color-pre-bg: #f8fafc;
--mf-color-pre-border: #e2e8f0;

/* ── 인용문 (blockquote) ── */
--mf-color-blockquote-border: #e5e7eb;
--mf-color-blockquote-text: #6b7280;

/* ── 구분선 (hr) ── */
--mf-color-hr: #e5e7eb;

/* ── 테이블 ── */
--mf-color-table-header-bg: #f3f4f6;
--mf-color-table-border: #e5e7eb;
--mf-color-table-hover: #f9fafb;

/* ── 배경/UI ── */
--mf-bg-primary: #ffffff;
--mf-bg-secondary: #f9fafb;
--mf-border-color: #e5e7eb;
--mf-accent: #2563eb;`,

  github: `/* ── 타이포그래피 ── */
--mf-font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
--mf-font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
--mf-line-height: 1.5;

/* ── 제목 공통 ── */
--mf-color-heading: #1f2328;
--mf-heading-font-weight: 600;

/* ── 제목 개별 ── */
--mf-h1-padding: 0 0 0.3em 0;
/* --mf-h1-color: #1f2328; */
/* --mf-h1-bg: transparent; */
/* --mf-h2-color: #1f2328; */
/* --mf-h3-color: #1f2328; */

/* ── 본문 ── */
--mf-color-text: #1f2328;

/* ── 링크 ── */
--mf-color-link: #0969da;
--mf-link-decoration: none;
/* --mf-color-link-hover: #0550ae; */

/* ── 인라인 코드 ── */
--mf-color-code-bg: rgba(175,184,193,0.2);
--mf-color-code-text: #e3116c;

/* ── 코드 블록 (pre) ── */
--mf-color-pre-bg: #f6f8fa;
--mf-color-pre-border: #d0d7de;

/* ── 인용문 (blockquote) ── */
--mf-color-blockquote-border: #d0d7de;
--mf-color-blockquote-text: #656d76;

/* ── 구분선 (hr) ── */
--mf-color-hr: #d8dee4;

/* ── 테이블 ── */
--mf-color-table-header-bg: #f6f8fa;
--mf-color-table-border: #d0d7de;
--mf-color-table-hover: #f6f8fa;

/* ── 배경/UI ── */
--mf-bg-primary: #ffffff;
--mf-bg-secondary: #f6f8fa;
--mf-border-color: #d0d7de;
--mf-accent: #0969da;`,

  notion: `/* ── 타이포그래피 ── */
--mf-font-body: 'Inter', ui-sans-serif, -apple-system, sans-serif;
--mf-font-mono: 'SFMono-Regular', Menlo, Consolas, monospace;
--mf-line-height: 1.9;

/* ── 제목 공통 ── */
--mf-color-heading: #37352f;
--mf-heading-font-weight: 700;

/* ── 제목 개별 ── */
--mf-h1-font-size: 1.875em;
/* --mf-h1-color: #37352f; */
/* --mf-h1-bg: transparent; */
/* --mf-h2-color: #37352f; */
/* --mf-h3-color: #37352f; */

/* ── 본문 ── */
--mf-color-text: #37352f;

/* ── 링크 ── */
--mf-color-link: #37352f;
--mf-link-decoration: underline;
/* --mf-color-link-hover: #2eaadc; */

/* ── 인라인 코드 ── */
--mf-color-code-bg: rgba(135,131,120,0.15);
--mf-color-code-text: #eb5757;

/* ── 코드 블록 (pre) ── */
--mf-color-pre-bg: #f7f6f3;
--mf-color-pre-border: transparent;

/* ── 인용문 (blockquote) ── */
--mf-color-blockquote-border: #000000;
--mf-color-blockquote-text: #37352f;

/* ── 구분선 (hr) ── */
--mf-color-hr: #e9e5df;

/* ── 테이블 ── */
--mf-color-table-header-bg: #f7f6f3;
--mf-color-table-border: #e9e5df;
--mf-color-table-hover: #f7f6f3;

/* ── 배경/UI ── */
--mf-bg-primary: #ffffff;
--mf-bg-secondary: #fbfaf8;
--mf-border-color: #e9e5df;
--mf-accent: #2eaadc;`,

  dark: `/* ── 타이포그래피 ── */
--mf-font-body: system-ui, -apple-system, sans-serif;
--mf-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--mf-line-height: 1.75;

/* ── 제목 공통 ── */
--mf-color-heading: #f9fafb;
--mf-heading-font-weight: 700;

/* ── 제목 개별 ── */
/* --mf-h1-color: #f9fafb; */
/* --mf-h1-bg: rgba(59,130,246,0.1); */
/* --mf-h2-color: #e5e7eb; */
/* --mf-h3-color: #d1d5db; */

/* ── 본문 ── */
--mf-color-text: #e5e7eb;

/* ── 링크 ── */
--mf-color-link: #60a5fa;
/* --mf-color-link-hover: #93c5fd; */
/* --mf-link-decoration: underline; */

/* ── 인라인 코드 ── */
--mf-color-code-bg: #1e293b;
--mf-color-code-text: #a78bfa;

/* ── 코드 블록 (pre) ── */
--mf-color-pre-bg: #1e293b;
--mf-color-pre-border: #374151;

/* ── 인용문 (blockquote) ── */
--mf-color-blockquote-border: #4b5563;
--mf-color-blockquote-text: #9ca3af;

/* ── 구분선 (hr) ── */
--mf-color-hr: #4b5563;

/* ── 테이블 ── */
--mf-color-table-header-bg: #1e293b;
--mf-color-table-border: #374151;
--mf-color-table-hover: #1f2937;

/* ── 배경/UI ── */
--mf-bg-primary: #111827;
--mf-bg-secondary: #1f2937;
--mf-border-color: #374151;
--mf-accent: #3b82f6;`,

  academic: `/* ── 타이포그래피 ── */
--mf-font-body: 'Georgia', 'Times New Roman', serif;
--mf-font-mono: 'Courier New', Courier, monospace;
--mf-line-height: 1.85;

/* ── 제목 공통 ── */
--mf-color-heading: #1a1a1a;
--mf-heading-font-weight: 700;

/* ── 제목 개별 ── */
--mf-h1-font-size: 1.8em;
/* --mf-h1-color: #1a1a1a; */
/* --mf-h1-bg: transparent; */
/* --mf-h2-color: #333; */
/* --mf-h3-color: #444; */

/* ── 본문 ── */
--mf-color-text: #333333;

/* ── 링크 ── */
--mf-color-link: #1a0dab;
/* --mf-color-link-hover: #1a0dab; */
/* --mf-link-decoration: underline; */

/* ── 인라인 코드 ── */
--mf-color-code-bg: #f5f5f5;
--mf-color-code-text: #c7254e;

/* ── 코드 블록 (pre) ── */
--mf-color-pre-bg: #f5f5f5;
--mf-color-pre-border: #ddd;

/* ── 인용문 (blockquote) ── */
--mf-color-blockquote-border: #ccc;
--mf-color-blockquote-text: #666;

/* ── 구분선 (hr) ── */
--mf-color-hr: #ddd;

/* ── 테이블 ── */
--mf-color-table-header-bg: #f5f5f5;
--mf-color-table-border: #ddd;
--mf-color-table-hover: #fafafa;

/* ── 배경/UI ── */
--mf-bg-primary: #ffffff;
--mf-accent: #1a0dab;`,
};

function parsePreviewVars(cssStr: string): React.CSSProperties {
  const result: Record<string, string> = {};
  const cleaned = cssStr.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const decl of cleaned.split(';')) {
    const t = decl.trim();
    if (!t) continue;
    const ci = t.indexOf(':');
    if (ci <= 0) continue;
    const prop = t.slice(0, ci).trim();
    const val = t.slice(ci + 1).trim();
    if (prop.startsWith('--mf-') && val) result[prop] = val;
  }
  return result as React.CSSProperties;
}

const PREVIEW_MD = `# 제목 Heading 1
## 소제목 Heading 2
### 하위 제목 Heading 3

본문 텍스트입니다. **굵은 글씨**와 *기울임*이 포함됩니다. [링크 예시](https://example.com)도 있습니다.

> 인용문 블록입니다. 다른 사람의 말을 인용할 때 사용합니다.

\`인라인 코드\`와 코드 블록:

\`\`\`typescript
const greeting = "Hello, MarkFlow!";
console.log(greeting);
\`\`\`

---

| 열 1 | 열 2 | 열 3 |
|------|------|------|
| 데이터 | 테이블 | 예시 |
| 행 2 | 값 2 | 값 3 |
`;

export default function ThemeSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const [preset, setPreset] = useState('default');
  const [css, setCss] = useState(PRESET_CSS['default']!);
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
      setCss(res.css || PRESET_CSS[res.preset] || PRESET_CSS['default']!);
    } catch {
      setCss(PRESET_CSS['default']!);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (p: string) => {
    setPreset(p);
    setCss(PRESET_CSS[p] ?? '');
  };

  const handleValidate = () => {
    // Remove CSS comments first, then validate
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const lines = cleaned.split(';').map((l) => l.trim()).filter(Boolean);
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
      // 워크스페이스 목록 갱신하여 에디터에 즉시 반영
      const { fetchWorkspaces } = useWorkspaceStore.getState();
      await fetchWorkspaces();
      addToast({ message: '워크스페이스에 적용되었습니다', type: 'success' });
    } catch {
      addToast({ message: 'CSS 저장에 실패했습니다', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = useMemo(() => parseMarkdown(PREVIEW_MD), []);
  const previewStyle = useMemo(() => parsePreviewVars(css), [css]);

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-3)' }}>로딩 중...</div>;

  return (
    <div style={{ padding: '36px 40px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>CSS 테마 시스템</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '32px' }}>
        워크스페이스 단위로 문서 프리뷰 CSS를 커스터마이징합니다. Admin 이상만 편집 가능합니다.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: '20px' }}>
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

      {/* Two-column: CSS Editor (left) + Preview (right) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left: CSS Editor */}
        <div style={{ width: '500px', flexShrink: 0 }}>
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
            rows={20}
            style={{
              width: '100%', background: 'var(--text)', color: '#e2e8f0',
              borderRadius: 'var(--radius)', padding: '20px',
              fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.7',
              minHeight: '500px', resize: 'vertical', border: 'none', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            background: 'var(--amber-lt)', border: '1px solid var(--amber)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12.5px',
            marginTop: '12px', color: 'var(--text-2)',
          }}>
            CSS 변수(<code>--mf-*</code>) 오버라이드만 허용합니다.
          </div>
        </div>

        {/* Right: Live Preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>미리보기</h3>
          <div
            className="mf-editor-root"
            style={{
              ...previewStyle,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              position: 'sticky',
              top: '20px',
            }}
          >
            <div
              className="mf-preview"
              style={{
                padding: '24px',
                maxHeight: '600px',
                overflowY: 'auto',
                background: 'var(--mf-bg-primary, #ffffff)',
                color: 'var(--mf-color-text, #374151)',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
