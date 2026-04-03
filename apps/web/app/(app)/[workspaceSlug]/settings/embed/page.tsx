'use client';

import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { apiFetch } from '../../../../../lib/api';
import { useToastStore } from '../../../../../stores/toast-store';

interface EmbedToken {
  id: number;
  label: string;
  tokenPreview: string;
  scope: string;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
}

type EmbedTab = 'npm' | 'iframe' | 'api';

export default function EmbedSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const [tab, setTab] = useState<EmbedTab>('npm');
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState('read');
  const [expiresAt, setExpiresAt] = useState('2026-12-31');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentWorkspace && tab === 'iframe') void loadTokens();
  }, [currentWorkspace, tab]);

  const loadTokens = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await apiFetch<{ tokens: EmbedToken[] }>(`/workspaces/${currentWorkspace.id}/embed-tokens`);
      setTokens(res.tokens);
    } catch {
      // Silently fail
    }
  };

  const handleCreateToken = async () => {
    if (!currentWorkspace || !label.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch<{ token: string }>(`/workspaces/${currentWorkspace.id}/embed-tokens`, {
        method: 'POST',
        body: { label: label.trim(), scope, expiresAt: `${expiresAt}T23:59:59Z` },
      });
      await navigator.clipboard.writeText(res.token);
      addToast({ message: '토큰이 생성되어 클립보드에 복사되었습니다', type: 'success' });
      setLabel('');
      void loadTokens();
    } catch {
      addToast({ message: '토큰 생성에 실패했습니다', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (preview: string) => {
    await navigator.clipboard.writeText(preview);
    addToast({ message: '클립보드에 복사됨', type: 'success' });
  };

  const handleRevoke = async (tokenId: number) => {
    if (!currentWorkspace) return;
    try {
      await apiFetch(`/workspaces/${currentWorkspace.id}/embed-tokens/${tokenId}`, { method: 'DELETE' });
      addToast({ message: '토큰이 폐기되었습니다', type: 'success' });
      void loadTokens();
    } catch {
      addToast({ message: '토큰 폐기에 실패했습니다', type: 'error' });
    }
  };

  const tabStyle = (t: EmbedTab) => ({
    padding: '10px 18px', fontSize: '14px', fontWeight: 500 as const,
    color: tab === t ? 'var(--accent)' : 'var(--text-3)',
    borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
    cursor: 'pointer' as const, marginBottom: '-1px',
    background: 'none', border: 'none', fontFamily: 'inherit',
  });

  const codeBlockStyle = {
    background: 'var(--text)', color: '#e2e8f0', borderRadius: 'var(--radius)',
    padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '12.5px',
    lineHeight: '1.7', marginBottom: '12px', overflowX: 'auto' as const, whiteSpace: 'pre' as const,
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: '700px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>임베드 연동</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>
        세 가지 방식으로 외부 프로젝트에 MarkFlow 에디터를 통합할 수 있습니다.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button style={tabStyle('npm')} onClick={() => setTab('npm')}>① NPM 패키지</button>
        <button style={tabStyle('iframe')} onClick={() => setTab('iframe')}>② iframe Embed</button>
        <button style={tabStyle('api')} onClick={() => setTab('api')}>③ REST API</button>
      </div>

      {/* NPM Tab */}
      {tab === 'npm' && (
        <div>
          <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green)', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: '13px', marginBottom: '20px', color: 'var(--text-2)' }}>
            KMS 백엔드 없이 에디터만 독립 동작. React/Next.js 앱에 직접 설치하세요.
          </div>
          <div style={codeBlockStyle}>
            <span style={{ color: '#6b7280' }}># 설치</span>{'\n'}
            <span style={{ color: '#93c5fd' }}>npm</span> install <span style={{ color: '#86efac' }}>@markflow/editor</span>
          </div>
          <div style={codeBlockStyle}>
            <span style={{ color: '#6b7280' }}>{'// 사용 예시 (React)'}</span>{'\n'}
            <span style={{ color: '#93c5fd' }}>import</span> {'{ MarkdownEditor }'} <span style={{ color: '#93c5fd' }}>from</span> <span style={{ color: '#86efac' }}>&apos;@markflow/editor&apos;</span>{'\n'}
            <span style={{ color: '#93c5fd' }}>import</span> <span style={{ color: '#86efac' }}>&apos;@markflow/editor/styles&apos;</span>{'\n\n'}
            {'<MarkdownEditor height="100vh" theme="light" />'}
          </div>
        </div>
      )}

      {/* iframe Tab */}
      {tab === 'iframe' && (
        <div>
          <div style={{ background: 'var(--teal-lt)', border: '1px solid var(--teal)', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: '13px', marginBottom: '20px', color: 'var(--text-2)' }}>
            어떤 환경에서도 동작. Guest Token으로 권한 범위를 제한합니다.
          </div>

          {/* Token form */}
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Guest Token 발급</h3>
          <div style={{ display: 'grid', gap: '14px', maxWidth: '480px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>토큰 라벨</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 외부 블로그 임베드"
                style={{ width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>권한 범위</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '14px', fontFamily: 'inherit' }}>
                <option value="read">읽기 전용 (read)</option>
                <option value="read_write">읽기 + 쓰기 (read-write)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>만료일</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '14px', fontFamily: 'inherit' }} />
            </div>
            <button onClick={handleCreateToken} disabled={creating || !label.trim()}
              style={{ width: 'fit-content', padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: creating ? 0.6 : 1 }}>
              {creating ? '생성 중...' : '+ 토큰 발급'}
            </button>
          </div>

          {/* Token list */}
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>발급된 토큰</h3>
          {tokens.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>발급된 토큰이 없습니다</p>}
          {tokens.map((t) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
              background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '10px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 500 }}>{t.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>{t.tokenPreview}</div>
              </div>
              <span style={{ padding: '3px 9px', borderRadius: '100px', fontSize: '11.5px', fontWeight: 500, background: t.isActive ? 'var(--green-lt)' : 'var(--red-lt)', color: t.isActive ? 'var(--green)' : 'var(--red)' }}>
                {t.isActive ? t.scope : 'revoked'}
              </span>
              <button onClick={() => handleCopy(t.tokenPreview)}
                style={{ padding: '6px 13px', fontSize: '12.5px', background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                복사
              </button>
              {t.isActive && (
                <button onClick={() => handleRevoke(t.id)}
                  style={{ padding: '6px 13px', fontSize: '12.5px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  폐기
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API Tab */}
      {tab === 'api' && (
        <div>
          <div style={{ background: 'var(--purple-lt)', border: '1px solid var(--purple)', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: '13px', marginBottom: '20px', color: 'var(--text-2)' }}>
            헤드리스 CMS 방식. 직접 API를 호출하여 문서를 읽고 씁니다.
          </div>
          <div style={codeBlockStyle}>
            <span style={{ color: '#6b7280' }}>{'// 문서 읽기'}</span>{'\n'}
            {'const res = await fetch(\n  \'https://api.markflow.io/v1/documents/DOC_ID\',\n  { headers: { \'Authorization\': \'Bearer mf_gt_...\' } }\n)\nconst { content, title } = await res.json()'}
          </div>
          <div style={codeBlockStyle}>
            <span style={{ color: '#6b7280' }}>{'// 문서 저장'}</span>{'\n'}
            {'await fetch(\n  \'https://api.markflow.io/v1/documents/DOC_ID\',\n  {\n    method: \'PATCH\',\n    headers: {\n      \'Authorization\': \'Bearer mf_gt_...\',\n      \'Content-Type\': \'application/json\'\n    },\n    body: JSON.stringify({ content: newMarkdown })\n  }\n)'}
          </div>
        </div>
      )}
    </div>
  );
}
