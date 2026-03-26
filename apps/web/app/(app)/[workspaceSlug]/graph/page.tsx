'use client';

import { use, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../lib/api';
import { DAGPipelineGraph } from '../../../../components/dag-pipeline-graph';
import type { GraphNode, GraphEdge } from '../../../../components/dag-pipeline-graph';

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = use(params);

  const graphQuery = useQuery({
    queryKey: ['graph', workspaceSlug],
    queryFn: () =>
      apiFetch<GraphData>(
        `/workspaces/${encodeURIComponent(workspaceSlug)}/graph`,
      ),
  });

  const stats = useMemo(() => {
    if (!graphQuery.data) return null;

    const { nodes, edges } = graphQuery.data;
    const totalDocs = nodes.length;

    // Connected nodes: nodes that appear in at least one edge
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    }
    const connectedDocs = connectedIds.size;
    const orphanDocs = totalDocs - connectedDocs;

    // Count by relation type
    const prevNextEdges = edges.filter((e) => e.type === 'next' || e.type === 'prev');
    const relatedEdges = edges.filter((e) => e.type === 'related');

    return {
      totalDocs,
      connectedDocs,
      orphanDocs,
      prevNextCount: Math.floor(prevNextEdges.length / 2), // bidirectional, so divide by 2
      relatedCount: relatedEdges.length,
    };
  }, [graphQuery.data]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">문서 그래프</h1>
        <p className="mt-1 text-sm text-gray-500">
          워크스페이스 내 문서 간 관계를 시각적으로 확인합니다.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">
                전체 문서: <span className="font-semibold text-gray-900">{stats.totalDocs}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">
                연결된 문서: <span className="font-semibold text-gray-900">{stats.connectedDocs}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600">
                고립 문서: <span className="font-semibold text-gray-900">{stats.orphanDocs}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-b border-gray-200 bg-white px-6 py-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg width="24" height="12">
              <line x1="0" y1="6" x2="24" y2="6" stroke="#6B7280" strokeWidth="1.5" />
              <polygon points="20,3 24,6 20,9" fill="#6B7280" />
            </svg>
            <span className="text-xs text-gray-500">이전/다음</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="12">
              <line x1="0" y1="6" x2="24" y2="6" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            <span className="text-xs text-gray-500">관련 문서</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-blue-500 bg-blue-500" />
            <span className="text-xs text-gray-500">현재 문서 (하이라이트)</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-auto bg-white p-6">
        {graphQuery.isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500">그래프를 불러오는 중...</p>
            </div>
          </div>
        )}

        {graphQuery.error && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              그래프를 불러오는 중 오류가 발생했습니다.
            </div>
          </div>
        )}

        {graphQuery.data && graphQuery.data.nodes.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-16 w-16 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <h3 className="mb-1 text-base font-semibold text-gray-900">
                문서가 없습니다
              </h3>
              <p className="text-sm text-gray-500">
                문서를 작성하고 관계를 설정하면 여기에 그래프가 표시됩니다.
              </p>
            </div>
          </div>
        )}

        {graphQuery.data && graphQuery.data.nodes.length > 0 && (
          <DAGPipelineGraph
            nodes={graphQuery.data.nodes}
            edges={graphQuery.data.edges}
            workspaceSlug={workspaceSlug}
            fullPage
          />
        )}
      </div>
    </div>
  );
}
