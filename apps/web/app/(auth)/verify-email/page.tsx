'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '../../../lib/api';

interface VerifyEmailResponse {
  message: string;
}

type VerifyStatus = 'loading' | 'success' | 'error' | 'pending';

function getErrorMessage(code: string): string {
  switch (code) {
    case 'TOKEN_EXPIRED':
      return '인증 링크가 만료되었습니다. 다시 회원가입해주세요.';
    case 'TOKEN_INVALID':
      return '유효하지 않은 인증 링크입니다.';
    case 'ALREADY_VERIFIED':
      return '이미 인증이 완료된 이메일입니다.';
    default:
      return '이메일 인증 중 오류가 발생했습니다.';
  }
}

const cardStyle: React.CSSProperties = {
  maxWidth: 440,
  width: '100%',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-lg)',
  padding: 32,
  textAlign: 'center' as const,
};

const iconWrapperBase: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
};

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  fontFamily: 'var(--font-heading)',
  marginBottom: 8,
  color: 'var(--text)',
};

const descriptionStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: 14,
  lineHeight: 1.6,
  margin: 0,
};

const primaryButtonStyle: React.CSSProperties = {
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
};

const infoBoxStyle: React.CSSProperties = {
  background: 'var(--teal-lt)',
  border: '1px solid var(--teal)',
  borderRadius: 'var(--radius-sm)',
  padding: '12px 16px',
  fontSize: 13,
  color: 'var(--text-2)',
  lineHeight: 1.6,
  marginTop: 20,
  textAlign: 'left' as const,
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
};

function MailCheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
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

function SpinnerIcon() {
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
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = use(searchParams);
  const [status, setStatus] = useState<VerifyStatus>(token ? 'loading' : 'pending');
  const [message, setMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token || typeof token !== 'string') {
      if (!token) {
        setStatus('pending');
        setMessage('이메일을 확인해주세요');
      } else {
        setStatus('error');
        setMessage('인증 토큰이 누락되었습니다.');
      }
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        await apiFetch<VerifyEmailResponse>(
          `/auth/verify-email?token=${encodeURIComponent(token as string)}`,
          { method: 'POST' },
        );
        if (!cancelled) {
          setStatus('success');
          setMessage('이메일 인증이 완료되었습니다!');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          if (error instanceof ApiError) {
            setErrorCode(error.code);
            setMessage(getErrorMessage(error.code));
          } else {
            setMessage('이메일 인증 중 오류가 발생했습니다.');
          }
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend() {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await apiFetch<VerifyEmailResponse>('/auth/resend-verification', {
        method: 'POST',
      });
      setResendSuccess(true);
    } catch {
      setResendSuccess(false);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={cardStyle}>
        {/* Loading State */}
        {status === 'loading' && (
          <>
            <div style={{ ...iconWrapperBase, background: 'var(--accent-2)' }}>
              <SpinnerIcon />
            </div>
            <h2 style={headingStyle}>이메일 인증 중...</h2>
            <p style={descriptionStyle}>잠시만 기다려주세요.</p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div style={{ ...iconWrapperBase, background: 'var(--green-lt)' }}>
              <SuccessCheckIcon />
            </div>
            <h2 style={headingStyle}>{message}</h2>
            <p style={descriptionStyle}>
              이제 로그인하여 서비스를 이용하실 수 있습니다.
            </p>
            <Link href="/login" style={primaryButtonStyle}>
              로그인
            </Link>
          </>
        )}

        {/* Pending State — no token, waiting for user to check email */}
        {status === 'pending' && (
          <>
            <div style={{ ...iconWrapperBase, background: 'var(--accent-2)' }}>
              <MailCheckIcon color="var(--accent)" />
            </div>
            <h2 style={headingStyle}>이메일을 확인해주세요</h2>
            <p style={descriptionStyle}>
              가입하신 이메일 주소로 인증 메일을 보내드렸습니다.
              <br />
              메일에 포함된 링크를 클릭하여 인증을 완료해주세요.
            </p>

            <div style={infoBoxStyle}>
              <strong style={{ color: 'var(--teal)', fontWeight: 600 }}>
                메일이 보이지 않나요?
              </strong>
              <br />
              스팸함을 확인하거나, 아래 버튼으로 인증 메일을 다시 받을 수 있습니다.
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendSuccess}
              style={{
                ...primaryButtonStyle,
                opacity: isResending || resendSuccess ? 0.6 : 1,
                cursor: isResending || resendSuccess ? 'not-allowed' : 'pointer',
              }}
            >
              {isResending
                ? '발송 중...'
                : resendSuccess
                  ? '인증 메일을 다시 보냈습니다'
                  : '인증 메일 재발송'}
            </button>

            <div style={{ marginTop: 20 }}>
              <Link href="/login" style={linkStyle}>
                로그인 페이지로 이동
              </Link>
            </div>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div style={{ ...iconWrapperBase, background: 'var(--red-lt)' }}>
              <ErrorIcon />
            </div>
            <h2 style={headingStyle}>인증 실패</h2>
            <p style={{ ...descriptionStyle, marginBottom: 20 }}>{message}</p>

            {errorCode === 'TOKEN_EXPIRED' ? (
              <Link href="/register" style={primaryButtonStyle}>
                다시 회원가입
              </Link>
            ) : errorCode === 'ALREADY_VERIFIED' ? (
              <Link href="/login" style={primaryButtonStyle}>
                로그인
              </Link>
            ) : (
              <div style={{ marginTop: 4 }}>
                <Link href="/login" style={linkStyle}>
                  로그인 페이지로 이동
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
