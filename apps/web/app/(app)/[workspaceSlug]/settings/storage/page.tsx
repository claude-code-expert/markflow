'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { HardDrive, CheckCircle, AlertCircle, ChevronDown, ChevronRight, ExternalLink, Info, Loader2 } from 'lucide-react';
import { useToastStore } from '../../../../../stores/toast-store';
import {
  getUploadConfig,
  saveWorkerUrl,
  clearWorkerUrl,
  testConnection,
  type ImageUploadConfig,
  type TestConnectionResult,
} from '../../../../../lib/image-upload';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export default function StorageSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);

  const [config, setConfig] = useState<ImageUploadConfig | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const cfg = getUploadConfig();
    setConfig(cfg);
    setInputUrl(cfg.workerUrl);
    if (!cfg.workerUrl) setGuideOpen(true);
  }, []);

  const handleTest = useCallback(async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    setTestStatus('testing');
    setTestResult(null);

    const result = await testConnection(trimmed);
    setTestStatus(result.success ? 'success' : 'error');
    setTestResult(result);
  }, [inputUrl]);

  const handleSave = useCallback(() => {
    const trimmed = inputUrl.trim();
    saveWorkerUrl(trimmed);
    setConfig({ workerUrl: trimmed, isFromEnv: false });
    addToast({ message: '이미지 저장소 설정이 저장되었습니다', type: 'success' });
  }, [inputUrl, addToast]);

  const handleClear = useCallback(() => {
    clearWorkerUrl();
    setInputUrl('');
    setConfig({ workerUrl: '', isFromEnv: false });
    setTestStatus('idle');
    setTestResult(null);
    addToast({ message: '이미지 저장소 설정이 삭제되었습니다', type: 'info' });
  }, [addToast]);

  const isConfigured = Boolean(config?.workerUrl);
  const isEnvConfigured = config?.isFromEnv ?? false;
  const canTest = inputUrl.trim().length > 0 && testStatus !== 'testing';
  const canSave = inputUrl.trim().length === 0 || testStatus === 'success';

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <HardDrive size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={s.title}>이미지 저장소</h1>
          <p style={s.subtitle}>이미지 업로드를 위한 Cloudflare R2 Worker를 설정합니다</p>
        </div>
      </div>

      {/* Status Card */}
      <div style={s.card}>
        <div style={s.cardLabel}>연결 상태</div>
        <div style={s.statusRow}>
          {isConfigured ? (
            <>
              <CheckCircle size={16} style={{ color: 'var(--green, #22c55e)' }} />
              <span style={{ ...s.statusBadge, background: 'var(--green-lt, #dcfce7)', color: 'var(--green, #16a34a)' }}>
                연동 완료
              </span>
              {isEnvConfigured && (
                <span style={s.envBadge}>시스템 설정</span>
              )}
            </>
          ) : (
            <>
              <AlertCircle size={16} style={{ color: 'var(--amber, #f59e0b)' }} />
              <span style={{ ...s.statusBadge, background: 'var(--amber-lt, #fef3c7)', color: 'var(--amber, #d97706)' }}>
                미설정
              </span>
            </>
          )}
        </div>
        {isConfigured && (
          <div style={s.currentUrl}>
            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>URL:</span>
            <code style={s.urlCode}>{config?.workerUrl}</code>
          </div>
        )}
      </div>

      {/* Configuration Card */}
      <div style={s.card}>
        <div style={s.cardLabel}>업로드 서버 URL</div>

        {isEnvConfigured ? (
          <div style={s.envNotice}>
            <Info size={14} />
            <span>환경 변수(NEXT_PUBLIC_R2_WORKER_URL)로 설정되어 있어 수동 변경이 불필요합니다.</span>
          </div>
        ) : (
          <>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setTestStatus('idle');
                setTestResult(null);
              }}
              placeholder="https://markflow-r2-uploader.your-name.workers.dev"
              style={s.input}
            />

            {/* Test Button */}
            <div style={s.actionRow}>
              <button
                onClick={handleTest}
                disabled={!canTest}
                style={{ ...s.btnSecondary, opacity: canTest ? 1 : 0.5 }}
              >
                {testStatus === 'testing' ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 테스트 중...</>
                ) : (
                  '연결 테스트'
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{ ...s.btnPrimary, opacity: canSave ? 1 : 0.5 }}
              >
                저장
              </button>

              {config?.workerUrl && !isEnvConfigured && (
                <button onClick={handleClear} style={s.btnDanger}>
                  삭제
                </button>
              )}
            </div>

            {/* Test Result */}
            {testStatus === 'success' && testResult && (
              <div style={s.resultSuccess}>
                <CheckCircle size={14} />
                <div>
                  <div style={{ fontWeight: 500 }}>연동 완료</div>
                  <code style={{ fontSize: '11.5px', color: 'var(--text-3)', wordBreak: 'break-all' as const }}>
                    {testResult.imageUrl}
                  </code>
                </div>
              </div>
            )}

            {testStatus === 'error' && testResult && (
              <div style={s.resultError}>
                <AlertCircle size={14} />
                <div>
                  <div style={{ fontWeight: 500 }}>연결 실패</div>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{testResult.error}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Setup Guide (collapsible) */}
      <div style={s.card}>
        <button onClick={() => setGuideOpen((v) => !v)} style={s.guideToggle}>
          {guideOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span style={{ fontWeight: 600, fontSize: '15px' }}>설정 가이드</span>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '8px' }}>
            Cloudflare R2 Worker 배포 방법
          </span>
        </button>

        {guideOpen && (
          <div style={s.guideContent}>
            {/* Step 1 */}
            <div style={s.step}>
              <span style={s.stepNum}>1</span>
              <div>
                <div style={s.stepTitle}>Cloudflare 가입</div>
                <p style={s.stepDesc}>
                  무료 계정을 생성하세요.{' '}
                  <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" style={s.link}>
                    cloudflare.com <ExternalLink size={10} />
                  </a>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={s.step}>
              <span style={s.stepNum}>2</span>
              <div>
                <div style={s.stepTitle}>Wrangler CLI 로그인</div>
                <p style={s.stepDesc}>
                  Cloudflare Workers CLI로 계정에 로그인합니다.
                </p>
                <div style={s.codeBlock}>
                  <code>npx wrangler login</code>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={s.step}>
              <span style={s.stepNum}>3</span>
              <div>
                <div style={s.stepTitle}>R2 버킷 생성</div>
                <p style={s.stepDesc}>
                  이미지를 저장할 R2 버킷을 생성합니다. 버킷 이름은 <code style={s.inlineCode}>wrangler.toml</code>의
                  {' '}<code style={s.inlineCode}>bucket_name</code>과 일치해야 합니다.
                </p>
                <div style={s.codeBlock}>
                  <code>
                    npx wrangler r2 bucket create markflow-images
                  </code>
                </div>
                <div style={s.tipBox}>
                  <strong>bucket not found 에러?</strong> — 이 단계를 건너뛰고 배포하면{' '}
                  <code style={s.inlineCode}>R2 bucket &apos;markflow-images&apos; not found</code> 에러가 발생합니다.
                  반드시 버킷을 먼저 생성하세요.
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div style={s.step}>
              <span style={s.stepNum}>4</span>
              <div>
                <div style={s.stepTitle}>퍼블릭 액세스 활성화 + PUBLIC_URL 설정</div>
                <p style={s.stepDesc}>
                  업로드된 이미지를 외부에서 볼 수 있도록 퍼블릭 액세스를 켭니다.
                </p>
                <ol style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12.5px', lineHeight: '2', color: 'var(--text-2)' }}>
                  <li><a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" style={s.link}>Cloudflare 대시보드</a> → R2 Object Storage → markflow-images → Settings</li>
                  <li><strong>Public access</strong> 섹션에서 &quot;Allow Access&quot; 활성화</li>
                  <li>표시되는 퍼블릭 URL(예: <code style={s.inlineCode}>https://pub-abc123.r2.dev</code>)을 복사</li>
                  <li><code style={s.inlineCode}>apps/worker/wrangler.toml</code>의 <code style={s.inlineCode}>PUBLIC_URL</code>에 붙여넣기</li>
                </ol>
              </div>
            </div>

            {/* Step 5 */}
            <div style={s.step}>
              <span style={s.stepNum}>5</span>
              <div>
                <div style={s.stepTitle}>Worker 배포</div>
                <p style={s.stepDesc}>
                  프로젝트에 포함된 Worker 코드를 Cloudflare에 배포합니다.
                </p>
                <div style={s.codeBlock}>
                  <code>
                    <span style={{ color: 'var(--text-3)' }}># 프로젝트 루트에서</span>{'\n'}
                    cd apps/worker{'\n'}
                    npx wrangler deploy
                  </code>
                </div>
                <p style={{ ...s.stepDesc, marginTop: '8px' }}>
                  배포 성공 시 Worker URL이 출력됩니다 (예: <code style={s.inlineCode}>https://markflow-r2-uploader.your-name.workers.dev</code>)
                </p>
                <div style={s.tipBox}>
                  <strong>PUBLIC_URL이 플레이스홀더?</strong> — 배포 후 출력에{' '}
                  <code style={s.inlineCode}>PUBLIC_URL: &quot;https://pub-YOUR_BUCKET_ID.r2.dev&quot;</code>로 표시되면
                  Step 4를 먼저 완료한 뒤 다시 배포하세요. 그래야 업로드된 이미지가 정상 표시됩니다.
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div style={s.step}>
              <span style={s.stepNum}>6</span>
              <div>
                <div style={s.stepTitle}>Worker URL 입력 + 테스트</div>
                <p style={s.stepDesc}>
                  배포 후 받은 Worker URL을 이 페이지 상단 입력란에 붙여넣고 &quot;연결 테스트&quot;를 클릭하세요.
                  테스트가 성공하면 &quot;저장&quot;을 눌러 완료합니다.
                </p>
                <div style={{ ...s.codeBlock, marginTop: '10px', whiteSpace: 'normal' as const, wordBreak: 'break-all' as const }}>
                  <code>https://markflow-r2-uploader.your-name.workers.dev</code>
                </div>
                <p style={{ ...s.stepDesc, marginTop: '10px' }}>
                  저장 후 에디터와 프로필에서 이미지 업로드가 가능합니다.
                </p>
              </div>
            </div>

            {/* Info box */}
            <div style={s.infoBox}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Cloudflare R2 무료 티어</div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.8' }}>
                  <li>저장: 10GB/월</li>
                  <li>읽기: 1,000만 건/월</li>
                  <li>쓰기: 100만 건/월</li>
                </ul>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px', marginBottom: 0 }}>
                  대부분의 팀 사용량은 무료 티어로 충분합니다.
                </p>
              </div>
            </div>

            {/* wrangler.toml reference */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>wrangler.toml 설정 예시</div>
              <div style={s.codeBlock}>
                <code>
                  {'name = "markflow-r2-uploader"'}{'\n'}
                  {'main = "src/index.ts"'}{'\n'}
                  {'compatibility_date = "2024-12-01"'}{'\n\n'}
                  {'[[r2_buckets]]'}{'\n'}
                  {'binding = "BUCKET"'}{'\n'}
                  {'bucket_name = "markflow-images"'}{'\n\n'}
                  {'[vars]'}{'\n'}
                  {'PUBLIC_URL = "https://pub-YOUR_BUCKET_ID.r2.dev"  '}<span style={{ color: 'var(--text-3)' }}>{'# ← Step 4에서 복사한 URL'}</span>{'\n'}
                  {'ALLOWED_ORIGINS = "http://localhost:3002,https://your-domain.com"'}
                </code>
              </div>
            </div>

            {/* Troubleshooting */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>자주 발생하는 문제</div>
              <div style={s.troubleItem}>
                <code style={s.inlineCode}>R2 bucket &apos;markflow-images&apos; not found</code>
                <p style={s.troubleDesc}>→ Step 3의 <code style={s.inlineCode}>wrangler r2 bucket create</code> 명령을 먼저 실행하세요.</p>
              </div>
              <div style={s.troubleItem}>
                <code style={s.inlineCode}>이미지 업로드는 되지만 이미지가 표시되지 않음</code>
                <p style={s.troubleDesc}>→ Step 4에서 퍼블릭 액세스를 활성화했는지, <code style={s.inlineCode}>PUBLIC_URL</code>이 올바른지 확인하세요.</p>
              </div>
              <div style={s.troubleItem}>
                <code style={s.inlineCode}>PUBLIC_URL: &quot;https://pub-YOUR_BUCKET_ID.r2.dev&quot;</code>
                <p style={s.troubleDesc}>→ 플레이스홀더입니다. Step 4에서 실제 퍼블릭 URL을 복사한 뒤 <code style={s.inlineCode}>wrangler.toml</code>에 반영하고 다시 <code style={s.inlineCode}>npx wrangler deploy</code>하세요.</p>
              </div>
              <div style={s.troubleItem}>
                <code style={s.inlineCode}>연결 테스트 실패 (CORS 에러)</code>
                <p style={s.troubleDesc}>→ <code style={s.inlineCode}>wrangler.toml</code>의 <code style={s.inlineCode}>ALLOWED_ORIGINS</code>에 현재 도메인이 포함되어 있는지 확인하세요.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  container: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '40px 24px',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '28px',
  } satisfies CSSProperties,

  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  } satisfies CSSProperties,

  subtitle: {
    fontSize: '14px',
    color: 'var(--text-2)',
    margin: '4px 0 0 0',
  } satisfies CSSProperties,

  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: '24px',
    marginBottom: '20px',
  } satisfies CSSProperties,

  cardLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  } satisfies CSSProperties,

  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } satisfies CSSProperties,

  statusBadge: {
    padding: '4px 12px',
    borderRadius: '100px',
    fontSize: '12.5px',
    fontWeight: 600,
  } satisfies CSSProperties,

  envBadge: {
    padding: '3px 10px',
    borderRadius: '100px',
    fontSize: '11px',
    fontWeight: 500,
    background: 'var(--surface-2)',
    color: 'var(--text-3)',
    border: '1px solid var(--border)',
  } satisfies CSSProperties,

  currentUrl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  } satisfies CSSProperties,

  urlCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-2)',
    background: 'var(--surface-2)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    wordBreak: 'break-all' as const,
  } satisfies CSSProperties,

  envNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '14px 16px',
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    color: 'var(--text-2)',
    lineHeight: '1.6',
  } satisfies CSSProperties,

  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } satisfies CSSProperties,

  actionRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '14px',
    flexWrap: 'wrap' as const,
  } satisfies CSSProperties,

  btnPrimary: {
    padding: '9px 18px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13.5px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } satisfies CSSProperties,

  btnSecondary: {
    padding: '9px 18px',
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13.5px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } satisfies CSSProperties,

  btnDanger: {
    padding: '9px 18px',
    background: 'none',
    color: 'var(--red, #ef4444)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13.5px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } satisfies CSSProperties,

  resultSuccess: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '14px',
    padding: '12px 16px',
    background: 'var(--green-lt, #dcfce7)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    color: 'var(--green, #16a34a)',
  } satisfies CSSProperties,

  resultError: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '14px',
    padding: '12px 16px',
    background: 'var(--red-lt, #fef2f2)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    color: 'var(--red, #ef4444)',
  } satisfies CSSProperties,

  guideToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: 'var(--text)',
    fontFamily: 'inherit',
    width: '100%',
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  guideContent: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border)',
  } satisfies CSSProperties,

  step: {
    display: 'flex',
    gap: '14px',
    marginBottom: '20px',
  } satisfies CSSProperties,

  stepNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  } satisfies CSSProperties,

  stepTitle: {
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '4px',
  } satisfies CSSProperties,

  stepDesc: {
    fontSize: '13px',
    color: 'var(--text-2)',
    lineHeight: '1.6',
    margin: 0,
  } satisfies CSSProperties,

  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  } satisfies CSSProperties,

  codeBlock: {
    background: 'var(--text)',
    color: '#e2e8f0',
    borderRadius: 'var(--radius)',
    padding: '14px 18px',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    lineHeight: '1.7',
    marginTop: '10px',
    overflowX: 'auto' as const,
    whiteSpace: 'pre' as const,
  } satisfies CSSProperties,

  inlineCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    background: 'var(--surface-2)',
    padding: '2px 6px',
    borderRadius: '4px',
  } satisfies CSSProperties,

  infoBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    color: 'var(--text-2)',
    lineHeight: '1.6',
    marginTop: '8px',
  } satisfies CSSProperties,

  tipBox: {
    marginTop: '10px',
    padding: '10px 14px',
    background: 'var(--amber-lt, #fef3c7)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    color: 'var(--amber, #92400e)',
    lineHeight: '1.6',
  } satisfies CSSProperties,

  troubleItem: {
    padding: '10px 14px',
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '8px',
  } satisfies CSSProperties,

  troubleDesc: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: 'var(--text-2)',
    lineHeight: '1.5',
  } satisfies CSSProperties,
} as const;
