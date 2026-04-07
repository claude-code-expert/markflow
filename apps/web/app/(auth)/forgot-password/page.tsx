'use client';

import { useState, type FormEvent, type CSSProperties } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '../../../lib/api';
import { MarkFlowLogo } from '../../../components/mark-flow-logo';

type PageStatus = 'form' | 'sent';

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
    boxSizing: 'border-box' as const,
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
    marginTop: 8,
  } satisfies CSSProperties,

  primaryBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
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
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    background: 'var(--accent-2)',
  } satisfies CSSProperties,

  infoBox: {
    background: 'var(--teal-lt)',
    border: '1px solid var(--teal)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--text-2)',
    lineHeight: 1.6,
    marginTop: 20,
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  linkStyle: {
    color: 'var(--accent)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
  } satisfies CSSProperties,
} as const;

function MailIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
}

interface ForgotPasswordResponse {
  sent: boolean;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<PageStatus>('form');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setStatus('sent');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function getInputStyle(): CSSProperties {
    const base: CSSProperties = { ...styles.input };
    if (error && !email.trim()) {
      base.borderColor = 'var(--red)';
    }
    if (focusedField) {
      base.borderColor = 'var(--accent)';
      base.boxShadow = '0 0 0 3px rgba(26,86,219,.1)';
    }
    return base;
  }

  if (status === 'sent') {
    return (
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/markflow-logo.png" alt="MarkFlow" height={32} />
        </div>

        <div style={styles.iconWrapper}>
          <MailIcon />
        </div>

        <h2 style={styles.heading}>이메일을 확인해주세요</h2>
        <p style={styles.description}>
          비밀번호 재설정 링크를 보내드렸습니다. 메일함을 확인해주세요.
        </p>

        <div style={styles.infoBox}>
          <strong style={{ color: 'var(--teal)', fontWeight: 600 }}>
            메일이 보이지 않나요?
          </strong>
          <br />
          스팸함을 확인해주세요.
        </div>

        <div style={{ marginTop: 24 }}>
          <Link href="/login" style={styles.linkStyle}>
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.logoWrap}>
        <MarkFlowLogo height={28} />
      </div>

      <h2 style={styles.heading}>비밀번호 찾기</h2>
      <p style={styles.description}>
        가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>

      {error && <div style={styles.alertError}>{error}</div>}

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
            onFocus={() => setFocusedField(true)}
            onBlur={() => setFocusedField(false)}
            style={getInputStyle()}
            placeholder="email@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...styles.primaryBtn,
            ...(isSubmitting ? styles.primaryBtnDisabled : {}),
          }}
        >
          {isSubmitting ? '전송 중...' : '재설정 링크 보내기'}
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
