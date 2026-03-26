'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth-store';

interface InvitationDetail {
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  inviterName: string;
  email: string;
  expiresAt: string;
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  Owner: 'bg-purple-100 text-purple-700',
  Admin: 'bg-blue-100 text-blue-700',
  Editor: 'bg-green-100 text-green-700',
  Viewer: 'bg-gray-100 text-gray-600',
};

const ROLE_LABELS: Record<string, string> = {
  Owner: '소유자',
  Admin: '관리자',
  Editor: '편집자',
  Viewer: '뷰어',
};

function getErrorTitle(code: string): string {
  switch (code) {
    case 'INVITATION_EXPIRED':
      return '초대가 만료되었습니다';
    case 'ALREADY_MEMBER':
      return '이미 멤버입니다';
    case 'INVITATION_NOT_FOUND':
      return '초대를 찾을 수 없습니다';
    default:
      return '오류가 발생했습니다';
  }
}

function getErrorDescription(code: string): string {
  switch (code) {
    case 'INVITATION_EXPIRED':
      return '이 초대 링크는 만료되었습니다. 워크스페이스 관리자에게 새 초대를 요청해주세요.';
    case 'ALREADY_MEMBER':
      return '이미 이 워크스페이스의 멤버입니다. 워크스페이스로 이동합니다.';
    case 'INVITATION_NOT_FOUND':
      return '유효하지 않은 초대 링크입니다. URL을 확인해주세요.';
    default:
      return '초대를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.';
  }
}

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch invitation details
  useEffect(() => {
    async function loadInvitation() {
      setIsLoading(true);
      try {
        const data = await apiFetch<InvitationDetail>(
          `/invitations/${encodeURIComponent(token)}`,
        );
        setInvitation(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorCode(err.code);
          setErrorMessage(err.message);
        } else {
          setErrorCode('UNKNOWN');
          setErrorMessage('초대 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvitation();
  }, [token]);

  async function handleAccept() {
    setIsAccepting(true);
    setErrorCode('');
    setErrorMessage('');

    try {
      const result = await apiFetch<{ workspaceSlug: string }>(
        `/invitations/${encodeURIComponent(token)}/accept`,
        { method: 'POST' },
      );
      router.push(`/${result.workspaceSlug}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);

        // If already member, redirect after delay
        if (err.code === 'ALREADY_MEMBER' && invitation) {
          setTimeout(() => {
            router.push(`/${invitation.workspaceSlug}`);
          }, 2000);
        }
      } else {
        setErrorCode('UNKNOWN');
        setErrorMessage('초대 수락 중 오류가 발생했습니다.');
      }
    } finally {
      setIsAccepting(false);
    }
  }

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">초대 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorCode && !invitation) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            {getErrorTitle(errorCode)}
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            {getErrorDescription(errorCode)}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const roleStyle =
    ROLE_BADGE_STYLES[invitation.role] ?? 'bg-gray-100 text-gray-600';
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Icon */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-7 w-7 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            워크스페이스 초대
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {invitation.inviterName}님이 초대했습니다
          </p>
        </div>

        {/* Invitation details */}
        <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">워크스페이스</span>
            <span className="text-sm font-medium text-gray-900">
              {invitation.workspaceName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">역할</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}
            >
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">초대 대상</span>
            <span className="text-sm text-gray-700">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">만료일</span>
            <span className="text-sm text-gray-700">
              {new Date(invitation.expiresAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Error from accept attempt */}
        {errorCode && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              errorCode === 'ALREADY_MEMBER'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {getErrorDescription(errorCode)}
          </div>
        )}

        {/* Actions */}
        {!isAuthenticated ? (
          <div>
            <p className="mb-4 text-center text-sm text-gray-500">
              초대를 수락하려면 먼저 로그인해주세요
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/login?redirect=${encodeURIComponent(`/invite/${token}`)}`,
                  )
                }
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/register?redirect=${encodeURIComponent(`/invite/${token}`)}`,
                  )
                }
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                회원가입
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              거절
            </button>
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isAccepting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAccepting ? '수락 중...' : '초대 수락'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
