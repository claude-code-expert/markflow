'use client';

import { useState, useEffect, useMemo } from 'react';
import { diffLines, type Change } from 'diff';
import { apiFetch } from '../lib/api';
import { useToastStore } from '../stores/toast-store';
import { formatKstRelative } from '../lib/date';

interface Version {
  id: number;
  version: number;
  content: string;
  createdAt: string;
  createdBy?: { id: number; name: string } | null;
}

interface VersionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
  documentId: string;
  currentContent: string;
  hasUnsavedChanges?: boolean;
  onRestore?: (content: string) => void;
}

export function VersionHistoryModal({
  open, onClose, workspaceId, documentId, currentContent,
  hasUnsavedChanges = false, onRestore,
}: VersionHistoryModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIdx(null);
    void loadVersions();
  }, [open, workspaceId, documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ versions: Version[] }>(
        `/workspaces/${workspaceId}/documents/${documentId}/versions`
      );
      setVersions(res.versions);
    } catch {
      addToast({ message: '버전 히스토리를 불러올 수 없습니다', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectedVersion = selectedIdx !== null ? versions[selectedIdx] : undefined;

  const diffResult = useMemo((): Change[] => {
    if (!selectedVersion) return [];
    return diffLines(selectedVersion.content, currentContent);
  }, [selectedVersion, currentContent]);

  const handleRestore = () => {
    if (!selectedVersion) return;
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('저장되지 않은 변경 사항이 있습니다. 이 버전으로 복원하시겠습니까?');
      if (!confirmed) return;
    }
    onRestore?.(selectedVersion.content);
    addToast({ message: `v${selectedVersion.version}로 복원되었습니다`, type: 'success' });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-[var(--font-sora)] text-[17px] font-semibold">버전 히스토리</h2>
          <button onClick={onClose} className="text-[#9A9890] hover:text-[#1A1916]">✕</button>
        </div>

        <div className="px-6 py-4">
          <p className="text-[13px] text-[#57564F] mb-4">총 {versions.length}개 버전</p>

          <div className="grid grid-cols-[260px_1fr] gap-5 h-[380px]">
            {/* Version list */}
            <div className="border border-[#E2E0D8] rounded-lg overflow-y-auto">
              <div className="p-1.5">
                {loading && <div className="text-center py-8 text-[#9A9890] text-sm">로딩 중...</div>}
                {versions.map((v, idx) => {
                  const isCurrent = idx === 0;
                  const isSelected = idx === selectedIdx;
                  return (
                    <div
                      key={v.id}
                      className={`px-3 py-2.5 rounded-md cursor-pointer mb-1 transition-colors ${
                        isSelected ? 'bg-[#EEF3FF] text-[#1A56DB]' : 'hover:bg-[#F1F0EC]'
                      }`}
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] ${isSelected || isCurrent ? 'font-semibold' : 'font-medium'}`}>
                          v{v.version}{isCurrent ? ' (현재)' : ''}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF3FF] text-[#1343B0] font-semibold">현재</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9A9890] mt-0.5">
                        {formatKstRelative(v.createdAt)}{v.createdBy ? ` · ${v.createdBy.name}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diff preview */}
            <div className="border border-[#E2E0D8] rounded-lg p-4 overflow-y-auto bg-[#F8F7F4]">
              {!selectedVersion && (
                <div className="text-center py-16 text-[#9A9890] text-sm">
                  좌측에서 버전을 선택하면 변경 사항을 확인할 수 있습니다
                </div>
              )}
              {selectedVersion && (
                <>
                  <div className="text-[12px] font-semibold text-[#9A9890] uppercase tracking-wider mb-2.5">
                    v{selectedVersion.version} vs 현재
                  </div>
                  <div className="font-mono text-[12px] leading-[1.8] text-[#57564F]">
                    {diffResult.map((part, i) => {
                      if (part.added) {
                        return (
                          <div key={i} className="text-[#16A34A] bg-[#F0FDF4] px-1 -mx-1 rounded-sm">
                            {part.value.split('\n').filter(Boolean).map((line, j) => (
                              <div key={j}>+ {line}</div>
                            ))}
                          </div>
                        );
                      }
                      if (part.removed) {
                        return (
                          <div key={i} className="text-[#DC2626] bg-[#FFF1F2] px-1 -mx-1 rounded-sm">
                            {part.value.split('\n').filter(Boolean).map((line, j) => (
                              <div key={j}>- {line}</div>
                            ))}
                          </div>
                        );
                      }
                      const lines = part.value.split('\n').filter(Boolean);
                      if (lines.length > 4) {
                        return (
                          <div key={i} className="text-[#9A9890]">
                            <div>  {lines[0]}</div>
                            <div className="text-center text-[10px] py-0.5">... {lines.length - 2}줄 동일 ...</div>
                            <div>  {lines[lines.length - 1]}</div>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="text-[#9A9890]">
                          {lines.map((line, j) => <div key={j}>  {line}</div>)}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[#E2E0D8]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#57564F] bg-white border-[1.5px] border-[#CBC9C0] rounded-md hover:bg-[#F1F0EC]">
            닫기
          </button>
          <button
            onClick={handleRestore}
            disabled={!selectedVersion || selectedIdx === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1A56DB] rounded-md hover:bg-[#1343B0] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이 버전으로 복원
          </button>
        </div>
      </div>
    </div>
  );
}
