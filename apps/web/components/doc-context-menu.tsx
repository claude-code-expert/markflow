'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import type { TreeDocument } from './category-tree';

interface DocContextMenuProps {
  doc: TreeDocument;
  workspaceSlug: string;
  workspaceId: number;
  position: { x: number; y: number };
  onClose: () => void;
  onRefresh?: () => void;
}

export function DocContextMenu({
  doc,
  workspaceSlug,
  workspaceId,
  position,
  onClose,
  onRefresh,
}: DocContextMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title || '');
  const [isRenaming, setIsRenaming] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Close on outside click / Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleRename = useCallback(async () => {
    if (!renameValue.trim() || renameValue.trim() === doc.title) {
      setShowRename(false);
      return;
    }

    setIsRenaming(true);
    setError('');
    try {
      await apiFetch(
        `/workspaces/${workspaceId}/documents/${doc.id}`,
        { method: 'PATCH', body: { title: renameValue.trim() } },
      );
      onRefresh?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('이름 변경 중 오류가 발생했습니다.');
      }
    } finally {
      setIsRenaming(false);
    }
  }, [renameValue, doc.title, doc.id, workspaceId, onRefresh, onClose]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError('');
    try {
      await apiFetch(
        `/workspaces/${workspaceId}/documents/${doc.id}`,
        { method: 'DELETE' },
      );
      onRefresh?.();
      onClose();
      router.push(`/${workspaceSlug}/doc`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('삭제 중 오류가 발생했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [doc.id, workspaceId, workspaceSlug, onRefresh, onClose, router]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 200,
    minWidth: '160px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 4px 12px rgba(0,0,0,.12)',
    padding: '4px',
  };

  // Delete confirmation
  if (showDeleteConfirm) {
    return (
      <div ref={menuRef} style={menuStyle}>
        <div style={{ padding: '8px', fontSize: '12.5px', color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text)' }}>{doc.title || '제목 없음'}</strong>
          을(를) 휴지통으로 이동할까요?
        </div>
        {error && (
          <div style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--red)' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: '4px', padding: '4px 8px 8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '5px 8px', fontSize: '11px', fontWeight: 500,
              background: 'var(--surface-2)', color: 'var(--text-2)',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '5px 8px', fontSize: '11px', fontWeight: 500,
              background: 'var(--red)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    );
  }

  // Rename inline
  if (showRename) {
    return (
      <div ref={menuRef} style={{ ...menuStyle, minWidth: '220px' }}>
        <div style={{ padding: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', marginBottom: '6px' }}>
            제목 변경
          </div>
          {error && (
            <div style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '4px' }}>{error}</div>
          )}
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRename();
              if (e.key === 'Escape') onClose();
            }}
            autoFocus
            style={{
              width: '100%', padding: '5px 8px', fontSize: '12.5px',
              borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--accent)',
              outline: 'none', fontFamily: 'inherit', background: 'var(--surface)',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '4px 10px', fontSize: '11px', fontWeight: 500,
                background: 'transparent', color: 'var(--text-2)',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleRename()}
              disabled={isRenaming || !renameValue.trim()}
              style={{
                padding: '4px 10px', fontSize: '11px', fontWeight: 500,
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: isRenaming ? 'not-allowed' : 'pointer',
                opacity: (isRenaming || !renameValue.trim()) ? 0.5 : 1,
              }}
            >
              {isRenaming ? '변경 중...' : '변경'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default menu
  return (
    <div ref={menuRef} style={menuStyle}>
      <button
        type="button"
        onClick={() => setShowRename(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', fontSize: '13px', color: 'var(--text-2)',
          background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
          cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Pencil size={14} style={{ opacity: 0.6 }} />
        제목 변경
      </button>
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', fontSize: '13px', color: 'var(--red)',
          background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
          cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-lt)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Trash2 size={14} style={{ opacity: 0.6 }} />
        삭제
      </button>
    </div>
  );
}
