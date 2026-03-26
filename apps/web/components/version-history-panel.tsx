'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../lib/api';

interface Version {
  id: string;
  versionNumber: number;
  content: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
  documentId: string;
}

export function VersionHistoryPanel({
  open,
  onClose,
  workspaceSlug,
  documentId,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiFetch<Version[]>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/documents/${documentId}/versions`,
      );
      setVersions(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('버전 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, documentId]);

  useEffect(() => {
    if (open) {
      void fetchVersions();
      setSelectedVersionId(null);
      setPreviewContent(null);
    }
  }, [open, fetchVersions]);

  function handleSelectVersion(version: Version) {
    if (selectedVersionId === version.id) {
      setSelectedVersionId(null);
      setPreviewContent(null);
    } else {
      setSelectedVersionId(version.id);
      setPreviewContent(version.content);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!open) return null;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">버전 기록</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="패널 닫기"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && versions.length === 0 && (
          <div className="px-4 py-12 text-center">
            <svg
              className="mx-auto mb-2 h-8 w-8 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gray-400">버전 기록이 없습니다</p>
          </div>
        )}

        {!isLoading && versions.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => handleSelectVersion(version)}
            className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
              selectedVersionId === version.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                v{version.versionNumber}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(version.createdAt)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {version.createdBy.name}
            </p>
          </button>
        ))}
      </div>

      {/* Preview */}
      {previewContent !== null && (
        <div className="border-t border-gray-200">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-medium text-gray-500">미리보기</p>
            <button
              type="button"
              disabled
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-400"
              title="Phase 2에서 지원 예정"
            >
              현재 버전으로 되돌리기
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto border-t border-gray-100 bg-gray-50 px-4 py-3">
            <pre className="whitespace-pre-wrap text-xs text-gray-700">
              {previewContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
