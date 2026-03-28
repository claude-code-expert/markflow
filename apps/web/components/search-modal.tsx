'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace-store';
import type { Document } from '../lib/types';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  categoryPath: string | null;
  excerpt: string;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string | undefined;
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentDocs, setRecentDocs] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      if (currentWorkspace) {
        void loadRecentDocs();
      }
    }
  }, [open, currentWorkspace]);

  const loadRecentDocs = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await apiFetch<{ documents: Document[] }>(
        `/workspaces/${currentWorkspace.id}/documents?sort=updatedAt&order=desc&limit=5`
      );
      setRecentDocs(
        res.documents.map((d) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          categoryPath: null,
          excerpt: d.content.slice(0, 80),
        }))
      );
    } catch {
      // Silently fail for recent docs
    }
  };

  const searchDocs = useCallback(
    async (q: string) => {
      if (!currentWorkspace || !q.trim()) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await apiFetch<{ documents: Document[] }>(
          `/workspaces/${currentWorkspace.id}/documents?q=${encodeURIComponent(q)}&limit=10`
        );
        setResults(
          res.documents.map((d) => ({
            id: d.id,
            title: d.title,
            slug: d.slug,
            categoryPath: null,
            excerpt: d.content.slice(0, 100),
          }))
        );
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [currentWorkspace]
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDocs(value), 200);
  };

  const displayItems = query.trim() ? results : recentDocs;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, displayItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && displayItems[selectedIndex]) {
      e.preventDefault();
      navigateToDoc(displayItems[selectedIndex]!);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const navigateToDoc = (doc: SearchResult) => {
    onClose();
    if (workspaceSlug) {
      router.push(`/${workspaceSlug}/docs/${doc.id}`);
    }
  };

  const highlightMatch = (text: string, q: string): React.ReactNode => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200/60 rounded-sm font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/35 z-[1000] flex items-start justify-center pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[640px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E2E0D8]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A9890" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 border-none outline-none text-base text-[#1A1916] bg-transparent placeholder:text-[#9A9890]"
            placeholder="문서 검색..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-xs bg-[#F1F0EC] px-2 py-0.5 rounded text-[#9A9890]">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto p-2">
          {displayItems.length === 0 && query.trim() && !isSearching && (
            <div className="text-center py-10 text-[#9A9890] text-sm">
              🔍<br />
              &laquo;{query}&raquo; 검색 결과가 없습니다
            </div>
          )}

          {displayItems.length === 0 && !query.trim() && recentDocs.length === 0 && (
            <div className="text-center py-10 text-[#9A9890] text-sm">
              워크스페이스를 선택하면 문서를 검색할 수 있습니다
            </div>
          )}

          {displayItems.length > 0 && (
            <div className="px-3.5 pt-2 pb-1 text-[11px] font-semibold text-[#9A9890] tracking-wider uppercase">
              {query.trim() ? `${results.length}개 결과` : '최근 문서'}
            </div>
          )}

          {displayItems.map((doc, idx) => (
            <div
              key={doc.id}
              className={`flex items-start gap-3 px-3.5 py-3 rounded-[10px] cursor-pointer transition-colors ${
                idx === selectedIndex ? 'bg-[#EEF3FF]' : 'hover:bg-[#F1F0EC]'
              }`}
              onClick={() => navigateToDoc(doc)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="text-lg shrink-0 mt-0.5">📄</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium mb-0.5">
                  {highlightMatch(doc.title, query)}
                </div>
                {doc.excerpt && (
                  <div className="text-xs text-[#9A9890] line-clamp-1">
                    {highlightMatch(doc.excerpt, query)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#E2E0D8] flex gap-4 text-xs text-[#9A9890]">
          <span><kbd className="bg-[#F1F0EC] px-1 rounded">↑↓</kbd> 탐색</span>
          <span><kbd className="bg-[#F1F0EC] px-1 rounded">Enter</kbd> 열기</span>
          <span><kbd className="bg-[#F1F0EC] px-1 rounded">Esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
