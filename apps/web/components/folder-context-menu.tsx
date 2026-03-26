'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../lib/api';
import type { Category } from './category-tree';

interface FolderContextMenuProps {
  category: Category;
  workspaceSlug: string;
  position: { x: number; y: number };
  onClose: () => void;
  onNewDoc?: () => void;
  onNewFolder?: () => void;
  onRefresh?: () => void;
}

export function FolderContextMenu({
  category,
  workspaceSlug,
  position,
  onClose,
  onNewDoc,
  onNewFolder,
  onRefresh,
}: FolderContextMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState(category.name);
  const [isRenaming, setIsRenaming] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Close on outside click
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
    if (!renameValue.trim() || renameValue.trim() === category.name) {
      setShowRename(false);
      return;
    }

    setIsRenaming(true);
    setError('');
    try {
      await apiFetch(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/categories/${category.id}`,
        {
          method: 'PATCH',
          body: { name: renameValue.trim() },
        },
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
  }, [renameValue, category.name, category.id, workspaceSlug, onRefresh, onClose]);

  const handleDelete = useCallback(async () => {
    if (deleteConfirmName !== category.name) return;

    setIsDeleting(true);
    setError('');
    try {
      await apiFetch(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/categories/${category.id}`,
        { method: 'DELETE' },
      );
      onRefresh?.();
      onClose();
      router.push(`/${workspaceSlug}/docs`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('삭제 중 오류가 발생했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmName, category.name, category.id, workspaceSlug, onRefresh, onClose, router]);

  // Position the menu within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 50,
  };

  // Delete confirmation dialog
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          role="button"
          tabIndex={-1}
          aria-label="모달 닫기"
        />
        <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            폴더 삭제
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            이 작업은 되돌릴 수 없습니다. 하위 문서와 폴더도 모두 삭제됩니다.
            확인을 위해 폴더 이름{' '}
            <span className="font-semibold text-gray-900">{category.name}</span>
            을(를) 입력해주세요.
          </p>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <input
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder={category.name}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteConfirmName !== category.name || isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rename inline dialog
  if (showRename) {
    return (
      <div ref={menuRef} style={menuStyle} className="w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs font-medium text-gray-500">이름 변경</p>
        {error && (
          <p className="mb-2 text-xs text-red-600">{error}</p>
        )}
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleRename();
            if (e.key === 'Escape') onClose();
          }}
          className="mb-2 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleRename()}
            disabled={isRenaming || !renameValue.trim()}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isRenaming ? '변경 중...' : '변경'}
          </button>
        </div>
      </div>
    );
  }

  // Context menu
  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        onClick={() => {
          onNewDoc?.();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
        새 문서
      </button>
      <button
        type="button"
        onClick={() => {
          onNewFolder?.();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        하위 폴더
      </button>
      <div className="my-1 border-t border-gray-100" />
      <button
        type="button"
        onClick={() => setShowRename(true)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        이름 변경
      </button>
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        삭제
      </button>
    </div>
  );
}
