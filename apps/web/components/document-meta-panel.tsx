'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../lib/api';
import { usePermissions } from '../hooks/use-permissions';
import { DAGPipelineGraph } from './dag-pipeline-graph';
import type { GraphNode, GraphEdge } from './dag-pipeline-graph';
import { TagInput } from './tag-input';

interface RelationDoc {
  id: string;
  title: string;
}

interface Relations {
  prev: RelationDoc | null;
  next: RelationDoc | null;
  related: RelationDoc[];
}

interface DocumentInfo {
  id: string;
  title: string;
  categoryPath: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface WorkspaceDoc {
  id: string;
  title: string;
}

interface DocumentMetaPanelProps {
  document: DocumentInfo;
  workspaceSlug: string;
  workspaceId: string;
  role: string | null | undefined;
}

export function DocumentMetaPanel({
  document: doc,
  workspaceSlug,
  workspaceId,
  role,
}: DocumentMetaPanelProps) {
  const queryClient = useQueryClient();
  const permissions = usePermissions(role);

  const [selectedPrev, setSelectedPrev] = useState<string>('');
  const [selectedNext, setSelectedNext] = useState<string>('');
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [addRelatedId, setAddRelatedId] = useState<string>('');
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Fetch current relations
  const relationsQuery = useQuery({
    queryKey: ['relations', workspaceSlug, doc.id],
    queryFn: () =>
      apiFetch<Relations>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/documents/${doc.id}/relations`,
      ),
  });

  // Fetch workspace documents for dropdowns
  const docsQuery = useQuery({
    queryKey: ['documents-list', workspaceSlug],
    queryFn: async () => {
      const data = await apiFetch<{ documents: WorkspaceDoc[] }>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/documents?limit=200`,
      );
      return data.documents;
    },
  });

  // Fetch graph for mini visualization
  const graphQuery = useQuery({
    queryKey: ['graph', workspaceSlug],
    queryFn: () =>
      apiFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/graph`,
      ),
  });

  // Initialize form state from fetched relations
  useEffect(() => {
    if (relationsQuery.data) {
      setSelectedPrev(relationsQuery.data.prev?.id ?? '');
      setSelectedNext(relationsQuery.data.next?.id ?? '');
      setRelatedIds(relationsQuery.data.related.map((r) => r.id));
      setIsDirty(false);
    }
  }, [relationsQuery.data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      prev?: string;
      next?: string;
      related?: string[];
    }) => {
      return apiFetch<Relations>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/documents/${doc.id}/relations`,
        { method: 'PUT', body: payload },
      );
    },
    onSuccess: () => {
      setError('');
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: ['relations', workspaceSlug, doc.id] });
      void queryClient.invalidateQueries({ queryKey: ['graph', workspaceSlug] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('관계 저장 중 오류가 발생했습니다.');
      }
    },
  });

  const handleSave = useCallback(() => {
    const payload: { prev?: string; next?: string; related?: string[] } = {};
    if (selectedPrev) payload.prev = selectedPrev;
    if (selectedNext) payload.next = selectedNext;
    if (relatedIds.length > 0) payload.related = relatedIds;
    saveMutation.mutate(payload);
  }, [selectedPrev, selectedNext, relatedIds, saveMutation]);

  const handleAddRelated = useCallback(() => {
    if (!addRelatedId || relatedIds.includes(addRelatedId) || addRelatedId === doc.id) return;
    if (relatedIds.length >= 20) {
      setError('관련 문서는 최대 20개까지 추가할 수 있습니다.');
      return;
    }
    setRelatedIds((prev) => [...prev, addRelatedId]);
    setAddRelatedId('');
    setIsDirty(true);
  }, [addRelatedId, relatedIds, doc.id]);

  const handleRemoveRelated = useCallback((id: string) => {
    setRelatedIds((prev) => prev.filter((r) => r !== id));
    setIsDirty(true);
  }, []);

  // Available docs (exclude current doc from options)
  const availableDocs = useMemo(() => {
    return (docsQuery.data ?? []).filter((d) => d.id !== doc.id);
  }, [docsQuery.data, doc.id]);

  const getDocTitle = useCallback(
    (id: string) => {
      return availableDocs.find((d) => d.id === id)?.title ?? id;
    },
    [availableDocs],
  );

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-gray-200 bg-gray-50/50 overflow-y-auto">
      <div className="px-4 py-4">
        {/* Document Metadata */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          메타 정보
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500">작성자</p>
            <p className="text-sm text-gray-700">{doc.author.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">카테고리</p>
            <p className="text-sm text-gray-700">{doc.categoryPath ?? '없음'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">생성일</p>
            <p className="text-sm text-gray-700">{formatDate(doc.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">수정일</p>
            <p className="text-sm text-gray-700">{formatDate(doc.updatedAt)}</p>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-4 border-gray-200" />

        {/* Tags */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          태그
        </h3>
        <TagInput
          workspaceSlug={workspaceSlug}
          documentId={doc.id}
          initialTags={[]}
          disabled={!permissions.canManageTags}
        />

        {/* Divider */}
        <hr className="my-4 border-gray-200" />

        {/* Document Relations */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          문서 관계
        </h3>

        {relationsQuery.isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {!relationsQuery.isLoading && (
          <div className="space-y-3">
            {/* Previous Document */}
            <div>
              <label htmlFor="prev-doc" className="text-xs font-medium text-gray-500">
                이전 문서
              </label>
              <select
                id="prev-doc"
                value={selectedPrev}
                onChange={(e) => {
                  setSelectedPrev(e.target.value);
                  setIsDirty(true);
                }}
                disabled={!permissions.canEditDocument}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">없음</option>
                {availableDocs
                  .filter((d) => d.id !== selectedNext)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Next Document */}
            <div>
              <label htmlFor="next-doc" className="text-xs font-medium text-gray-500">
                다음 문서
              </label>
              <select
                id="next-doc"
                value={selectedNext}
                onChange={(e) => {
                  setSelectedNext(e.target.value);
                  setIsDirty(true);
                }}
                disabled={!permissions.canEditDocument}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">없음</option>
                {availableDocs
                  .filter((d) => d.id !== selectedPrev)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Related Documents */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500">
                  관련 문서 ({relatedIds.length}/20)
                </label>
              </div>

              {/* Related list */}
              {relatedIds.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {relatedIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1"
                    >
                      <span className="truncate text-xs text-gray-700">
                        {getDocTitle(id)}
                      </span>
                      {permissions.canEditDocument && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRelated(id)}
                          className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                          aria-label={`${getDocTitle(id)} 관련 문서 제거`}
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add related */}
              {permissions.canEditDocument && relatedIds.length < 20 && (
                <div className="mt-1.5 flex gap-1">
                  <select
                    value={addRelatedId}
                    onChange={(e) => setAddRelatedId(e.target.value)}
                    className="block flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">문서 선택...</option>
                    {availableDocs
                      .filter((d) => !relatedIds.includes(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddRelated}
                    disabled={!addRelatedId}
                    className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    추가
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Save button */}
            {permissions.canEditDocument && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saveMutation.isPending}
                className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saveMutation.isPending ? '저장 중...' : '관계 저장'}
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <hr className="my-4 border-gray-200" />

        {/* Mini DAG Graph */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          문서 그래프
        </h3>

        {graphQuery.isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {graphQuery.data && (
          <DAGPipelineGraph
            nodes={graphQuery.data.nodes}
            edges={graphQuery.data.edges}
            currentDocId={doc.id}
            workspaceSlug={workspaceSlug}
          />
        )}
      </div>
    </aside>
  );
}

export type { DocumentMetaPanelProps, Relations, RelationDoc };
