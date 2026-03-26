'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface GraphNode {
  id: string;
  title: string;
  categoryId: string | null;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'prev' | 'next' | 'related';
}

interface DAGPipelineGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  currentDocId?: string;
  workspaceSlug: string;
  fullPage?: boolean;
  categoryColors?: Record<string, string>;
}

// Default category colors
const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

function getCategoryColor(categoryId: string | null, colorMap: Map<string, string>): string {
  if (!categoryId) return '#6B7280'; // gray for uncategorized
  const existing = colorMap.get(categoryId);
  if (existing) return existing;
  const color = DEFAULT_COLORS[colorMap.size % DEFAULT_COLORS.length] ?? '#6B7280';
  colorMap.set(categoryId, color);
  return color;
}

interface LayoutNode {
  id: string;
  title: string;
  categoryId: string | null;
  x: number;
  y: number;
  stage: number;
}

export function DAGPipelineGraph({
  nodes,
  edges,
  currentDocId,
  workspaceSlug,
  fullPage = false,
}: DAGPipelineGraphProps) {
  const router = useRouter();

  const layout = useMemo(() => {
    if (nodes.length === 0) return { layoutNodes: [], layoutEdges: edges, width: 0, height: 0 };

    // Build adjacency for next relations (directional DAG)
    const nextMap = new Map<string, string>();
    const prevMap = new Map<string, string>();

    for (const edge of edges) {
      if (edge.type === 'next') {
        nextMap.set(edge.source, edge.target);
      }
      if (edge.type === 'prev') {
        prevMap.set(edge.source, edge.target);
      }
    }

    // Find chain starts (nodes that have no prev)
    const hasIncoming = new Set<string>();
    for (const edge of edges) {
      if (edge.type === 'next') {
        hasIncoming.add(edge.target);
      }
    }

    const chainStarts = nodes.filter((n) => !hasIncoming.has(n.id));
    const orphans = nodes.filter(
      (n) => !hasIncoming.has(n.id) && !nextMap.has(n.id),
    );

    // Assign stages by following next chains
    const stageMap = new Map<string, number>();
    const visited = new Set<string>();

    for (const start of chainStarts) {
      let current = start.id;
      let stage = 0;
      while (current && !visited.has(current)) {
        visited.add(current);
        stageMap.set(current, stage);
        stage++;
        const nextId = nextMap.get(current);
        if (!nextId) break;
        current = nextId;
      }
    }

    // Nodes not in any chain get their own stage
    let maxStage = 0;
    for (const s of stageMap.values()) {
      if (s > maxStage) maxStage = s;
    }

    for (const node of nodes) {
      if (!stageMap.has(node.id)) {
        maxStage++;
        stageMap.set(node.id, maxStage);
      }
    }

    // Group by stage
    const stageGroups = new Map<number, string[]>();
    for (const [id, stage] of stageMap) {
      const group = stageGroups.get(stage) ?? [];
      group.push(id);
      stageGroups.set(stage, group);
    }

    const nodeWidth = fullPage ? 160 : 120;
    const nodeHeight = fullPage ? 48 : 36;
    const hGap = fullPage ? 60 : 40;
    const vGap = fullPage ? 40 : 30;
    const padding = fullPage ? 40 : 20;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const layoutNodes: LayoutNode[] = [];

    let maxX = 0;
    let maxY = 0;

    const sortedStages = [...stageGroups.entries()].sort(([a], [b]) => a - b);

    for (const [stage, ids] of sortedStages) {
      const x = padding + stage * (nodeWidth + hGap);
      ids.forEach((id, rowIdx) => {
        const y = padding + rowIdx * (nodeHeight + vGap);
        const node = nodeMap.get(id);
        if (node) {
          layoutNodes.push({
            ...node,
            x,
            y,
            stage,
          });
        }
        if (x + nodeWidth > maxX) maxX = x + nodeWidth;
        if (y + nodeHeight > maxY) maxY = y + nodeHeight;
      });
    }

    return {
      layoutNodes,
      layoutEdges: edges,
      width: maxX + padding,
      height: maxY + padding,
      nodeWidth,
      nodeHeight,
    };
  }, [nodes, edges, fullPage]);

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      getCategoryColor(node.categoryId, map);
    }
    return map;
  }, [nodes]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      router.push(`/${workspaceSlug}/docs/${nodeId}`);
    },
    [router, workspaceSlug],
  );

  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center ${fullPage ? 'h-96' : 'h-40'} text-sm text-gray-400`}>
        연결된 문서가 없습니다
      </div>
    );
  }

  const { layoutNodes, layoutEdges, width, height, nodeWidth = 120, nodeHeight = 36 } = layout;

  return (
    <div className={`overflow-auto ${fullPage ? '' : 'max-h-60'}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
      >
        {/* Edges */}
        {layoutEdges.map((edge, idx) => {
          const source = layoutNodes.find((n) => n.id === edge.source);
          const target = layoutNodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;

          const sx = source.x + nodeWidth;
          const sy = source.y + nodeHeight / 2;
          const tx = target.x;
          const ty = target.y + nodeHeight / 2;

          const isDashed = edge.type === 'related';
          const color = edge.type === 'related' ? '#9CA3AF' : '#6B7280';

          // Curved path
          const midX = (sx + tx) / 2;

          return (
            <g key={`edge-${idx}`}>
              <path
                d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={isDashed ? '4 3' : undefined}
                markerEnd={edge.type !== 'related' ? 'url(#arrowhead)' : undefined}
              />
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#6B7280" />
          </marker>
        </defs>

        {/* Nodes */}
        {layoutNodes.map((node) => {
          const isCurrent = node.id === currentDocId;
          const color = getCategoryColor(node.categoryId, categoryColorMap);
          const truncatedTitle =
            node.title.length > (fullPage ? 18 : 12)
              ? node.title.slice(0, fullPage ? 18 : 12) + '...'
              : node.title;

          return (
            <g
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className="cursor-pointer"
            >
              {/* Pulse animation for current doc */}
              {isCurrent && (
                <rect
                  x={node.x - 3}
                  y={node.y - 3}
                  width={nodeWidth + 6}
                  height={nodeHeight + 6}
                  rx={10}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.4}
                >
                  <animate
                    attributeName="opacity"
                    values="0.4;0.1;0.4"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}
              <rect
                x={node.x}
                y={node.y}
                width={nodeWidth}
                height={nodeHeight}
                rx={8}
                fill={isCurrent ? color : '#FFFFFF'}
                stroke={color}
                strokeWidth={isCurrent ? 2 : 1.5}
              />
              <text
                x={node.x + nodeWidth / 2}
                y={node.y + nodeHeight / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isCurrent ? '#FFFFFF' : '#374151'}
                fontSize={fullPage ? 13 : 11}
                fontWeight={isCurrent ? 600 : 400}
              >
                {truncatedTitle}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type { GraphNode, GraphEdge, DAGPipelineGraphProps };
