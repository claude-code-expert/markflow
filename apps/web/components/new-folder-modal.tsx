'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import type { Category } from './category-tree';

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
  categories: Category[];
  defaultParentId?: string | null;
  onCreated?: () => void;
}

interface CreateCategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
}

/** Build a flat list of { id, path } from a category tree for display in selector */
function flattenCategories(
  categories: Category[],
  parentPath: string = '',
): Array<{ id: string; path: string }> {
  const result: Array<{ id: string; path: string }> = [];
  for (const cat of categories) {
    const path = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
    result.push({ id: cat.id, path });
    if (cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, path));
    }
  }
  return result;
}

export function NewFolderModal({
  open,
  onClose,
  workspaceSlug,
  categories,
  defaultParentId,
  onCreated,
}: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>(defaultParentId ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  // Compute preview path
  const previewPath = useMemo(() => {
    if (!name.trim()) return '';
    const parent = flatCategories.find((c) => c.id === parentId);
    if (parent) {
      return `${parent.path} > ${name.trim()}`;
    }
    return name.trim();
  }, [name, parentId, flatCategories]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setName('');
      setParentId(defaultParentId ?? '');
      setError('');
      setIsSubmitting(false);
    }
  }, [open, defaultParentId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('폴더 이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch<CreateCategoryResponse>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/categories`,
        {
          method: 'POST',
          body: {
            name: name.trim(),
            parentId: parentId || null,
          },
        },
      );
      onCreated?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('폴더 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
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

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">새 폴더</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="folderName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              폴더 이름
            </label>
            <input
              id="folderName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 설계 문서"
              autoFocus
            />
          </div>

          {/* Parent Category Selector */}
          <div>
            <label
              htmlFor="folderParent"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              상위 폴더
            </label>
            <select
              id="folderParent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">최상위 (루트)</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.path}
                </option>
              ))}
            </select>
          </div>

          {/* Path Preview */}
          {previewPath && (
            <div className="rounded-lg bg-gray-50 px-3 py-2.5">
              <p className="mb-1 text-xs font-medium text-gray-500">경로 미리보기</p>
              <p className="text-sm text-gray-700">{previewPath}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '생성 중...' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
