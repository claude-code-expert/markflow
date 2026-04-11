'use client';

import { useState, useEffect, type FormEvent, type CSSProperties } from 'react';
import { apiFetch, ApiError, setAccessToken } from '../lib/api';
import { useToastStore } from '../stores/toast-store';

/* ---------- Types ---------- */

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PasswordCheck {
  label: string;
  passed: boolean;
}

interface PasswordChangeResponse {
  accessToken: string;
  refreshToken: string;
}

/* ---------- Helpers ---------- */

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: '8자 이상', passed: password.length >= 8 },
    { label: '영문 포함', passed: /[a-zA-Z]/.test(password) },
    { label: '숫자 포함', passed: /\d/.test(password) },
    { label: '특수문자 포함', passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}

function extractLockMinutes(message: string): number {
  const match = /(\d+)\s*(분|min)/i.exec(message);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 15;
}

/* ---------- Styles ---------- */

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  } satisfies CSSProperties,

  card: {
    width: '100%',
    maxWidth: 440,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: 32,
  } satisfies CSSProperties,

  heading: {
    fontSize: 18,
    fontWeight: 600,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: 0,
  } satisfies CSSProperties,

  description: {
    fontSize: 14,
    color: 'var(--text-3)',
    marginBottom: 24,
    marginTop: 8,
    lineHeight: 1.6,
  } satisfies CSSProperties,

  fieldGroup: {
    marginBottom: 16,
    textAlign: 'left' as const,
  } satisfies CSSProperties,

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: 8,
  } satisfies CSSProperties,

  input: (hasError: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: hasError ? 'var(--red)' : 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
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
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 9999,
    background: passed ? 'rgba(34,197,94,.1)' : 'rgba(156,163,175,.1)',
    color: passed ? 'var(--green, #16a34a)' : 'var(--text-muted)',
    transition: 'background .2s, color .2s',
  }),

  alertError: {
    marginBottom: 16,
    borderRadius: 'var(--radius-sm)',
    padding: '8px 16px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--red-lt)',
    border: '1px solid var(--red)',
    color: 'var(--red)',
  } satisfies CSSProperties,

  alertWarning: {
    marginBottom: 16,
    borderRadius: 'var(--radius-sm)',
    padding: '8px 16px',
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

  primaryBtn: (disabled: boolean): CSSProperties => ({
    width: '100%',
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'background 0.15s ease',
  }),

  cancelBtn: {
    width: '100%',
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  } satisfies CSSProperties,

  btnRow: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  } satisfies CSSProperties,
} as const;

/* ---------- Focus helpers ---------- */

function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--accent)';
  e.target.style.boxShadow = '0 0 0 3px rgba(26,86,219,.1)';
}

function handleInputBlur(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
  e.target.style.borderColor = hasError ? 'var(--red)' : 'var(--border)';
  e.target.style.boxShadow = 'none';
}

/* ---------- Component ---------- */

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const addToast = useToastStore((s) => s.addToast);
  const passwordChecks = getPasswordChecks(newPassword);
  const allChecksPassed = passwordChecks.every((c) => c.passed);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsSubmitting(false);
      setApiError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = '현재 비밀번호를 입력해주세요.';
    }

    if (!allChecksPassed) {
      errors.newPassword = '8자 이상, 영문, 숫자, 특수문자를 모두 포함해야 합니다.';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = '새 비밀번호가 일치하지 않습니다.';
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError(null);

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<PasswordChangeResponse>('/users/me/password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });

      // Update access token in memory
      setAccessToken(response.accessToken);

      // Close modal first
      onClose();

      // Show success toast
      addToast({ message: '비밀번호가 변경되었습니다', type: 'success' });
      addToast({ message: '다른 기기의 로그인이 모두 해제되었습니다.', type: 'info' });
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            setApiError({
              code: err.code,
              message: '현재 비밀번호가 올바르지 않습니다.',
            });
            break;
          case 'ACCOUNT_LOCKED': {
            const minutes = extractLockMinutes(err.message);
            setApiError({
              code: err.code,
              message: `계정이 잠겼습니다. ${minutes}분 후에 다시 시도해주세요.`,
            });
            break;
          }
          case 'RATE_LIMITED':
            setApiError({
              code: err.code,
              message: '시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
            });
            break;
          case 'INVALID_PASSWORD':
            setApiError({
              code: err.code,
              message: err.message,
            });
            break;
          default:
            setApiError({
              code: err.code,
              message: err.message,
            });
        }
      } else {
        setApiError({
          code: 'NETWORK_ERROR',
          message: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isWarning = apiError?.code === 'ACCOUNT_LOCKED' || apiError?.code === 'RATE_LIMITED';
  const isButtonDisabled = isSubmitting || apiError?.code === 'ACCOUNT_LOCKED';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="비밀번호 변경"
      >
        <h2 style={styles.heading}>비밀번호 변경</h2>
        <p style={styles.description}>
          보안을 위해 현재 비밀번호를 확인한 후 변경합니다.
        </p>

        {/* API Error / Warning Alert */}
        {apiError && (
          <div
            style={isWarning ? styles.alertWarning : styles.alertError}
            role="alert"
          >
            {apiError.message}
            {apiError.code === 'ACCOUNT_LOCKED' && (
              <div style={styles.countdownBadge} />
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <div style={styles.fieldGroup}>
            <label htmlFor="currentPassword" style={styles.label}>
              현재 비밀번호
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="현재 비밀번호를 입력하세요"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.currentPassword;
                  return next;
                });
              }}
              onFocus={handleInputFocus}
              onBlur={(e) => handleInputBlur(e, !!fieldErrors.currentPassword)}
              style={styles.input(!!fieldErrors.currentPassword)}
            />
            {fieldErrors.currentPassword && (
              <p style={styles.fieldError}>{fieldErrors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div style={styles.fieldGroup}>
            <label htmlFor="newPassword" style={styles.label}>
              새 비밀번호
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="8자 이상, 영문+숫자+특수문자"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.newPassword;
                  return next;
                });
              }}
              onFocus={handleInputFocus}
              onBlur={(e) => handleInputBlur(e, !!fieldErrors.newPassword)}
              style={styles.input(!!fieldErrors.newPassword)}
            />
            {newPassword.length > 0 && (
              <div style={styles.hintRow} data-testid="hint-pills">
                {passwordChecks.map((check) => (
                  <span
                    key={check.label}
                    style={styles.hintPill(check.passed)}
                    data-testid={`hint-${check.label}`}
                    data-passed={check.passed}
                  >
                    {check.passed ? '\u2713' : '\u2022'} {check.label}
                  </span>
                ))}
              </div>
            )}
            {fieldErrors.newPassword && (
              <p style={styles.fieldError}>{fieldErrors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ ...styles.fieldGroup, marginBottom: 0 }}>
            <label htmlFor="confirmPassword" style={styles.label}>
              새 비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="새 비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.confirmPassword;
                  return next;
                });
              }}
              onFocus={handleInputFocus}
              onBlur={(e) => handleInputBlur(e, !!fieldErrors.confirmPassword)}
              style={styles.input(!!fieldErrors.confirmPassword)}
            />
            {fieldErrors.confirmPassword && (
              <p style={styles.fieldError}>{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Actions */}
          <div style={styles.btnRow}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              tabIndex={0}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isButtonDisabled}
              style={styles.primaryBtn(!!isButtonDisabled)}
              tabIndex={0}
            >
              {isSubmitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
