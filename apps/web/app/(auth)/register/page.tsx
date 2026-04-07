'use client';

import { useState, type FormEvent, type CSSProperties } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '../../../lib/api';
import { MarkFlowLogo } from '../../../components/mark-flow-logo';
import { RegisterResponse } from '../../../lib/types';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
};

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

function validateFields(
  name: string,
  email: string,
  password: string,
  passwordConfirm: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = '이름을 입력해주세요.';
  }

  if (!email.trim()) {
    errors.email = '이메일을 입력해주세요.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '올바른 이메일 형식을 입력해주세요.';
  }

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

function getErrorMessage(code: string): string {
  switch (code) {
    case 'EMAIL_EXISTS':
      return '이미 사용 중인 이메일입니다.';
    case 'INVALID_PASSWORD':
      return '비밀번호 형식이 올바르지 않습니다.';
    case 'VALIDATION_ERROR':
      return '입력 정보를 다시 확인해주세요.';
    default:
      return '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

/* ── Password validation hint helpers ── */

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

/* ── Inline style factories ── */

const styles = {
  card: {
    maxWidth: 440,
    width: '100%',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: 32,
    margin: '0 auto',
  } satisfies CSSProperties,

  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 2,
  } satisfies CSSProperties,

  logoBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 1px',
  } satisfies CSSProperties,

  logoText: {
    fontFamily: 'var(--font-heading, sans-serif)',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text)',
  } satisfies CSSProperties,

  logoTextAccent: {
    fontFamily: 'var(--font-heading, sans-serif)',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--accent)',
  } satisfies CSSProperties,

  tabRow: {
    display: 'flex',
    marginBottom: 24,
    borderBottom: '2px solid var(--border)',
  } satisfies CSSProperties,

  tab: (active: boolean): CSSProperties => ({
    flex: 1,
    textAlign: 'center',
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: -2,
    background: 'none',
    textDecoration: 'none',
    transition: 'color .15s, border-color .15s',
  }),

  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
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
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
  }),

  fieldError: {
    marginTop: 4,
    fontSize: 12,
    color: 'var(--red)',
  } satisfies CSSProperties,

  fieldGroup: {
    marginBottom: 16,
  } satisfies CSSProperties,

  serverError: {
    marginBottom: 16,
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--red)',
    background: 'rgba(239,68,68,.06)',
    color: 'var(--red)',
    fontSize: 13,
  } satisfies CSSProperties,

  button: (disabled: boolean): CSSProperties => ({
    width: '100%',
    padding: '11px 0',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'opacity .15s',
  }),

  bottomLink: {
    marginTop: 20,
    textAlign: 'center' as const,
    fontSize: 13,
    color: 'var(--text-muted)',
  } satisfies CSSProperties,

  link: {
    color: 'var(--accent)',
    fontWeight: 500,
    textDecoration: 'none',
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

  /* Success state */
  successWrap: {
    textAlign: 'center' as const,
  } satisfies CSSProperties,

  successIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'rgba(34,197,94,.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  } satisfies CSSProperties,

  successHeading: {
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 8,
  } satisfies CSSProperties,

  successBody: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 20,
    lineHeight: 1.6,
  } satisfies CSSProperties,
};

/* ── Focus / blur helper (inline style can't do :focus) ── */

function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--accent)';
  e.target.style.boxShadow = '0 0 0 3px rgba(26,86,219,.1)';
}

function handleInputBlur(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
  e.target.style.borderColor = hasError ? 'var(--red)' : 'var(--border)';
  e.target.style.boxShadow = 'none';
}

/* ═══════════════════════════ Component ═══════════════════════════ */

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordChecks = getPasswordChecks(password);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError('');

    const errors = validateFields(name, email, password, passwordConfirm);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password } satisfies RegisterPayload,
      });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(getErrorMessage(error.code));
      } else {
        setServerError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Success state ── */
  if (isSuccess) {
    return (
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/markflow-logo.png" alt="MarkFlow" height={32} />
        </div>

        <div style={styles.successWrap}>
          <div style={styles.successIcon}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M5 13l4 4L19 7"
                stroke="var(--green, #16a34a)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 style={styles.successHeading}>회원가입이 완료되었습니다</h2>

          <p style={styles.successBody}>
            <strong style={{ color: 'var(--text)' }}>{email}</strong>
            {' '}으로 인증 메일을 보냈습니다.
            <br />
            메일에 포함된 링크를 클릭하여 이메일 인증을 완료해주세요.
          </p>

          <Link href="/login" style={styles.link}>
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  /* ── Register form ── */
  return (
    <div style={styles.card}>
      {/* Logo */}
      <div style={styles.logoWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/markflow-logo.png" alt="MarkFlow" height={32} />
      </div>

      {/* Auth tabs */}
      <div style={styles.tabRow}>
        <Link href="/login" style={styles.tab(false)}>
          로그인
        </Link>
        <span style={styles.tab(true)}>회원가입</span>
      </div>

      {/* Server error */}
      {serverError && <div style={styles.serverError}>{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div style={styles.fieldGroup}>
          <label htmlFor="name" style={styles.label}>
            이름
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            onFocus={handleInputFocus}
            onBlur={(e) => handleInputBlur(e, !!fieldErrors.name)}
            style={styles.input(!!fieldErrors.name)}
          />
          {fieldErrors.name && (
            <p style={styles.fieldError}>{fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
        <div style={styles.fieldGroup}>
          <label htmlFor="email" style={styles.label}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            onFocus={handleInputFocus}
            onBlur={(e) => handleInputBlur(e, !!fieldErrors.email)}
            style={styles.input(!!fieldErrors.email)}
          />
          {fieldErrors.email && (
            <p style={styles.fieldError}>{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div style={styles.fieldGroup}>
          <label htmlFor="password" style={styles.label}>
            비밀번호
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
          {/* Password validation hints */}
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
              setFieldErrors((prev) => ({
                ...prev,
                passwordConfirm: undefined,
              }));
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
          style={styles.button(isSubmitting)}
        >
          {isSubmitting ? '처리 중...' : '계정 만들기'}
        </button>
      </form>

      {/* Bottom link */}
      <p style={styles.bottomLink}>
        이미 계정이 있으신가요?{' '}
        <Link href="/login" style={styles.link}>
          로그인
        </Link>
      </p>
    </div>
  );
}
