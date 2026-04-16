'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { parseMarkdown } from '@markflow/editor';
import '@markflow/editor/styles';
import { formatKstDate } from '../lib/date';

interface GraphPreviewModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
  document: {
    id: number;
    title: string;
    content: string;
    categoryName?: string | null;
    categoryColor?: string;
    updatedAt?: string;
  } | null;
}

export function GraphPreviewModal({
  open,
  onClose,
  workspaceSlug,
  document: doc,
}: GraphPreviewModalProps) {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  const html = useMemo(() => {
    if (!doc?.content) return '';
    return parseMarkdown(doc.content);
  }, [doc?.content]);

  if (!open || !doc) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          padding: 0,
          maxWidth: 680,
          width: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {doc.categoryName && (
            <span
              style={{
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 100,
                background: doc.categoryColor
                  ? hexToRgba(doc.categoryColor, 0.1)
                  : 'var(--surface-2)',
                color: doc.categoryColor ?? 'var(--text-2)',
                border: `1px solid ${doc.categoryColor ? hexToRgba(doc.categoryColor, 0.3) : 'var(--border)'}`,
                flexShrink: 0,
              }}
            >
              {doc.categoryName}
            </span>
          )}
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {doc.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: 'none',
              background: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-3)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          className="mf-preview"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            fontSize: 14,
            lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {doc.updatedAt && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {formatKstDate(doc.updatedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/${encodeURIComponent(workspaceSlug)}/doc/${doc.id}`);
            }}
            style={{
              marginLeft: 'auto',
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            문서 열기
          </button>
        </div>
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
