'use client';

import { useState, useEffect, type FormEvent, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../../../../lib/api';
import type { WorkspaceResponse } from '../../../../lib/types';
import { useWorkspaceStore } from '../../../../stores/workspace-store';
import { usePermissions } from '../../../../hooks/use-permissions';

/* ---------- Styles ---------- */

const styles = {
  container: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '40px 24px',
  } satisfies CSSProperties,

  header: {
    marginBottom: 32,
  } satisfies CSSProperties,

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

  fieldGroup: {
    marginBottom: 20,
  } satisfies CSSProperties,

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-2)',
    marginBottom: 6,
  } satisfies CSSProperties,

  input: {
    display: 'block',
    width: '100%',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 13px',
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  } satisfies CSSProperties,

  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  } satisfies CSSProperties,

  toggleLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
    margin: 0,
  } satisfies CSSProperties,

  toggleDesc: {
    fontSize: 12,
    color: 'var(--text-3)',
    marginTop: 2,
  } satisfies CSSProperties,

  toggleTrack: (active: boolean): CSSProperties => ({
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    background: active ? 'var(--accent)' : 'var(--border)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    flexShrink: 0,
    padding: 0,
  }),

  toggleThumb: (active: boolean): CSSProperties => ({
    position: 'absolute',
    top: 2,
    left: active ? 22 : 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,.15)',
    transition: 'left 0.2s ease',
    pointerEvents: 'none',
  }),

  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 20,
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
    transition: 'background 0.15s ease, opacity 0.15s ease',
  } satisfies CSSProperties,

  dangerCard: {
    background: 'var(--red-lt)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--red)',
    padding: 24,
    marginBottom: 24,
  } satisfies CSSProperties,

  dangerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--red)',
    margin: '0 0 8px 0',
  } satisfies CSSProperties,

  dangerDesc: {
    fontSize: 13,
    color: 'var(--text-2)',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  } satisfies CSSProperties,

  dangerBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: 'var(--red)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } satisfies CSSProperties,

  alertSuccess: {
    marginBottom: 20,
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--green-lt)',
    border: '1px solid var(--green)',
    color: 'var(--green)',
  } satisfies CSSProperties,

  alertError: {
    marginBottom: 20,
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--red-lt)',
    border: '1px solid var(--red)',
    color: 'var(--red)',
  } satisfies CSSProperties,

  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies CSSProperties,

  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,.4)',
  } satisfies CSSProperties,

  modal: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 440,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    boxShadow: 'var(--shadow-lg)',
  } satisfies CSSProperties,

  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text)',
    margin: '0 0 8px 0',
  } satisfies CSSProperties,

  modalDesc: {
    fontSize: 13,
    color: 'var(--text-2)',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  } satisfies CSSProperties,

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  } satisfies CSSProperties,

  cancelBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
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

  accessDenied: {
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--amber-lt)',
    border: '1px solid var(--amber)',
    color: 'var(--amber)',
  } satisfies CSSProperties,

  disabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  } satisfies CSSProperties,
} as const;

/* ---------- Component ---------- */

export default function WorkspaceSettingsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const { workspaces, currentWorkspace, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (workspaces.length === 0) void fetchWorkspaces();
  }, [workspaces.length, fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      const found = workspaces.find((ws) => ws.slug === workspaceSlug);
      if (found) setCurrentWorkspace(found);
    }
  }, [currentWorkspace, workspaces, workspaceSlug, setCurrentWorkspace]);

  const wsId = currentWorkspace?.id;

  const [workspace, setWorkspace] = useState<WorkspaceResponse['workspace'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Delete
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // workspace detail API에 role이 없으므로 목록에서 가져온 currentWorkspace.role 사용
  const permissions = usePermissions(currentWorkspace?.role ?? null);

  useEffect(() => {
    if (!wsId) return;

    async function loadWorkspace() {
      setIsLoading(true);
      try {
        const data = await apiFetch<WorkspaceResponse>(
          `/workspaces/${wsId}`,
        );
        setWorkspace(data.workspace);
        setEditName(data.workspace.name);
        setEditSlug(data.workspace.slug);
        setEditIsPublic(data.workspace.isPublic);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('워크스페이스 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, [wsId]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!editName.trim()) {
      setError('워크스페이스 이름을 입력해주세요.');
      return;
    }
    if (!editSlug.trim() || !/^[a-z0-9-]+$/.test(editSlug.trim())) {
      setError('URL은 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }
    if (!workspace) return;

    setIsSaving(true);
    try {
      const data = await apiFetch<WorkspaceResponse>(
        `/workspaces/${wsId}`,
        {
          method: 'PATCH',
          body: {
            name: editName.trim(),
            slug: editSlug.trim() !== workspace.slug ? editSlug.trim() : undefined,
            isPublic: editIsPublic,
          },
        },
      );
      setWorkspace(data.workspace);
      setEditSlug(data.workspace.slug);
      setSuccessMessage('설정이 저장되었습니다.');

      // slug가 변경되었으면 store 갱신 후 새 URL로 이동
      if (data.workspace.slug !== workspaceSlug) {
        await fetchWorkspaces();
        const { workspaces: updated } = useWorkspaceStore.getState();
        const newWs = updated.find((ws) => ws.id === wsId);
        if (newWs) setCurrentWorkspace(newWs);
        router.replace(`/${data.workspace.slug}/settings`);
      } else {
        await fetchWorkspaces();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        console.error('Settings save error:', err);
        setError(err.message);
      } else {
        setError('설정 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!workspace || deleteConfirmName !== workspace.name) return;

    setIsDeleting(true);
    setError('');
    try {
      await apiFetch(`/workspaces/${wsId}`, {
        method: 'DELETE',
        body: { confirmName: deleteConfirmName },
      });
      await fetchWorkspaces();
      router.push('/workspaces');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('워크스페이스 삭제 중 오류가 발생했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function getInputStyle(fieldName: string): CSSProperties {
    const base: CSSProperties = { ...styles.input };
    if (focusedField === fieldName) {
      base.borderColor = 'var(--accent)';
      base.boxShadow = '0 0 0 3px rgba(26,86,219,.1)';
    }
    return base;
  }

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={styles.spinner} />
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  /* ---------- Not found ---------- */
  if (!workspace) {
    return (
      <div style={styles.container}>
        <div style={styles.alertError}>
          {error || '워크스페이스를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  /* ---------- Access denied ---------- */
  if (!permissions.canEditWorkspace) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          워크스페이스 설정은 소유자만 접근할 수 있습니다.
        </div>
      </div>
    );
  }

  /* ---------- Main ---------- */
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>설정</h1>
        <p style={styles.subtitle}>
          {workspace.name} 워크스페이스의 설정을 관리합니다
        </p>
      </div>

      {/* Messages */}
      {error && <div style={styles.alertError}>{error}</div>}
      {successMessage && <div style={styles.alertSuccess}>{successMessage}</div>}

      {/* General Settings Card */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>일반</h2>
        <form onSubmit={handleSave} noValidate>
          {/* Workspace Name */}
          <div style={styles.fieldGroup}>
            <label htmlFor="settingsName" style={styles.label}>
              워크스페이스 이름
            </label>
            <input
              id="settingsName"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle('name')}
              placeholder="워크스페이스 이름"
            />
          </div>

          {/* Workspace Slug */}
          <div style={styles.fieldGroup}>
            <label htmlFor="settingsSlug" style={styles.label}>
              워크스페이스 URL
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <span style={{
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--text-3)',
                background: 'var(--surface-2)',
                borderWidth: '1.5px',
                borderStyle: 'solid',
                borderColor: 'var(--border)',
                borderRight: 'none',
                borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                whiteSpace: 'nowrap' as const,
              }}>
                {typeof window !== 'undefined' ? window.location.host : ''}/
              </span>
              <input
                id="settingsSlug"
                type="text"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onFocus={() => setFocusedField('slug')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...getInputStyle('slug'),
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  flex: 1,
                }}
                placeholder="workspace-url"
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              영문 소문자, 숫자, 하이픈(-)만 사용 가능. 중복 불가.
            </p>
          </div>

          {/* Public/Private Toggle */}
          <div style={{ ...styles.fieldGroup, marginBottom: 0 }}>
            <div style={styles.toggleRow}>
              <div>
                <p style={styles.toggleLabel}>공개 워크스페이스</p>
                <p style={styles.toggleDesc}>
                  공개로 설정하면 누구나 이 워크스페이스를 검색하고 가입 요청을 보낼 수 있습니다
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editIsPublic}
                onClick={() => setEditIsPublic((prev) => !prev)}
                style={styles.toggleTrack(editIsPublic)}
              >
                <span style={styles.toggleThumb(editIsPublic)} />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div style={styles.btnRow}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                ...styles.primaryBtn,
                ...(isSaving ? styles.disabled : {}),
              }}
            >
              {isSaving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div style={styles.dangerCard}>
        <h2 style={styles.dangerTitle}>위험 구역</h2>
        <p style={styles.dangerDesc}>
          워크스페이스를 삭제하면 모든 문서, 멤버 정보가 영구적으로 삭제됩니다.
          이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          style={styles.dangerBtn}
        >
          워크스페이스 삭제
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && (
        <div style={styles.overlay}>
          <div
            style={styles.backdrop}
            onClick={() => setShowDeleteDialog(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowDeleteDialog(false);
            }}
            role="button"
            tabIndex={-1}
            aria-label="모달 닫기"
          />
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>워크스페이스 삭제</h3>
            <p style={styles.modalDesc}>
              이 작업은 되돌릴 수 없습니다. 확인을 위해 워크스페이스 이름{' '}
              <strong style={{ color: 'var(--text)' }}>{workspace.name}</strong>
              을(를) 입력해주세요.
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              onFocus={() => setFocusedField('delete')}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle('delete')}
              placeholder={workspace.name}
            />
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmName('');
                }}
                style={styles.cancelBtn}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteConfirmName !== workspace.name || isDeleting}
                style={{
                  ...styles.dangerBtn,
                  ...(deleteConfirmName !== workspace.name || isDeleting ? styles.disabled : {}),
                }}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
