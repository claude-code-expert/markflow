'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { useToastStore } from '../../stores/toast-store';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface InviteStatusTabProps {
  workspaceId: string;
}

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '만료됨';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '1시간 미만';
  if (hours < 24) return `${hours}시간 후 만료`;
  return `${Math.floor(hours / 24)}일 후 만료`;
}

export function InviteStatusTab({ workspaceId }: InviteStatusTabProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadInvitations();
  }, [workspaceId]);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ invitations: Invitation[] }>(`/workspaces/${workspaceId}/invitations`);
      setInvitations(res.invitations);
    } catch {
      addToast({ message: '초대 목록을 불러올 수 없습니다', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await apiFetch(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'PATCH',
        body: { action: 'resend' },
      });
      addToast({ message: '재발송되었습니다', type: 'success' });
      void loadInvitations();
    } catch {
      addToast({ message: '재발송에 실패했습니다', type: 'error' });
    }
  };

  if (loading) return <p style={{ padding: '20px', color: 'var(--text-3)', fontSize: '14px' }}>로딩 중...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
          발송된 초대 링크를 관리합니다. 초대는 72시간 후 자동 만료됩니다.
        </p>
      </div>

      {invitations.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', fontSize: '14px' }}>
          발송된 초대가 없습니다
        </p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {invitations.map((inv, idx) => {
            const timeRemaining = formatTimeRemaining(inv.expiresAt);
            const isExpiring = new Date(inv.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
            return (
              <div
                key={inv.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 18px',
                  borderBottom: idx < invitations.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'var(--surface-3)', color: 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', flexShrink: 0,
                }}>?</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{inv.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    {inv.role} 권한 · <strong style={{ color: isExpiring ? 'var(--amber)' : 'var(--text-3)' }}>{timeRemaining}</strong>
                  </div>
                </div>
                <button
                  onClick={() => handleResend(inv.id)}
                  style={{
                    padding: '6px 13px', fontSize: '12.5px', fontWeight: 500,
                    background: 'var(--surface)', color: 'var(--text-2)',
                    border: '1.5px solid var(--border-2)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  재발송
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
