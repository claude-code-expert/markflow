'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToastStore } from '../stores/toast-store';
import type { Document } from '../lib/types';

interface RelationDoc {
  id: number;
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
  workspaceId: number;
  documentId: number;
  onSaved?: () => void;
}

/* ─── Searchable dropdown with keyboard nav ─── */

interface SearchDropdownProps {
  placeholder: string;
  items: Document[];
  onSelect: (doc: Document) => void;
  excludeIds?: number[];
}

function SearchDropdown({ placeholder, items, onSelect, excludeIds = [] }: SearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? items
        .filter((d) => !excludeIds.includes(d.id))
        .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : [];

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const doc = filtered[highlightIdx];
      if (doc) {
        onSelect(doc);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  }, [filtered, highlightIdx, onSelect]);

  return (
    <div className="relative">
      <input
        className="w-full px-3 py-2.5 border-[1.5px] border-[#E2E0D8] rounded-md text-sm outline-none focus:border-[#1A56DB]"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {filtered.length > 0 && (
        <div ref={listRef} className="absolute top-full left-0 right-0 bg-white border border-[#E2E0D8] rounded-md mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
          {filtered.map((d, i) => (
            <div
              key={d.id}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-1.5 ${
                i === highlightIdx ? 'bg-[#EEF3FF] text-[#1A56DB]' : 'hover:bg-[#F1F0EC]'
              }`}
              onClick={() => { onSelect(d); setQuery(''); }}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <FileText size={14} className="shrink-0" /> {d.title}
            </div>
          ))}
        </div>
      )}
      {query.trim() && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E0D8] rounded-md mt-1 shadow-lg z-10 px-3 py-2 text-sm text-[#9A9890]">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}

/* ─── Main Modal ─── */

export function DocumentLinksModal({ open, onClose, workspaceId, documentId, onSaved }: DocumentLinksModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [relations, setRelations] = useState<Relations>({ prev: null, next: null, related: [] });
  const [docs, setDocs] = useState<Document[]>([]);
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
          prev: relations.prev ? String(relations.prev.id) : undefined,
          next: relations.next ? String(relations.next.id) : undefined,
          related: relations.related.map((r) => String(r.id)),
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

  const selectPrev = useCallback((doc: Document) => {
    if (doc.id === relations.next?.id) {
      addToast({ message: '이전 문서와 다음 문서는 같을 수 없습니다', type: 'error' });
      return;
    }
    setRelations((r) => ({ ...r, prev: { id: doc.id, title: doc.title } }));
  }, [relations.next?.id, addToast]);

  const selectNext = useCallback((doc: Document) => {
    if (doc.id === relations.prev?.id) {
      addToast({ message: '이전 문서와 다음 문서는 같을 수 없습니다', type: 'error' });
      return;
    }
    setRelations((r) => ({ ...r, next: { id: doc.id, title: doc.title } }));
  }, [relations.prev?.id, addToast]);

  const addRelated = useCallback((doc: Document) => {
    if (relations.related.length >= 20) {
      addToast({ message: '연관 문서는 최대 20개까지 추가할 수 있습니다', type: 'error' });
      return;
    }
    if (relations.related.some((r) => r.id === doc.id)) return;
    setRelations((r) => ({ ...r, related: [...r.related, { id: doc.id, title: doc.title }] }));
  }, [relations.related, addToast]);

  const removeRelated = (id: number) => {
    setRelations((r) => ({ ...r, related: r.related.filter((d) => d.id !== id) }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5" onClick={onClose}>
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
              <SearchDropdown
                placeholder="문서 검색..."
                items={docs}
                onSelect={selectPrev}
              />
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
              <SearchDropdown
                placeholder="문서 검색..."
                items={docs}
                onSelect={selectNext}
              />
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
            <SearchDropdown
              placeholder="연관 문서 검색..."
              items={docs}
              onSelect={addRelated}
              excludeIds={relations.related.map((r) => r.id)}
            />
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
