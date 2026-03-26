'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace-store';
import type { CreateWorkspaceResponse } from '../lib/types';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

interface SlugCheckResponse {
  available: boolean;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]+/g, '') // Remove Korean characters
    .replace(/[^a-z0-9-\s]/g, '')        // Keep only alphanumeric, hyphens, spaces
    .replace(/\s+/g, '-')                 // Spaces to hyphens
    .replace(/-+/g, '-')                  // Collapse multiple hyphens
    .replace(/^-|-$/g, '');               // Trim leading/trailing hyphens
}

export function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const { fetchWorkspaces } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSlugAvailability = useCallback(async (slugValue: string) => {
    if (slugValue.length < 2) {
      setSlugAvailable(null);
      return;
    }

    setSlugChecking(true);
    try {
      const result = await apiFetch<SlugCheckResponse>(
        `/workspaces/check-slug?slug=${encodeURIComponent(slugValue)}`,
      );
      setSlugAvailable(result.available);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  // Debounced slug check
  useEffect(() => {
    if (!open) return;

    if (slugCheckTimerRef.current) {
      clearTimeout(slugCheckTimerRef.current);
    }

    if (slug.length >= 2) {
      slugCheckTimerRef.current = setTimeout(() => {
        void checkSlugAvailability(slug);
      }, 400);
    } else {
      setSlugAvailable(null);
    }

    return () => {
      if (slugCheckTimerRef.current) {
        clearTimeout(slugCheckTimerRef.current);
      }
    };
  }, [slug, open, checkSlugAvailability]);

  // ESC key handler
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(toSlug(value));
  }

  // Reset on close
  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setSlugAvailable(null);
      setSlugChecking(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('워크스페이스 이름을 입력해주세요.');
      return;
    }

    if (!slug || slug.length < 2) {
      setError('슬러그는 2자 이상이어야 합니다.');
      return;
    }

    if (slugAvailable === false) {
      setError('이미 사용 중인 슬러그입니다. 다른 슬러그를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiFetch<CreateWorkspaceResponse>('/workspaces', {
        method: 'POST',
        body: { name: name.trim(), slug },
      });

      await fetchWorkspaces();
      onClose();
      router.push(`/${result.workspace.slug}/docs`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SLUG_TAKEN') {
          setSlugAvailable(false);
          setError('이미 사용 중인 슬러그입니다.');
        } else {
          setError(err.message);
        }
      } else {
        setError('워크스페이스 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 13px',
    fontSize: '14px',
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px rgba(26,86,219,.1)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: '6px',
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{ padding: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ws-title"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 0 24px',
          }}
        >
          <h2
            id="create-ws-title"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0,
              fontFamily: 'var(--font-heading)',
            }}
          >
            새 워크스페이스
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--text-3)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-3)';
            }}
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px 24px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--red)',
                background: 'var(--red-lt)',
                color: 'var(--red)',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* Name input */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="wsName" style={labelStyle}>
              워크스페이스 이름
            </label>
            <input
              id="wsName"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="예: 개발팀 위키"
              autoFocus
              style={inputStyle}
              onFocus={(e) => {
                Object.assign(e.currentTarget.style, inputFocusStyle);
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Slug input */}
          <div style={{ marginBottom: '6px' }}>
            <label htmlFor="wsSlug" style={labelStyle}>
              슬러그 (URL)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '14px',
                  color: 'var(--text-3)',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                /
              </span>
              <input
                id="wsSlug"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="dev-wiki"
                style={inputStyle}
                onFocus={(e) => {
                  Object.assign(e.currentTarget.style, inputFocusStyle);
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {/* Slug status */}
            <div style={{ minHeight: '20px', marginTop: '6px' }}>
              {slugChecking && (
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                  확인 중...
                </p>
              )}
              {!slugChecking && slugAvailable === true && slug.length >= 2 && (
                <p style={{ fontSize: '12px', color: 'var(--green)', margin: 0 }}>
                  /{slug} — 사용 가능한 슬러그입니다
                </p>
              )}
              {!slugChecking && slugAvailable === false && (
                <p style={{ fontSize: '12px', color: 'var(--red)', margin: 0 }}>
                  이미 사용 중인 슬러그입니다
                </p>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border)',
              marginTop: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || slugAvailable === false}
              style={{
                padding: '9px 22px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isSubmitting || slugAvailable === false
                  ? 'var(--border-2)'
                  : 'var(--accent)',
                color: isSubmitting || slugAvailable === false
                  ? 'var(--text-3)'
                  : '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: isSubmitting || slugAvailable === false
                  ? 'not-allowed'
                  : 'pointer',
                transition: 'background 0.15s',
                opacity: isSubmitting || slugAvailable === false ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && slugAvailable !== false) {
                  e.currentTarget.style.background = 'var(--accent-dk)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && slugAvailable !== false) {
                  e.currentTarget.style.background = 'var(--accent)';
                }
              }}
            >
              {isSubmitting ? '생성 중...' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
