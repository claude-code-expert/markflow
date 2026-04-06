'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronLeft, ChevronRight, RotateCcw, PanelRight } from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import { useWorkspaceStore } from '../../../../stores/workspace-store';
import { MindMapCanvas, type MindMapNode, type MindMapEdge, type CategoryInfo } from '../../../../components/mind-map-canvas';
import type { Category } from '../../../../lib/types';

/* ─── Types ─── */

interface GraphResponse {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

interface TagsResponse {
  tags: { id: number; name: string }[];
}

/* ─── Color palette for categories ─── */
const PALETTE = ['#e05252', '#d97706', '#0891b2', '#0284c7', '#7c3aed', '#ca8a04', '#16a34a', '#be185d', '#0369a1', '#9333ea'];

/* ─── Legend ─── */
const LEGEND = [
  { label: '카테고리', color: '#6d28d9' },
  { label: '이전 문서', color: '#0369a1' },
  { label: '다음 문서', color: '#c2410c' },
  { label: '연관 문서', color: '#be185d' },
  { label: '태그 연결', color: '#0e7490' },
];

export default function GraphPage() {
  const router = useRouter();
  const { workspaces, currentWorkspace } = useWorkspaceStore();
  const slug = currentWorkspace?.name ?? '';
  const wsId = currentWorkspace?.id;

  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [filterCatId, setFilterCatId] = useState<number | null>(null);

  // Fetch graph data
  const graphQuery = useQuery({
    queryKey: ['graph', wsId],
    queryFn: () => apiFetch<GraphResponse>(`/workspaces/${wsId}/graph`),
    enabled: !!wsId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', wsId],
    queryFn: () => apiFetch<{ categories: Category[] }>(`/workspaces/${wsId}/categories`),
    enabled: !!wsId,
  });

  const nodes = graphQuery.data?.nodes ?? [];
  const edges = graphQuery.data?.edges ?? [];
  const rawCategories = categoriesQuery.data?.categories ?? [];

  // Assign colors to categories
  const categoryInfos: CategoryInfo[] = useMemo(() =>
    rawCategories.map((c, i) => ({ id: c.id, name: c.name, color: PALETTE[i % PALETTE.length] ?? '#6d28d9' })),
    [rawCategories],
  );

  // Compute tag-based links (documents sharing tags)
  // For now we skip tag API calls — this can be added later
  const tagLinks: { fromId: number; toId: number }[] = useMemo(() => [], []);

  // Auto-select first doc
  useEffect(() => {
    if (selectedDocId === null && nodes.length > 0 && nodes[0]) {
      setSelectedDocId(nodes[0].id);
    }
  }, [nodes, selectedDocId]);

  const selectedDoc = nodes.find(n => n.id === selectedDocId);

  // Prev/Next navigation
  const prevDocId = useMemo(() => {
    if (!selectedDocId) return null;
    const edge = edges.find(e => e.source === selectedDocId && e.type === 'prev');
    return edge?.target ?? null;
  }, [edges, selectedDocId]);

  const nextDocId = useMemo(() => {
    if (!selectedDocId) return null;
    const edge = edges.find(e => e.source === selectedDocId && e.type === 'next');
    return edge?.target ?? null;
  }, [edges, selectedDocId]);

  const handleSelectDoc = useCallback((docId: number) => {
    setSelectedDocId(docId);
  }, []);

  const handleNavigateToDoc = useCallback((docId: number) => {
    router.push(`/${encodeURIComponent(slug)}/doc/${docId}`);
  }, [router, slug]);

  // Group docs by category for sidebar
  const groupedDocs = useMemo(() => {
    const groups = new Map<number | null, MindMapNode[]>();
    const filtered = filterCatId !== null
      ? nodes.filter(n => n.categoryId === filterCatId)
      : nodes;
    for (const n of filtered) {
      const key = n.categoryId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    return groups;
  }, [nodes, filterCatId]);

  if (!wsId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 18px', height: '48px', flexShrink: 0,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>
          Mind Map
        </span>
        <span style={{ width: '1px', height: '18px', background: 'var(--border)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>
          {selectedDoc
            ? `${categoryInfos.find(c => c.id === selectedDoc.categoryId)?.name ?? 'Root'} › ${selectedDoc.title}`
            : '문서를 선택하세요'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => prevDocId && handleSelectDoc(prevDocId)}
            disabled={!prevDocId}
            title="이전 문서"
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: '5px', background: 'transparent',
              color: prevDocId ? 'var(--text-2)' : 'var(--border)', cursor: prevDocId ? 'pointer' : 'default',
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => nextDocId && handleSelectDoc(nextDocId)}
            disabled={!nextDocId}
            title="다음 문서"
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: '5px', background: 'transparent',
              color: nextDocId ? 'var(--text-2)' : 'var(--border)', cursor: nextDocId ? 'pointer' : 'default',
            }}
          >
            <ChevronRight size={14} />
          </button>
          <span style={{ width: '1px', height: '18px', background: 'var(--border)' }} />
          {selectedDoc && (
            <button
              onClick={() => handleNavigateToDoc(selectedDoc.id)}
              style={{
                padding: '4px 10px', fontSize: '11px', fontWeight: 500,
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: '5px', cursor: 'pointer',
              }}
            >
              문서 열기
            </button>
          )}
          <button
            onClick={() => setDockOpen(v => !v)}
            style={{
              padding: '4px 10px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px',
              border: `1px solid ${dockOpen ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '5px', background: dockOpen ? 'var(--accent-2)' : 'transparent',
              color: dockOpen ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer',
              fontSize: '11px', fontWeight: 500,
            }}
          >
            <PanelRight size={12} /> 목록
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {graphQuery.isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                그래프를 불러오는 중...
              </div>
            </div>
          )}
          {selectedDocId !== null && nodes.length > 0 && (
            <MindMapCanvas
              nodes={nodes}
              edges={edges}
              categories={categoryInfos}
              selectedDocId={selectedDocId}
              onSelectDoc={handleSelectDoc}
              tagLinks={tagLinks}
            />
          )}
          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '16px', padding: '8px 20px',
            background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)',
            borderRadius: '28px', backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-sm)',
          }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                {l.label}
              </div>
            ))}
          </div>
          {/* Hint */}
          <div style={{
            position: 'absolute', bottom: '56px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontFamily: 'monospace',
          }}>
            노드 클릭 → 해당 문서로 이동 · 드래그 → 캔버스 이동 · 더블클릭 → 초기화
          </div>
        </div>

        {/* Right dock — document list */}
        <div style={{
          width: dockOpen ? '254px' : '0px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderLeft: dockOpen ? '1px solid var(--border)' : 'none',
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Dock header — category filters */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: 'var(--text-3)', marginBottom: '10px', fontFamily: 'monospace' }}>
              문서 탐색
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterCatId(null)}
                style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace',
                  background: filterCatId === null ? 'var(--accent-2)' : 'var(--surface-2)',
                  border: `1px solid ${filterCatId === null ? 'var(--accent)' : 'var(--border)'}`,
                  color: filterCatId === null ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer',
                }}
              >
                전체
              </button>
              {categoryInfos.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilterCatId(c.id)}
                  style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace',
                    background: filterCatId === c.id ? rgba(c.color, 0.1) : 'var(--surface-2)',
                    border: `1px solid ${filterCatId === c.id ? c.color : 'var(--border)'}`,
                    color: filterCatId === c.id ? c.color : 'var(--text-3)',
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dock document list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {Array.from(groupedDocs.entries()).map(([catId, docs]) => {
              const cat = categoryInfos.find(c => c.id === catId);
              return (
                <div key={catId ?? 'root'} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    padding: '8px 14px', fontSize: '9px', letterSpacing: '1px',
                    textTransform: 'uppercase' as const, fontFamily: 'monospace',
                    display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)',
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat?.color ?? '#9A9890', flexShrink: 0 }} />
                    {cat?.name ?? 'Root'}
                  </div>
                  {docs.map(d => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDoc(d.id)}
                      style={{
                        padding: '7px 14px 7px 26px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: d.id === selectedDocId ? 'var(--accent-2)' : 'transparent',
                        borderBottom: '1px solid rgba(0,0,0,0.03)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (d.id !== selectedDocId) e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = d.id === selectedDocId ? 'var(--accent-2)' : 'transparent'; }}
                    >
                      <FileText size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.title}
                      </span>
                      {d.id === selectedDocId && (
                        <span style={{ fontSize: '10px', color: 'var(--accent)' }}>●</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
