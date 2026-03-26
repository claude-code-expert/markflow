'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../lib/api';
import type { DocumentResponse } from '../lib/types';

interface NewDocModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
  workspaceId: string;
  categories?: Array<{ id: string; name: string }>;
}

export function NewDocModal({
  open,
  onClose,
  workspaceSlug,
  workspaceId,
  categories,
}: NewDocModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form state when modal closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setCategoryId('');
      setError('');
      setIsSubmitting(false);
    }
  }, [open]);

  // Close on ESC key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('문서 제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { document } = await apiFetch<DocumentResponse>(
        `/workspaces/${encodeURIComponent(workspaceId)}/documents`,
        {
          method: 'POST',
          body: {
            title: trimmedTitle,
            ...(categoryId ? { categoryId } : {}),
          },
        },
      );
      onClose();
      router.push(`/${workspaceSlug}/docs/${document.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('문서 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            새 문서
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              border: 'none',
              background: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-3)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-3)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--red-lt)',
              color: 'var(--red)',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid var(--red)',
              borderColor: 'rgba(220, 38, 38, 0.2)',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Title input */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="new-doc-title"
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-2)',
              }}
            >
              제목 <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              id="new-doc-title"
              type="text"
              required
              maxLength={300}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: API 설계 문서"
              autoFocus
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--text)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Category select */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="new-doc-category"
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-2)',
              }}
            >
              카테고리 <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(선택)</span>
            </label>
            <select
              id="new-doc-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--text)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="">카테고리 없음</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-2)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
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
              disabled={isSubmitting || !title.trim()}
              style={{
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                background: isSubmitting || !title.trim() ? 'var(--text-3)' : 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !title.trim() ? 0.6 : 1,
                transition: 'background 0.15s, opacity 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && title.trim()) {
                  e.currentTarget.style.background = 'var(--accent-dk)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && title.trim()) {
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
