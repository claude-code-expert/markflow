'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import {
  HardDrive, CheckCircle, AlertCircle,
  Info, Loader2, Image, CloudUpload, HelpCircle, BookOpen,
} from 'lucide-react';
import { useToastStore } from '../../../../../stores/toast-store';
import {
  getUploadConfig,
  saveWorkerUrl,
  clearWorkerUrl,
  testConnection,
  isImageUploadEnabled,
  setImageUploadEnabled,
  type ImageUploadConfig,
  type TestConnectionResult,
} from '../../../../../lib/image-upload';
import { StorageGuidePanel } from '../../../../../components/storage-guide-panel';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export default function StorageSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);

  const [config, setConfig] = useState<ImageUploadConfig | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [showGuidePanel, setShowGuidePanel] = useState(false);

  useEffect(() => {
    const cfg = getUploadConfig();
    setConfig(cfg);
    setInputUrl(cfg.workerUrl);
    setUploadEnabled(isImageUploadEnabled());
  }, []);

  const handleToggleUpload = useCallback((enabled: boolean) => {
    setUploadEnabled(enabled);
    setImageUploadEnabled(enabled);
    addToast({
      message: enabled ? '이미지 업로드가 활성화되었습니다' : '이미지 업로드가 비활성화되었습니다',
      type: enabled ? 'success' : 'info',
    });
  }, [addToast]);

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

  const handleGuideConfigured = useCallback(() => {
    const cfg = getUploadConfig();
    setConfig(cfg);
    setInputUrl(cfg.workerUrl);
    setShowGuidePanel(false);
  }, []);

  const isConfigured = Boolean(config?.workerUrl);
  const isEnvConfigured = config?.isFromEnv ?? false;
  const canTest = inputUrl.trim().length > 0 && testStatus !== 'testing';
  const canSave = inputUrl.trim().length === 0 || testStatus === 'success';

  return (
    <div style={s.pageLayout}>
      {/* Main content */}
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <HardDrive size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={s.title}>이미지 저장소</h1>
            <p style={s.subtitle}>이미지 업로드를 위한 Cloudflare R2 Worker를 설정합니다</p>
          </div>
        </div>

        {/* ── Image Upload Toggle Card ── */}
        <div style={s.card}>
          <div style={s.toggleRow}>
            <div style={s.toggleLeft}>
              <div style={s.toggleIconWrap}>
                <Image size={18} style={{ color: uploadEnabled ? 'var(--accent)' : 'var(--text-3)' }} />
              </div>
              <div>
                <p style={s.toggleLabel}>이미지 업로드</p>
                <p style={s.toggleDesc}>
                  {uploadEnabled
                    ? '에디터에서 이미지를 직접 업로드할 수 있습니다'
                    : '이미지 업로드 기능이 비활성화되어 있습니다'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={uploadEnabled}
              onClick={() => handleToggleUpload(!uploadEnabled)}
              style={s.toggleTrack(uploadEnabled)}
            >
              <span style={s.toggleThumb(uploadEnabled)} />
            </button>
          </div>
        </div>

        {/* ── Upload Guide Panel (shown when enabled) ── */}
        {uploadEnabled && (
          <div style={s.guidePanel}>
            <div style={s.guidePanelHeader}>
              <CloudUpload size={18} style={{ color: 'var(--accent)' }} />
              <span style={s.guidePanelTitle}>이미지 업로드 사용법</span>
            </div>

            <div style={s.guideSteps}>
              <div style={s.guideStep}>
                <span style={s.guideStepNum}>1</span>
                <div>
                  <strong style={s.guideStepLabel}>에디터 툴바</strong>
                  <span style={s.guideStepText}>
                    에디터 상단 툴바의 이미지 버튼을 클릭하거나, 파일을 에디터 영역에 드래그 앤 드롭하세요.
                  </span>
                </div>
              </div>
              <div style={s.guideStep}>
                <span style={s.guideStepNum}>2</span>
                <div>
                  <strong style={s.guideStepLabel}>자동 업로드</strong>
                  <span style={s.guideStepText}>
                    선택한 이미지가 Cloudflare R2에 자동 업로드되고, 마크다운 이미지 문법으로 삽입됩니다.
                  </span>
                </div>
              </div>
              <div style={s.guideStep}>
                <span style={s.guideStepNum}>3</span>
                <div>
                  <strong style={s.guideStepLabel}>지원 형식</strong>
                  <span style={s.guideStepText}>
                    PNG, JPEG, GIF, WebP, SVG (최대 10MB)
                  </span>
                </div>
              </div>
            </div>

            <div style={s.guideInfoBox}>
              <HelpCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                Cloudflare R2는 매월 <strong>10GB 저장</strong> / <strong>1,000만 회 읽기</strong>가 무료입니다.
                대부분의 사용량은 무료 티어로 충분합니다.
              </span>
            </div>
          </div>
        )}

        {/* ── Status Card ── */}
        {uploadEnabled && (
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

            {/* CTA: 미설정 시 설정 가이드 패널 열기 유도 */}
            {!isConfigured && !isEnvConfigured && (
              <button
                type="button"
                onClick={() => setShowGuidePanel(true)}
                style={s.ctaButton}
              >
                <BookOpen size={16} />
                <div style={s.ctaTextWrap}>
                  <span style={s.ctaTitle}>Cloudflare R2 설정 가이드</span>
                  <span style={s.ctaDesc}>6단계로 이미지 저장소를 연결하세요 (약 5분 소요)</span>
                </div>
                <span style={s.ctaArrow}>→</span>
              </button>
            )}
          </div>
        )}

        {/* ── Configuration Card ── */}
        {uploadEnabled && (
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

                {/* 설정 완료 후에도 가이드를 다시 볼 수 있는 링크 */}
                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowGuidePanel(true)}
                    style={s.guideLink}
                  >
                    <BookOpen size={12} />
                    설정 가이드 다시 보기
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* ── Right Panel: StorageGuidePanel ── */}
      {showGuidePanel && (
        <StorageGuidePanel
          onClose={() => setShowGuidePanel(false)}
          onConfigured={handleGuideConfigured}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  pageLayout: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
  } satisfies CSSProperties,

  container: {
    flex: 1,
    maxWidth: 640,
    margin: '0 auto',
    padding: '40px 24px',
    overflowY: 'auto' as const,
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

  // ── Toggle ──

  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  } satisfies CSSProperties,

  toggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flex: 1,
    minWidth: 0,
  } satisfies CSSProperties,

  toggleIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'var(--surface-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies CSSProperties,

  toggleLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    margin: 0,
  } satisfies CSSProperties,

  toggleDesc: {
    fontSize: '12.5px',
    color: 'var(--text-3)',
    margin: '2px 0 0 0',
  } satisfies CSSProperties,

  toggleTrack: (active: boolean): CSSProperties => ({
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    background: active ? 'var(--accent)' : 'var(--border)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    flexShrink: 0,
    padding: 0,
  }),

  toggleThumb: (active: boolean): CSSProperties => ({
    position: 'absolute',
    top: 2,
    left: active ? 22 : 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,.15)',
    transition: 'left 0.2s ease',
    pointerEvents: 'none',
  }),

  // ── Guide Panel ──

  guidePanel: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: '24px',
    marginBottom: '20px',
  } satisfies CSSProperties,

  guidePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '18px',
  } satisfies CSSProperties,

  guidePanelTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text)',
  } satisfies CSSProperties,

  guideSteps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
    marginBottom: '18px',
  } satisfies CSSProperties,

  guideStep: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  } satisfies CSSProperties,

  guideStepNum: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
  } satisfies CSSProperties,

  guideStepLabel: {
    display: 'block',
    fontSize: '13.5px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '2px',
  } satisfies CSSProperties,

  guideStepText: {
    display: 'block',
    fontSize: '12.5px',
    color: 'var(--text-2)',
    lineHeight: '1.5',
  } satisfies CSSProperties,

  guideInfoBox: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12.5px',
    color: 'var(--text-2)',
    lineHeight: '1.6',
  } satisfies CSSProperties,

  // ── Status ──

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

  // ── CTA Button ──

  ctaButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '100%',
    marginTop: '16px',
    padding: '16px 18px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    transition: 'background 0.15s, border-color 0.15s',
    color: 'var(--text)',
  } satisfies CSSProperties,

  ctaTextWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } satisfies CSSProperties,

  ctaTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--accent)',
  } satisfies CSSProperties,

  ctaDesc: {
    fontSize: '12px',
    color: 'var(--text-3)',
  } satisfies CSSProperties,

  ctaArrow: {
    fontSize: '18px',
    color: 'var(--accent)',
    fontWeight: 500,
    flexShrink: 0,
  } satisfies CSSProperties,

  // ── Guide Link ──

  guideLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '14px',
    padding: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '12.5px',
    color: 'var(--accent)',
    fontWeight: 500,
  } satisfies CSSProperties,

  // ── Config ──

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
} as const;
