'use client';

import { use, useState, type FormEvent, type CSSProperties } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '../../../lib/api';
import { MarkFlowLogo } from '../../../components/mark-flow-logo';

type PageStatus = 'form' | 'success' | 'error';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

interface PasswordCheck {
  label: string;
  passed: boolean;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: '8자 이상', passed: password.length >= PASSWORD_MIN_LENGTH },
    { label: '영문 포함', passed: /[a-zA-Z]/.test(password) },
    { label: '숫자 포함', passed: /\d/.test(password) },
    { label: '특수문자 포함', passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}

function getErrorDisplay(code: string, serverMessage: string): string {
  switch (code) {
    case 'INVALID_TOKEN':
      return '유효하지 않은 비밀번호 재설정 링크입니다.';
    case 'TOKEN_EXPIRED':
      return '비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.';
    case 'INVALID_PASSWORD':
      return serverMessage;
    default:
      return '비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

const styles = {
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: 32,
    textAlign: 'center' as const,
  } satisfies CSSProperties,

  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 28,
  } satisfies CSSProperties,

  heading: {
    fontSize: 18,
    fontWeight: 600,
    fontFamily: 'var(--font-heading)',
    marginBottom: 8,
    color: 'var(--text)',
  } satisfies CSSProperties,

  description: {
    color: 'var(--text-2)',
    fontSize: 14,
    lineHeight: 1.6,
    margin: '0 0 24px',
  } satisfies CSSProperties,

  fieldGroup: {
    marginBottom: 16,
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-2)',
    marginBottom: 6,
  } satisfies CSSProperties,

  input: (hasError: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: hasError ? 'var(--red)' : 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 13px',
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  }),

  fieldError: {
    marginTop: 4,
    fontSize: 12,
    color: 'var(--red)',
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  primaryBtn: (disabled: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: 10,
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'background 0.15s ease',
    marginTop: 8,
  }),

  alertError: {
    marginBottom: 16,
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--red-lt)',
    border: '1px solid var(--red)',
    color: 'var(--red)',
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  iconWrapper: (bg: string): CSSProperties => ({
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    background: bg,
  }),

  linkStyle: {
    color: 'var(--accent)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
  } satisfies CSSProperties,

  primaryLinkBtn: {
    display: 'inline-block',
    width: '100%',
    padding: '10px 24px',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    marginTop: 24,
    transition: 'background 0.15s ease',
  } satisfies CSSProperties,

  hintRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 8,
  } satisfies CSSProperties,

  hintPill: (passed: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 9999,
    background: passed ? 'rgba(34,197,94,.1)' : 'rgba(156,163,175,.1)',
    color: passed ? 'var(--green, #16a34a)' : 'var(--text-muted)',
    transition: 'background .2s, color .2s',
  }),
} as const;

function SuccessCheckIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--red)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--accent)';
  e.target.style.boxShadow = '0 0 0 3px rgba(26,86,219,.1)';
}

function handleInputBlur(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
  e.target.style.borderColor = hasError ? 'var(--red)' : 'var(--border)';
  e.target.style.boxShadow = 'none';
}

interface ResetPasswordResponse {
  reset: boolean;
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = use(searchParams);
  const tokenStr = typeof token === 'string' ? token : '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [status, setStatus] = useState<PageStatus>('form');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; passwordConfirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = getPasswordChecks(password);

  function validate(): { password?: string; passwordConfirm?: string } {
    const errors: { password?: string; passwordConfirm?: string } = {};

    if (!password) {
      errors.password = '비밀번호를 입력해주세요.';
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
    } else if (!PASSWORD_REGEX.test(password)) {
      errors.password = '영문, 숫자, 특수문자를 모두 포함해야 합니다.';
    }

    if (!passwordConfirm) {
      errors.passwordConfirm = '비밀번호 확인을 입력해주세요.';
    } else if (password !== passwordConfirm) {
      errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setErrorCode('');

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<ResetPasswordResponse>('/auth/reset-password', {
        method: 'POST',
        body: { token: tokenStr, password },
      });
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setError(getErrorDisplay(err.code, err.message));
        if (err.code === 'INVALID_TOKEN' || err.code === 'TOKEN_EXPIRED') {
          setStatus('error');
        }
      } else {
        setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /* Success state */
  if (status === 'success') {
    return (
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/markflow-logo.png" alt="MarkFlow" height={32} />
        </div>

        <div style={styles.iconWrapper('var(--green-lt)')}>
          <SuccessCheckIcon />
        </div>

        <h2 style={styles.heading}>비밀번호가 변경되었습니다</h2>
        <p style={styles.description}>
          새 비밀번호로 로그인할 수 있습니다.
        </p>

        <Link href="/login" style={styles.primaryLinkBtn}>
          로그인
        </Link>
      </div>
    );
  }

  /* Error state (invalid/expired token) */
  if (status === 'error') {
    return (
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/markflow-logo.png" alt="MarkFlow" height={32} />
        </div>

        <div style={styles.iconWrapper('var(--red-lt)')}>
          <ErrorIcon />
        </div>

        <h2 style={styles.heading}>비밀번호 재설정 실패</h2>
        <p style={{ ...styles.description, marginBottom: 20 }}>{error}</p>

        {errorCode === 'TOKEN_EXPIRED' ? (
          <Link href="/forgot-password" style={styles.primaryLinkBtn}>
            비밀번호 찾기
          </Link>
        ) : (
          <Link href="/login" style={styles.linkStyle}>
            로그인으로 돌아가기
          </Link>
        )}
      </div>
    );
  }

  /* Form state */
  return (
    <div style={styles.card}>
      <div style={styles.logoWrap}>
        <MarkFlowLogo height={28} />
      </div>

      <h2 style={styles.heading}>새 비밀번호 설정</h2>

      {error && <div style={styles.alertError}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Password */}
        <div style={styles.fieldGroup}>
          <label htmlFor="password" style={styles.label}>
            새 비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8자 이상, 영문+숫자+특수문자"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            onFocus={handleInputFocus}
            onBlur={(e) => handleInputBlur(e, !!fieldErrors.password)}
            style={styles.input(!!fieldErrors.password)}
          />
          {password.length > 0 && (
            <div style={styles.hintRow}>
              {passwordChecks.map((check) => (
                <span key={check.label} style={styles.hintPill(check.passed)}>
                  {check.passed ? '\u2713' : '\u2022'} {check.label}
                </span>
              ))}
            </div>
          )}
          {fieldErrors.password && (
            <p style={styles.fieldError}>{fieldErrors.password}</p>
          )}
        </div>

        {/* Password Confirm */}
        <div style={{ ...styles.fieldGroup, marginBottom: 24 }}>
          <label htmlFor="passwordConfirm" style={styles.label}>
            비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력하세요"
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value);
              setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
            }}
            onFocus={handleInputFocus}
            onBlur={(e) => handleInputBlur(e, !!fieldErrors.passwordConfirm)}
            style={styles.input(!!fieldErrors.passwordConfirm)}
          />
          {fieldErrors.passwordConfirm && (
            <p style={styles.fieldError}>{fieldErrors.passwordConfirm}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={styles.primaryBtn(isSubmitting)}
        >
          {isSubmitting ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>

      <div style={{ marginTop: 24 }}>
        <Link href="/login" style={styles.linkStyle}>
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
