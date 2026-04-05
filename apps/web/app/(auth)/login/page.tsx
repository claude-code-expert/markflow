'use client';

import { useState, useEffect, type FormEvent, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '../../../stores/workspace-store';
import { useAuthStore } from '../../../stores/auth-store';
import { ApiError } from '../../../lib/api';
import { MarkFlowLogo } from '../../../components/mark-flow-logo';

/* ---------- Error messages by code ---------- */

function getErrorMessage(code: string, lockRemaining?: number): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'ACCOUNT_LOCKED': {
      if (lockRemaining && lockRemaining > 0) {
        const minutes = Math.ceil(lockRemaining / 60);
        return `계정이 잠겼습니다. ${minutes}분 후에 다시 시도해주세요.`;
      }
      return '계정이 잠겼습니다. 잠시 후 다시 시도해주세요.';
    }
    case 'EMAIL_NOT_VERIFIED':
      return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.';
    case 'RATE_LIMITED':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

function extractLockSeconds(message: string): number {
  const match = /(\d+)\s*(분|min)/i.exec(message);
  if (match && match[1]) {
    return parseInt(match[1], 10) * 60;
  }
  // Default 15 minutes if parsing fails
  return 15 * 60;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/* ---------- Styles ---------- */

const styles = {
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: 32,
  } satisfies CSSProperties,

  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 28,
  } satisfies CSSProperties,

  logoSquare: {
    width: 26,
    height: 26,
    background: 'var(--accent)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 1px',
  } satisfies CSSProperties,

  logoText: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: 20,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  } satisfies CSSProperties,

  logoTextAccent: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: 20,
    color: 'var(--accent)',
    letterSpacing: '-0.02em',
  } satisfies CSSProperties,

  tabWrap: {
    display: 'flex',
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius-sm)',
    padding: 3,
    marginBottom: 24,
  } satisfies CSSProperties,

  tabActive: {
    flex: 1,
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    background: 'var(--surface)',
    color: 'var(--text)',
    boxShadow: '0 1px 2px rgba(0,0,0,.06)',
    transition: 'all 0.15s ease',
  } satisfies CSSProperties,

  tabInactive: {
    flex: 1,
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--text-3)',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
    display: 'block',
    lineHeight: '1.5',
  } satisfies CSSProperties,

  alertError: {
    marginBottom: 16,
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--red-lt)',
    border: '1px solid var(--red)',
    color: 'var(--red)',
  } satisfies CSSProperties,

  alertWarning: {
    marginBottom: 16,
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--amber-lt)',
    border: '1px solid var(--amber)',
    color: 'var(--amber)',
  } satisfies CSSProperties,

  countdownBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  } satisfies CSSProperties,

  fieldGroup: {
    marginBottom: 16,
  } satisfies CSSProperties,

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-2)',
    marginBottom: 6,
  } satisfies CSSProperties,

  input: {
    display: 'block',
    width: '100%',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 13px',
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  } satisfies CSSProperties,

  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  } satisfies CSSProperties,

  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  } satisfies CSSProperties,

  checkboxLabel: {
    fontSize: 13,
    color: 'var(--text-2)',
    cursor: 'pointer',
    userSelect: 'none',
  } satisfies CSSProperties,

  primaryBtn: {
    display: 'block',
    width: '100%',
    padding: 10,
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  } satisfies CSSProperties,

  primaryBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  } satisfies CSSProperties,

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  } satisfies CSSProperties,

  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
  } satisfies CSSProperties,

  dividerText: {
    fontSize: 12,
    color: 'var(--text-3)',
    fontWeight: 500,
  } satisfies CSSProperties,

  socialBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: 10,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background 0.15s ease',
  } satisfies CSSProperties,

  socialBtnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  } satisfies CSSProperties,

  footerText: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-3)',
  } satisfies CSSProperties,

  footerLink: {
    color: 'var(--accent)',
    fontWeight: 500,
    textDecoration: 'none',
  } satisfies CSSProperties,
} as const;

/* ---------- Component ---------- */

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  /* -- Account lockout countdown -- */
  useEffect(() => {
    if (lockSeconds <= 0) return;

    const interval = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          setErrorCode('');
          return 0;
        }
        const next = prev - 1;
        const minutes = Math.ceil(next / 60);
        setError(`계정이 잠겼습니다. ${minutes}분 후에 다시 시도해주세요.`);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockSeconds]);

  /* -- Submit -- */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setErrorCode('');

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password, rememberMe);

      // FR-003: 로그인 후 워크스페이스 1개면 바로 이동
      const { fetchWorkspaces } = useWorkspaceStore.getState();
      await fetchWorkspaces();
      const { workspaces } = useWorkspaceStore.getState();
      if (workspaces.length === 1 && workspaces[0]?.name) {
        router.push(`/${encodeURIComponent(workspaces[0].name)}/doc`);
      } else {
        router.push('/workspaces');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === 'ACCOUNT_LOCKED') {
          const remaining = extractLockSeconds(err.message);
          setLockSeconds(remaining);
          setError(getErrorMessage(err.code, remaining));
        } else {
          setError(getErrorMessage(err.code));
        }
      } else {
        setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLocked = errorCode === 'ACCOUNT_LOCKED' && lockSeconds > 0;
  const isWarning = errorCode === 'ACCOUNT_LOCKED' || errorCode === 'RATE_LIMITED';

  /* -- Focus / hover style helpers -- */
  function getInputStyle(fieldName: string): CSSProperties {
    const base: CSSProperties = { ...styles.input };
    if (error && !errorCode && !email.trim() && fieldName === 'email') {
      base.borderColor = 'var(--red)';
    }
    if (error && !errorCode && !password && fieldName === 'password') {
      base.borderColor = 'var(--red)';
    }
    if (focusedField === fieldName) {
      base.borderColor = 'var(--accent)';
      base.boxShadow = '0 0 0 3px rgba(26,86,219,.1)';
    }
    return base;
  }

  return (
    <div style={styles.card}>
      {/* Logo */}
      <div style={styles.logoWrap}>
        <MarkFlowLogo height={28} />
      </div>

      {/* Auth tabs */}
      <div style={styles.tabWrap}>
        <button type="button" style={styles.tabActive}>
          로그인
        </button>
        <Link href="/register" style={styles.tabInactive}>
          회원가입
        </Link>
      </div>

      {/* Error / Warning alert */}
      {error && (
        <div style={isWarning ? styles.alertWarning : styles.alertError}>
          {error}
          {isLocked && (
            <div style={styles.countdownBadge}>
              남은 시간: {formatCountdown(lockSeconds)}
            </div>
          )}
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit} noValidate>
        <div style={styles.fieldGroup}>
          <label htmlFor="email" style={styles.label}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('email')}
            placeholder="email@example.com"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="password" style={styles.label}>
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('password')}
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        {/* Remember me */}
        <div style={styles.rememberRow}>
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={styles.checkbox}
          />
          <label htmlFor="rememberMe" style={styles.checkboxLabel}>
            로그인 상태 유지
          </label>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || isLocked}
          onMouseEnter={() => setHoveredBtn('submit')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            ...styles.primaryBtn,
            ...(isSubmitting || isLocked ? styles.primaryBtnDisabled : {}),
            ...(hoveredBtn === 'submit' && !isSubmitting && !isLocked
              ? { background: 'var(--accent-dk)' }
              : {}),
          }}
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* Divider */}
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>또는</span>
        <div style={styles.dividerLine} />
      </div>

      {/* Social login buttons (placeholder) */}
      <div style={styles.socialBtnGroup}>
        <button
          type="button"
          onMouseEnter={() => setHoveredBtn('google')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            ...styles.socialBtn,
            ...(hoveredBtn === 'google'
              ? { border: '1.5px solid var(--border-2)', background: 'var(--surface-2)' }
              : {}),
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.39l3.66-2.84v-.46z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google로 계속하기
        </button>

        <button
          type="button"
          onMouseEnter={() => setHoveredBtn('github')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            ...styles.socialBtn,
            ...(hoveredBtn === 'github'
              ? { border: '1.5px solid var(--border-2)', background: 'var(--surface-2)' }
              : {}),
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub로 계속하기
        </button>
      </div>

      {/* Footer link */}
      <p style={styles.footerText}>
        계정이 없으신가요?{' '}
        <Link href="/register" style={styles.footerLink}>
          회원가입
        </Link>
      </p>
    </div>
  );
}
