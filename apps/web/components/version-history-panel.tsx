'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { diffLines } from 'diff';
import { apiFetch, ApiError } from '../lib/api';

interface Version {
  id: number;
  version: number;
  content: string;
  createdAt: string;
  createdBy?: {
    id: number;
    name: string;
  } | null;
}

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
  documentId: string;
  currentContent: string;
  onOpenFullModal?: () => void;
  onRestore?: (content: string) => void;
}

/* ─── Diff Modal ─── */

function DiffModal({
  version,
  currentContent,
  onClose,
  onRestore,
}: {
  version: Version;
  currentContent: string;
  onClose: () => void;
  onRestore?: (content: string) => void;
}) {
  const diff = useMemo(() => diffLines(version.content, currentContent), [version.content, currentContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const part of diff) {
      const count = part.value.replace(/\n$/, '').split('\n').length;
      if (part.added) added += count;
      else if (part.removed) removed += count;
    }
    return { added, removed };
  }, [diff]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '90vw', maxWidth: '800px', height: '80vh',
        background: 'var(--surface)', borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>
              v{version.version} → 현재
            </span>
            <span style={{
              fontSize: '12px', color: '#166534', background: '#dcfce7',
              padding: '2px 8px', borderRadius: '100px',
            }}>
              +{stats.added}
            </span>
            <span style={{
              fontSize: '12px', color: '#991b1b', background: '#fee2e2',
              padding: '2px 8px', borderRadius: '100px',
            }}>
              -{stats.removed}
            </span>
            {version.createdBy && (
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                by {version.createdBy.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRestore && (
              <button
                type="button"
                onClick={() => { onRestore(version.content); onClose(); }}
                style={{
                  padding: '7px 16px', fontSize: '13px', fontWeight: 500,
                  color: '#fff', background: 'var(--accent)',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
              >
                이 버전으로 되돌리기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-3)', borderRadius: 'var(--radius-sm)', fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Diff Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 24px',
          fontSize: '13px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: '1.6',
        }}>
          {diff.map((part, i) => {
            const lines = part.value.replace(/\n$/, '').split('\n');

            if (!part.added && !part.removed && lines.length > 6) {
              // Show first 2 and last 2 lines of unchanged blocks
              const first = lines.slice(0, 2);
              const last = lines.slice(-2);
              const collapsed = lines.length - 4;
              return (
                <div key={i}>
                  {first.map((line, j) => (
                    <div key={`${i}-f${j}`} style={{ padding: '1px 8px', color: 'var(--text-3)' }}>
                      <span style={{ userSelect: 'none', marginRight: '8px', opacity: 0.4 }}>&nbsp;</span>
                      {line || ' '}
                    </div>
                  ))}
                  <div style={{
                    padding: '4px 8px', color: 'var(--text-3)', fontStyle: 'italic',
                    fontSize: '11px', background: 'var(--surface-2)', borderRadius: '4px',
                    margin: '4px 0', textAlign: 'center',
                  }}>
                    ··· {collapsed}줄 동일 ···
                  </div>
                  {last.map((line, j) => (
                    <div key={`${i}-l${j}`} style={{ padding: '1px 8px', color: 'var(--text-3)' }}>
                      <span style={{ userSelect: 'none', marginRight: '8px', opacity: 0.4 }}>&nbsp;</span>
                      {line || ' '}
                    </div>
                  ))}
                </div>
              );
            }

            return lines.map((line, j) => (
              <div
                key={`${i}-${j}`}
                style={{
                  padding: '1px 8px',
                  background: part.added ? '#dcfce7' : part.removed ? '#fee2e2' : 'transparent',
                  color: part.added ? '#166534' : part.removed ? '#991b1b' : 'var(--text-2)',
                  borderRadius: '2px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                <span style={{ userSelect: 'none', marginRight: '8px', opacity: 0.5, fontWeight: 600 }}>
                  {part.added ? '+' : part.removed ? '-' : ' '}
                </span>
                {line || ' '}
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Version History Panel ─── */

export function VersionHistoryPanel({
  open,
  onClose,
  workspaceId,
  documentId,
  currentContent,
  onOpenFullModal,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [diffVersion, setDiffVersion] = useState<Version | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ versions: Version[] }>(
        `/workspaces/${workspaceId}/documents/${documentId}/versions`,
      );
      setVersions(data.versions);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('버전 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, documentId]);

  useEffect(() => {
    if (open) {
      void fetchVersions();
      setDiffVersion(null);
    }
  }, [open, fetchVersions]);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (!open) return null;

  return (
    <>
      <div style={{
        width: '320px', height: '100%', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--border)', background: 'var(--surface)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>버전 기록</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {onOpenFullModal && (
              <button
                type="button"
                onClick={onOpenFullModal}
                style={{
                  padding: '4px 8px', fontSize: '12px', fontWeight: 500,
                  color: 'var(--accent)', background: 'transparent',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
              >
                전체 보기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-3)', borderRadius: 'var(--radius-sm)',
              }}
              aria-label="패널 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Version List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid var(--accent)', borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
          )}

          {error && (
            <div style={{
              margin: '12px', padding: '8px 12px', fontSize: '12px',
              color: 'var(--red)', background: 'var(--red-lt)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)',
            }}>
              {error}
            </div>
          )}

          {!isLoading && !error && versions.length === 0 && (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
              버전 기록이 없습니다
            </div>
          )}

          {!isLoading && versions.map((version) => (
            <button
              key={version.id}
              type="button"
              onClick={() => setDiffVersion(version)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 16px',
                borderBottom: '1px solid var(--border)', border: 'none',
                background: 'transparent', cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                  v{version.version}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {formatDate(version.createdAt)}
                </span>
              </div>
              {version.createdBy && (
                <p style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-3)' }}>
                  {version.createdBy.name}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Diff Modal */}
      {diffVersion && (
        <DiffModal
          version={diffVersion}
          currentContent={currentContent}
          onClose={() => setDiffVersion(null)}
          onRestore={onRestore}
        />
      )}
    </>
  );
}
