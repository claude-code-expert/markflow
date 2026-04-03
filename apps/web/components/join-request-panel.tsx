'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { useToastStore } from '../stores/toast-store';

interface PublicWorkspace {
  id: string;
  name: string;
  memberCount: number;
  isPublic: boolean;
  pendingRequest: boolean;
}

interface JoinRequestPanelProps {
  onRequestSent?: () => void;
}

export function JoinRequestPanel({ onRequestSent }: JoinRequestPanelProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicWorkspace[]>([]);
  const [searching, setSearching] = useState(false);

  // Join request modal state
  const [modalWs, setModalWs] = useState<PublicWorkspace | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const searchPublic = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await apiFetch<{ workspaces: PublicWorkspace[] }>(
        `/workspaces/public?q=${encodeURIComponent(q)}&limit=10`
      );
      setResults(res.workspaces);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    void searchPublic(value);
  };

  const handleSubmitRequest = async () => {
    if (!modalWs) return;
    setSending(true);
    try {
      await apiFetch(`/workspaces/${modalWs.id}/join-requests`, {
        method: 'POST',
        body: { message: message.trim() || undefined },
      });
      addToast({ message: '가입 신청이 전송되었습니다', type: 'success' });
      setModalWs(null);
      setMessage('');
      // Refresh results to show pending status
      void searchPublic(query);
      onRequestSent?.();
    } catch {
      addToast({ message: '가입 신청에 실패했습니다', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Collapsible Panel */}
      <div
        style={{
          width: '100%', maxWidth: '680px', marginTop: '24px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        }}
      >
        <div
          onClick={() => { setIsOpen(!isOpen); if (!isOpen && results.length === 0) void searchPublic(''); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            공개 워크스페이스에 가입 신청
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"
            style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : '' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {isOpen && (
          <div style={{ padding: '20px' }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '9px 13px', marginBottom: '14px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="워크스페이스 이름 검색..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  flex: 1, fontSize: '13.5px', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Results */}
            {searching && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13.5px' }}>검색 중...</p>}
            {!searching && results.length === 0 && query && (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13.5px' }}>검색 결과가 없습니다</p>
            )}
            {results.map((ws) => (
              <div
                key={ws.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '8px',
                  background: 'var(--bg)',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', background: '#0891b2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '15px', fontWeight: 700, flexShrink: 0,
                }}>
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{ws.name}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>{ws.name} · {ws.memberCount}명</div>
                </div>
                {ws.pendingRequest ? (
                  <span style={{
                    padding: '3px 9px', borderRadius: '100px', fontSize: '11.5px', fontWeight: 500,
                    background: 'var(--amber-lt)', color: 'var(--amber)',
                  }}>
                    승인 대기
                  </span>
                ) : (
                  <button
                    onClick={() => { setModalWs(ws); setMessage(''); }}
                    style={{
                      padding: '6px 13px', fontSize: '12.5px', fontWeight: 500,
                      background: 'var(--surface)', color: 'var(--text-2)',
                      border: '1.5px solid var(--border-2)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    가입 신청
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Request Modal */}
      {modalWs && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setModalWs(null)}
        >
          <div
            style={{
              background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
              boxShadow: '0 24px 64px rgba(0,0,0,.15)', width: '100%', maxWidth: '480px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
              <span style={{ fontFamily: 'var(--font-h)', fontSize: '17px', fontWeight: 600 }}>워크스페이스 가입 신청</span>
              <button onClick={() => setModalWs(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
                marginBottom: '20px', border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '40px', height: '40px', background: '#0891b2', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', color: '#fff', flexShrink: 0,
                }}>
                  {modalWs.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{modalWs.name}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>공개 워크스페이스 · {modalWs.memberCount}명</div>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>
                  신청 메시지 (선택)
                </label>
                <textarea
                  placeholder="가입 목적이나 자기소개를 작성하면 승인율이 높아집니다."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                    fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>워크스페이스 관리자에게 전달됩니다.</span>
              </div>
              <div style={{
                background: 'var(--amber-lt)', border: '1px solid var(--amber)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12.5px', color: 'var(--text-2)',
              }}>
                ⏳ 신청 후 Admin/Owner가 검토합니다. 승인 시 이메일로 알림을 받습니다.
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
              padding: '16px 24px', borderTop: '1px solid var(--border)',
            }}>
              <button
                onClick={() => setModalWs(null)}
                style={{
                  padding: '9px 18px', fontSize: '13.5px', fontWeight: 500,
                  background: 'var(--surface)', color: 'var(--text-2)',
                  border: '1.5px solid var(--border-2)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={sending}
                style={{
                  padding: '9px 18px', fontSize: '13.5px', fontWeight: 500,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? '전송 중...' : '가입 신청 전송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
