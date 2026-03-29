'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToastStore } from '../stores/toast-store';
import type { Document } from '../lib/types';

interface RelationDoc {
  id: string;
  title: string;
}

interface Relations {
  prev: RelationDoc | null;
  next: RelationDoc | null;
  related: RelationDoc[];
}

interface DocumentLinksModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  documentId: string;
  onSaved?: () => void;
}

export function DocumentLinksModal({ open, onClose, workspaceId, documentId, onSaved }: DocumentLinksModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [relations, setRelations] = useState<Relations>({ prev: null, next: null, related: [] });
  const [docs, setDocs] = useState<Document[]>([]);
  const [prevSearch, setPrevSearch] = useState('');
  const [nextSearch, setNextSearch] = useState('');
  const [relatedSearch, setRelatedSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open, workspaceId, documentId]);

  const loadData = async () => {
    try {
      const [relRes, docRes] = await Promise.all([
        apiFetch<Relations>(`/workspaces/${workspaceId}/documents/${documentId}/relations`),
        apiFetch<{ documents: Document[] }>(`/workspaces/${workspaceId}/documents?limit=200`),
      ]);
      setRelations(relRes);
      setDocs(docRes.documents.filter((d) => d.id !== documentId));
    } catch {
      addToast({ message: '문서 링크를 불러올 수 없습니다', type: 'error' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/workspaces/${workspaceId}/documents/${documentId}/relations`, {
        method: 'PUT',
        body: {
          prev: relations.prev?.id ?? null,
          next: relations.next?.id ?? null,
          related: relations.related.map((r) => r.id),
        },
      });
      addToast({ message: '문서 링크가 저장되었습니다', type: 'success' });
      onSaved?.();
      onClose();
    } catch {
      addToast({ message: '저장에 실패했습니다', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const selectPrev = (doc: Document) => {
    if (doc.id === relations.next?.id) {
      addToast({ message: '이전 문서와 다음 문서는 같을 수 없습니다', type: 'error' });
      return;
    }
    setRelations((r) => ({ ...r, prev: { id: doc.id, title: doc.title } }));
    setPrevSearch('');
  };

  const selectNext = (doc: Document) => {
    if (doc.id === relations.prev?.id) {
      addToast({ message: '이전 문서와 다음 문서는 같을 수 없습니다', type: 'error' });
      return;
    }
    setRelations((r) => ({ ...r, next: { id: doc.id, title: doc.title } }));
    setNextSearch('');
  };

  const addRelated = (doc: Document) => {
    if (relations.related.length >= 20) {
      addToast({ message: '연관 문서는 최대 20개까지 추가할 수 있습니다', type: 'error' });
      return;
    }
    if (relations.related.some((r) => r.id === doc.id)) return;
    setRelations((r) => ({ ...r, related: [...r.related, { id: doc.id, title: doc.title }] }));
    setRelatedSearch('');
  };

  const removeRelated = (id: string) => {
    setRelations((r) => ({ ...r, related: r.related.filter((d) => d.id !== id) }));
  };

  const filterDocs = (q: string) =>
    q.trim() ? docs.filter((d) => d.title.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/35 z-[1000] flex items-center justify-center p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-[var(--font-sora)] text-[17px] font-semibold">문서 링크 관리</h2>
          <button onClick={onClose} className="text-[#9A9890] hover:text-[#1A1916]">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Prev Document */}
          <div>
            <label className="text-[13px] font-medium text-[#57564F] mb-1.5 block">← 이전 문서 (Prev)</label>
            {relations.prev ? (
              <div className="flex items-center gap-2 p-2.5 bg-[#F8F7F4] rounded-md border border-[#E2E0D8]">
                <FileText size={14} className="shrink-0" />
                <span className="flex-1 text-[13px] font-medium">{relations.prev.title}</span>
                <button onClick={() => setRelations((r) => ({ ...r, prev: null }))} className="text-[#DC2626] text-xs">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="w-full px-3 py-2.5 border-[1.5px] border-[#E2E0D8] rounded-md text-sm outline-none focus:border-[#1A56DB]"
                  placeholder="문서 검색..."
                  value={prevSearch}
                  onChange={(e) => setPrevSearch(e.target.value)}
                />
                {prevSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E0D8] rounded-md mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filterDocs(prevSearch).map((d) => (
                      <div key={d.id} className="px-3 py-2 hover:bg-[#F1F0EC] cursor-pointer text-sm flex items-center gap-1.5" onClick={() => selectPrev(d)}>
                        <FileText size={14} className="shrink-0" /> {d.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <span className="text-[11px] text-[#9A9890] mt-1 block">순환 참조 자동 감지 (DFS)</span>
          </div>

          {/* Next Document */}
          <div>
            <label className="text-[13px] font-medium text-[#57564F] mb-1.5 block">다음 문서 (Next) →</label>
            {relations.next ? (
              <div className="flex items-center gap-2 p-2.5 bg-[#F8F7F4] rounded-md border border-[#E2E0D8]">
                <FileText size={14} className="shrink-0" />
                <span className="flex-1 text-[13px] font-medium">{relations.next.title}</span>
                <button onClick={() => setRelations((r) => ({ ...r, next: null }))} className="text-[#DC2626] text-xs">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="w-full px-3 py-2.5 border-[1.5px] border-[#E2E0D8] rounded-md text-sm outline-none focus:border-[#1A56DB]"
                  placeholder="문서 검색..."
                  value={nextSearch}
                  onChange={(e) => setNextSearch(e.target.value)}
                />
                {nextSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E0D8] rounded-md mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filterDocs(nextSearch).map((d) => (
                      <div key={d.id} className="px-3 py-2 hover:bg-[#F1F0EC] cursor-pointer text-sm flex items-center gap-1.5" onClick={() => selectNext(d)}>
                        <FileText size={14} className="shrink-0" /> {d.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Related Documents */}
          <div>
            <label className="text-[13px] font-medium text-[#57564F] mb-1.5 block">
              연관 문서 ({relations.related.length}/20)
            </label>
            {relations.related.length > 0 && (
              <div className="bg-[#F1F0EC] rounded-md p-2.5 border border-[#E2E0D8] mb-2 space-y-1.5">
                {relations.related.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 p-2 bg-[#F8F7F4] rounded-md border border-[#E2E0D8]">
                    <FileText size={14} className="shrink-0" />
                    <span className="flex-1 text-[13px]">{r.title}</span>
                    <button onClick={() => removeRelated(r.id)} className="text-[#DC2626] text-xs cursor-pointer">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                className="w-full px-3 py-2.5 border-[1.5px] border-[#E2E0D8] rounded-md text-sm outline-none focus:border-[#1A56DB]"
                placeholder="연관 문서 검색..."
                value={relatedSearch}
                onChange={(e) => setRelatedSearch(e.target.value)}
              />
              {relatedSearch && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E0D8] rounded-md mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filterDocs(relatedSearch)
                    .filter((d) => !relations.related.some((r) => r.id === d.id))
                    .map((d) => (
                      <div key={d.id} className="px-3 py-2 hover:bg-[#F1F0EC] cursor-pointer text-sm flex items-center gap-1.5" onClick={() => addRelated(d)}>
                        <FileText size={14} className="shrink-0" /> {d.title}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[#E2E0D8]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#57564F] bg-white border-[1.5px] border-[#CBC9C0] rounded-md hover:bg-[#F1F0EC]">
            취소
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#1A56DB] rounded-md hover:bg-[#1343B0] disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
