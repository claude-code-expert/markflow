'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

interface Tag {
  id: string;
  name: string;
  documentCount: number;
}

interface TagInputProps {
  workspaceSlug: string;
  documentId: string;
  initialTags: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

const MAX_TAGS = 30;

export function TagInput({
  workspaceSlug,
  documentId,
  initialTags,
  disabled = false,
}: TagInputProps) {
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialTags when they change (e.g., on doc load)
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  // Fetch workspace tags for autocomplete
  const workspaceTagsQuery = useQuery({
    queryKey: ['workspace-tags', workspaceSlug],
    queryFn: () =>
      apiFetch<{ tags: Tag[] }>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/tags`,
      ),
  });

  const allWorkspaceTags = workspaceTagsQuery.data?.tags ?? [];

  // Filtered suggestions: exclude already added tags and match input
  const suggestions = allWorkspaceTags.filter(
    (t) =>
      !tags.some((existing) => existing.name === t.name) &&
      (inputValue.trim() === '' || t.name.toLowerCase().includes(inputValue.toLowerCase())),
  );

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveTags = useCallback(
    async (newTags: Array<{ id: string; name: string }>) => {
      setSaving(true);
      try {
        const result = await apiFetch<{ tags: Array<{ id: string; name: string }> }>(
          `/workspaces/${encodeURIComponent(workspaceSlug)}/documents/${documentId}/tags`,
          {
            method: 'PUT',
            body: { tags: newTags.map((t) => t.name) },
          },
        );
        setTags(result.tags);
      } catch {
        // Revert on failure
        setTags(tags);
      } finally {
        setSaving(false);
      }
    },
    [workspaceSlug, documentId, tags],
  );

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name === trimmed)) return;
    if (tags.length >= MAX_TAGS) return;

    const newTags = [...tags, { id: '', name: trimmed }];
    setTags(newTags);
    setInputValue('');
    setShowSuggestions(false);
    void saveTags(newTags);
  }

  function removeTag(name: string) {
    const newTags = tags.filter((t) => t.name !== name);
    setTags(newTags);
    void saveTags(newTags);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const lastTag = tags[tags.length - 1]!;
      removeTag(lastTag.name);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Tags display */}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((tag) => (
          <span
            key={tag.name}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
          >
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag.name)}
                className="ml-0.5 rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
                aria-label={`${tag.name} 태그 삭제`}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input */}
      {!disabled && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length >= MAX_TAGS ? '태그 최대 개수 도달' : '태그 추가...'}
            disabled={tags.length >= MAX_TAGS || saving}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50"
          />

          {/* Saving indicator */}
          {saving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-blue-500" />
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && inputValue.trim().length > 0 && (
            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {suggestions.slice(0, 10).map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => addTag(suggestion.name)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50"
                >
                  <span>{suggestion.name}</span>
                  <span className="text-gray-400">
                    {suggestion.documentCount}건
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tag count */}
      {tags.length > 0 && (
        <p className="mt-1 text-xs text-gray-400">
          {tags.length}/{MAX_TAGS}
        </p>
      )}
    </div>
  );
}
