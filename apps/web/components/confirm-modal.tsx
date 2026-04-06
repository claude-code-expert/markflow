'use client';

import { useEffect, useCallback } from 'react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'default';
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  isLoading = false,
  variant = 'default',
}: ConfirmModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ padding: 24, maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: 'var(--text-2)',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '9px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-2)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border-2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '9px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
              background: isLoading
                ? 'var(--text-3)'
                : isDanger
                  ? 'var(--red)'
                  : 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'background 0.15s, opacity 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.opacity = '0.85';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {isLoading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
