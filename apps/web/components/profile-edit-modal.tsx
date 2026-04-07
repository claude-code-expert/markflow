'use client';

import { useState, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';
import { createUploader, validateAvatarFile, getWorkerUrl, ImageUploadError } from '../lib/image-upload';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
}

interface UpdateUserResponse {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ProfileEditModal({ open, onClose }: ProfileEditModalProps) {
  const { user, setUser } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasWorkerUrl = Boolean(getWorkerUrl());

  const [name, setName] = useState(user?.name ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStorageGuide, setShowStorageGuide] = useState(false);

  if (!open) return null;

  function handleAvatarClick() {
    if (!hasWorkerUrl) {
      // 설정 안 됐으면 파일 선택 대신 설정 페이지로 안내
      setShowStorageGuide(true);
      return;
    }
    fileInputRef.current?.click();
  }

  function handleAvatarSelect(file: File | undefined) {
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setError(validation.error ?? '파일 검증 실패');
      return;
    }

    setError('');
    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setAvatarPreview(result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Avatar를 R2 Worker로 업로드 후 URL 획득
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const uploader = createUploader();
        if (!uploader) {
          setShowStorageGuide(true);
          setIsSubmitting(false);
          return;
        }
        avatarUrl = await uploader(avatarFile);
      }

      // name + avatarUrl을 한 번의 PATCH로 통합
      const body: Record<string, string> = { name: name.trim() };
      if (avatarUrl) body.avatarUrl = avatarUrl;

      const updatedUser = await apiFetch<UpdateUserResponse>('/users/me', {
        method: 'PATCH',
        body,
      });

      setUser(updatedUser);
      onClose();
    } catch (err) {
      if (err instanceof ImageUploadError) {
        setError(err.message);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('프로필 수정 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
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
          <h2 className="text-lg font-semibold text-gray-900">프로필 수정</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg
              className="h-5 w-5"
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

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {error.includes('이미지 저장소') && currentWorkspace && (
              <Link
                href={`/${encodeURIComponent(currentWorkspace.name)}/settings/storage`}
                className="mt-2 block font-medium text-blue-600 underline hover:text-blue-800"
                onClick={onClose}
              >
                이미지 저장소 설정으로 이동 →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarPreview ?? user?.avatarUrl ? (
                <img
                  src={avatarPreview ?? user?.avatarUrl ?? undefined}
                  alt="프로필 사진"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-medium text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
              <button
                type="button"
                onClick={handleAvatarClick}
                className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white p-1.5 ${
                  hasWorkerUrl
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-300 cursor-default'
                }`}
                aria-label="사진 변경"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
            />
            {hasWorkerUrl ? (
              <p className="text-xs text-gray-500">
                JPG, PNG, WebP (최대 5MB)
              </p>
            ) : (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">JPG, PNG, WebP (최대 5MB)</p>
                <p className="text-xs text-amber-600 font-medium">
                  이미지 업로드 연동을 진행하세요
                </p>
                {currentWorkspace && (
                  <Link
                    href={`/${encodeURIComponent(currentWorkspace.name)}/settings/storage`}
                    className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800 underline"
                    onClick={onClose}
                  >
                    저장소 설정으로 이동 →
                  </Link>
                )}
              </div>
            )}

            {/* 저장소 미설정 시 가이드 */}
            {showStorageGuide && currentWorkspace && (
              <div className="mt-2 w-full max-w-xs rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
                <p className="mb-2 font-semibold">이미지 저장소 설정이 필요합니다</p>
                <p className="mb-2 text-amber-700">
                  프로필 사진을 업로드하려면 먼저 Cloudflare R2 이미지 저장소를 연결해야 합니다.
                </p>
                <Link
                  href={`/${encodeURIComponent(currentWorkspace.name)}/settings/storage`}
                  className="inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  onClick={onClose}
                >
                  저장소 설정하기 →
                </Link>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="profileName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              이름
            </label>
            <input
              id="profileName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label
              htmlFor="profileEmail"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              이메일
            </label>
            <input
              id="profileEmail"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

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
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
