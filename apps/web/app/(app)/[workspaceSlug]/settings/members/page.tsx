'use client';

import { useState, type FormEvent, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../../../../lib/api';
import type {
  WorkspaceMember,
  WorkspaceRole,
  MembersResponse,
  InvitationResponse,
} from '../../../../../lib/types';
import { useWorkspaceStore } from '../../../../../stores/workspace-store';
import { usePermissions } from '../../../../../hooks/use-permissions';

// ─── Constants ───────────────────────────────────────────────────────────────

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'var(--purple-lt)', text: 'var(--purple)' },
  admin: { bg: 'var(--accent-2)', text: 'var(--accent)' },
  editor: { bg: 'var(--green-lt)', text: 'var(--green)' },
  viewer: { bg: 'var(--surface-2)', text: 'var(--text-3)' },
};

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
  viewer: '뷰어',
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '40px 24px',
  } satisfies CSSProperties,

  header: { marginBottom: 32 } satisfies CSSProperties,

  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  } satisfies CSSProperties,

  subtitle: {
    fontSize: 14,
    color: 'var(--text-3)',
    marginTop: 6,
  } satisfies CSSProperties,

  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: 24,
    marginBottom: 24,
  } satisfies CSSProperties,

  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text)',
    margin: '0 0 16px 0',
  } satisfies CSSProperties,

  input: {
    display: 'block',
    width: '100%',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 13px',
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box' as const,
  } satisfies CSSProperties,

  select: {
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    cursor: 'pointer',
  } satisfies CSSProperties,

  primaryBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } satisfies CSSProperties,

  alertError: {
    marginBottom: 16,
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--red-lt)',
    border: '1px solid var(--red)',
    color: 'var(--red)',
  } satisfies CSSProperties,

  spinner: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid var(--accent)',
    borderTopColor: 'transparent',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  } satisfies CSSProperties,

  disabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  } satisfies CSSProperties,

  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 0',
    borderBottom: '1px solid var(--border)',
  } satisfies CSSProperties,

  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--accent-2)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
    fontFamily: 'var(--font-heading)',
  } satisfies CSSProperties,

  memberInfo: {
    flex: 1,
    minWidth: 0,
  } satisfies CSSProperties,

  memberName: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } satisfies CSSProperties,

  memberEmail: {
    fontSize: 12,
    color: 'var(--text-3)',
    marginTop: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } satisfies CSSProperties,

  removeBtn: {
    border: 'none',
    background: 'none',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--red)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    transition: 'opacity 0.15s ease',
  } satisfies CSSProperties,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS['viewer']!;
  const label = ROLE_LABELS[role] ?? role;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '100px',
        fontSize: '11.5px',
        fontWeight: 500,
        background: colors.bg,
        color: colors.text,
      }}
    >
      {label}
    </span>
  );
}

function getInitial(name: string): string {
  return (name.charAt(0) || '?').toUpperCase();
}

// ─── MemberRow ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  canManage,
  onRoleChange,
  onRemove,
  isUpdating,
}: {
  member: WorkspaceMember;
  canManage: boolean;
  onRoleChange: (userId: string, role: WorkspaceRole) => void;
  onRemove: (userId: string, name: string) => void;
  isUpdating: boolean;
}) {
  const isOwner = member.role === 'owner';

  return (
    <div style={s.memberRow}>
      {/* Avatar */}
      {member.userAvatarUrl ? (
        <img
          src={member.userAvatarUrl}
          alt={member.userName}
          style={{ ...s.avatar, objectFit: 'cover' as const }}
        />
      ) : (
        <div style={s.avatar}>{getInitial(member.userName)}</div>
      )}

      {/* Info */}
      <div style={s.memberInfo}>
        <div style={s.memberName}>{member.userName}</div>
        <div style={s.memberEmail}>{member.userEmail}</div>
      </div>

      {/* Role */}
      {isOwner || !canManage ? (
        <RoleBadge role={member.role} />
      ) : (
        <select
          value={member.role}
          onChange={(e) => onRoleChange(member.userId, e.target.value as WorkspaceRole)}
          disabled={isUpdating}
          style={{
            ...s.select,
            ...(isUpdating ? s.disabled : {}),
          }}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      )}

      {/* Remove */}
      {!isOwner && canManage && (
        <button
          type="button"
          onClick={() => onRemove(member.userId, member.userName)}
          disabled={isUpdating}
          style={{
            ...s.removeBtn,
            ...(isUpdating ? s.disabled : {}),
          }}
        >
          제거
        </button>
      )}
    </div>
  );
}

// ─── InviteForm ──────────────────────────────────────────────────────────────

function InviteForm({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('editor');
  const [error, setError] = useState('');

  const invite = useMutation({
    mutationFn: (payload: { email: string; role: WorkspaceRole }) =>
      apiFetch<InvitationResponse>(
        `/workspaces/${workspaceId}/invitations`,
        { method: 'POST', body: payload },
      ),
    onSuccess: () => {
      setEmail('');
      setRole('editor');
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('초대 발송 중 오류가 발생했습니다.');
      }
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('이메일을 입력해주세요.');
      return;
    }
    invite.mutate({ email: trimmed, role });
  }

  return (
    <div style={s.card}>
      <h2 style={s.sectionTitle}>멤버 초대</h2>

      {error && <div style={s.alertError}>{error}</div>}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' as const }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label
            htmlFor="inviteEmail"
            style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}
          >
            이메일
          </label>
          <input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            style={s.input}
          />
        </div>

        <div style={{ width: 120 }}>
          <label
            htmlFor="inviteRole"
            style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}
          >
            역할
          </label>
          <select
            id="inviteRole"
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            style={{ ...s.select, width: '100%', padding: '10px 13px' }}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={invite.isPending}
          style={{
            ...s.primaryBtn,
            ...(invite.isPending ? s.disabled : {}),
          }}
        >
          {invite.isPending ? '전송 중...' : '초대'}
        </button>
      </form>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const queryClient = useQueryClient();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const permissions = usePermissions(currentWorkspace?.role ?? null);

  const workspaceId = currentWorkspace?.id ?? '';

  // ── Fetch members ──
  const { data, isLoading } = useQuery<MembersResponse>({
    queryKey: ['members', workspaceId],
    queryFn: () =>
      apiFetch<MembersResponse>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });

  const members = data?.members ?? [];

  // ── Mutations ──
  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      apiFetch(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    },
  });

  function handleRoleChange(userId: string, role: WorkspaceRole) {
    updateRole.mutate({ userId, role });
  }

  function handleRemove(userId: string, name: string) {
    if (window.confirm(`${name}님을 워크스페이스에서 제거하시겠습니까?`)) {
      removeMember.mutate(userId);
    }
  }

  // ── Loading ──
  if (!currentWorkspace || isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={s.spinner} />
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>멤버 목록을 불러오는 중...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const canManage = permissions.canChangeRole && permissions.canRemoveMember;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>멤버 관리</h1>
        <p style={s.subtitle}>
          {currentWorkspace.name} 워크스페이스의 멤버를 관리합니다
        </p>
      </div>

      {/* Invite Section (admin+ only) */}
      {permissions.canInviteMember && (
        <InviteForm workspaceId={workspaceId} />
      )}

      {/* Members List */}
      <div style={s.card}>
        <h2 style={s.sectionTitle}>
          멤버 ({members.length})
        </h2>

        {members.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>
            멤버가 없습니다.
          </p>
        ) : (
          <div>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManage={canManage}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
                isUpdating={updateRole.isPending || removeMember.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
