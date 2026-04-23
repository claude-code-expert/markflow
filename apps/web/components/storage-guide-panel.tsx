'use client';

import { useState, useCallback } from 'react';
import { HardDrive, X, ExternalLink, CheckCircle, Loader2, Copy, Check } from 'lucide-react';
import {
  getUploadConfig,
  saveWorkerUrl,
  testConnection,
} from '../lib/image-upload';
import { useToastStore } from '../stores/toast-store';

interface StorageGuidePanelProps {
  onClose: () => void;
  onConfigured: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function StorageGuidePanel({ onClose, onConfigured }: StorageGuidePanelProps) {
  const addToast = useToastStore((s) => s.addToast);
  const config = getUploadConfig();

  const [inputUrl, setInputUrl] = useState(config.workerUrl);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleTest = useCallback(async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    setTestStatus('testing');
    const result = await testConnection(trimmed);
    setTestStatus(result.success ? 'success' : 'error');
    if (result.success) {
      addToast({ message: '연결 테스트 성공 — 저장 버튼을 눌러주세요', type: 'success' });
    } else {
      addToast({ message: result.error ?? '연결 테스트 실패', type: 'error' });
    }
  }, [inputUrl, addToast]);

  const handleSave = useCallback(() => {
    saveWorkerUrl(inputUrl.trim());
    addToast({ message: '이미지 저장소가 설정되었습니다', type: 'success' });
    onConfigured();
  }, [inputUrl, addToast, onConfigured]);

  const canTest = inputUrl.trim().length > 0 && testStatus !== 'testing';
  const canSave = testStatus === 'success';

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <HardDrive size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
          이미지 업로드 설정
        </span>
        <span style={{ fontSize: '10.5px', color: 'var(--text-3)', fontWeight: 400 }}>
          R2 무료: 10GB, 1000만 읽기/월
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-3)', borderRadius: 'var(--radius-sm)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={contentStyle}>
        {config.isFromEnv ? (
          <div style={successBox}>
            <CheckCircle size={14} />
            <span>환경 변수로 설정 완료됨</span>
          </div>
        ) : (
          <>
            {/* Steps */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--text-2)', margin: '0 0 14px', lineHeight: '1.6' }}>
                이미지를 에디터에 업로드하려면 Cloudflare R2 저장소를 연결해야 합니다.
              </p>

              {/* Step 1 */}
              <StepItem num={1} title="Cloudflare 가입">
                <p style={descStyle}>
                  무료 계정 생성 → <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" style={linkStyle}>cloudflare.com <ExternalLink size={9} /></a>
                </p>
              </StepItem>

              {/* Step 2 */}
              <StepItem num={2} title="Wrangler 로그인">
                <CodeBlock code="npx wrangler login" copied={copiedCmd} onCopy={setCopiedCmd} />
              </StepItem>

              {/* Step 3 */}
              <StepItem num={3} title="R2 버킷 생성">
                <CodeBlock code="npx wrangler r2 bucket create markflow-images" copied={copiedCmd} onCopy={setCopiedCmd} />
                <div style={tipStyle}>
                  bucket not found 에러 시 이 단계를 먼저 실행하세요.
                </div>
              </StepItem>

              {/* Step 4 */}
              <StepItem num={4} title="퍼블릭 액세스 + PUBLIC_URL">
                <ol style={olStyle}>
                  <li><a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>Cloudflare 대시보드</a> 로그인</li>
                  <li>좌측 메뉴 <b>Storage &amp; Databases</b> → <b>R2 Object Storage</b></li>
                  <li>생성한 <b>markflow-images</b> 버킷 선택 → <b>Settings</b> 탭</li>
                  <li><b>Public Development URL</b> → Allow Access 활성화</li>
                  <li>표시된 URL을 <code style={inlineCodeStyle}>apps/worker/wrangler.toml</code>의 <code style={inlineCodeStyle}>PUBLIC_URL</code>에 입력</li>
                </ol>
                <div style={tipStyle}>
                  <code style={inlineCodeStyle}>wrangler.toml</code>은 프로젝트 루트의 <code style={inlineCodeStyle}>apps/worker/</code> 폴더에 있습니다.
                  <br />
                  <span style={{ opacity: 0.8 }}>ex) </span><code style={inlineCodeStyle}>PUBLIC_URL = &quot;https://pub-YOUR_BUCKET_ID.r2.dev&quot;</code>
                </div>
              </StepItem>

              {/* Step 5 */}
              <StepItem num={5} title="R2 CORS 정책 설정">
                <p style={descStyle}>
                  R2 대시보드 → <b>markflow-images</b> → <b>Settings</b> → <b>CORS Policy</b>에 아래 JSON을 입력하세요.
                </p>
                <CodeBlock code={`[
  {
    "AllowedOrigins": [
      "http://localhost:3002",
      "https://your-app.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"]
  }
]`} copied={copiedCmd} onCopy={setCopiedCmd} />
                <div style={tipStyle}>
                  각 origin은 별도 문자열이어야 합니다. 쉼표로 합치면 안 됩니다.
                </div>
              </StepItem>

              {/* Step 6 */}
              <StepItem num={6} title="Worker 배포">
                <CodeBlock code={`cd apps/worker\nnpx wrangler deploy`} copied={copiedCmd} onCopy={setCopiedCmd} />
                <p style={{ ...descStyle, marginTop: '6px' }}>
                  배포 후 출력되는 URL을 아래에 입력하세요.
                  <br />
                  <span style={{ opacity: 0.7 }}>ex) </span><code style={inlineCodeStyle}>https://markflow-r2-uploader.account-id.workers.dev</code>
                </p>
                <div style={tipStyle}>
                  <code style={inlineCodeStyle}>wrangler.toml</code>이나 CORS 설정을 변경한 후에는 반드시 <b>재배포</b>해야 적용됩니다.
                </div>
              </StepItem>

              {/* Step 7 — URL 입력 */}
              <StepItem num={7} title="Worker URL 입력">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => { setInputUrl(e.target.value); setTestStatus('idle'); }}
                  placeholder="https://....workers.dev"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button onClick={handleTest} disabled={!canTest} style={{ ...btnStyle, opacity: canTest ? 1 : 0.5 }}>
                    {testStatus === 'testing' ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> 테스트 중</> : '연결 테스트'}
                  </button>
                  <button onClick={handleSave} disabled={!canSave} style={{ ...btnPrimaryStyle, opacity: canSave ? 1 : 0.5 }}>
                    저장
                  </button>
                </div>

              </StepItem>
            </div>

          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Step Item ────────────────────────────────────────────────────────────────

function StepItem({ num, title, children }: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          color: 'var(--text)',
        }}
      >
        <span style={{
          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700,
        }}>
          {num}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ padding: '4px 10px 12px 38px', fontSize: '12px', lineHeight: '1.6', color: 'var(--text-2)' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Code Block with Copy ────────────────────────────────────────────────────

function CodeBlock({ code, copied, onCopy }: {
  code: string;
  copied: string | null;
  onCopy: (cmd: string | null) => void;
}) {
  const isCopied = copied === code;

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code);
    onCopy(code);
    setTimeout(() => onCopy(null), 2000);
  }, [code, onCopy]);

  return (
    <div style={{ position: 'relative' }}>
      <code style={codeStyle}>{code}</code>
      <button
        type="button"
        onClick={handleCopy}
        title="복사"
        style={{
          position: 'absolute', top: '6px', right: '6px',
          width: '24px', height: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          borderRadius: '4px', cursor: 'pointer', color: isCopied ? '#4ade80' : '#94a3b8',
          transition: 'color 0.15s, background 0.15s',
        }}
      >
        {isCopied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  width: '420px',
  flexShrink: 0,
  borderLeft: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--surface)',
  height: '100%',
  overflow: 'hidden',
  boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '14px 16px',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
};

const descStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: 'var(--text-2)',
  lineHeight: '1.6',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  textDecoration: 'none',
  fontWeight: 500,
};

const codeStyle: React.CSSProperties = {
  display: 'block',
  background: 'var(--text)',
  color: '#e2e8f0',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  lineHeight: '1.6',
  whiteSpace: 'pre',
  overflowX: 'auto',
};

const inlineCodeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  background: 'var(--surface-2)',
  padding: '1px 4px',
  borderRadius: '3px',
};

const olStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '16px',
  fontSize: '11.5px',
  lineHeight: '2',
};

const tipStyle: React.CSSProperties = {
  marginTop: '6px',
  padding: '6px 10px',
  background: 'var(--amber-lt, #fef3c7)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '11px',
  color: 'var(--amber, #92400e)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--border)',
  fontSize: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const successBox: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '8px',
  padding: '8px 10px',
  background: 'var(--green-lt, #dcfce7)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  color: 'var(--green, #16a34a)',
};
