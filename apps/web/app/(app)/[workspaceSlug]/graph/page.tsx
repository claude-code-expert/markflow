'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronLeft, ChevronRight, PanelRight, Moon, Sun } from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import { useWorkspaceStore } from '../../../../stores/workspace-store';
import { MindMapCanvas, type MindMapNode, type MindMapEdge, type CategoryInfo } from '../../../../components/mind-map-canvas';
import { GraphPreviewModal } from '../../../../components/graph-preview-modal';
import type { Category } from '../../../../lib/types';

/* ─── Types ─── */

interface GraphResponse {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

interface DocumentDetail {
  id: number;
  title: string;
  content: string;
  categoryId: number | null;
  updatedAt: string;
}

/* ─── Constants ─── */
const PALETTE = ['#e05252', '#d97706', '#0891b2', '#0284c7', '#7c3aed', '#ca8a04', '#16a34a', '#be185d', '#0369a1', '#9333ea'];

const LEGEND_LIGHT = [
  { label: '카테고리', color: '#6d28d9' },
  { label: '이전 문서', color: '#0369a1' },
  { label: '다음 문서', color: '#c2410c' },
  { label: '연관 문서', color: '#be185d' },
  { label: '태그 연결', color: '#0e7490' },
];
const LEGEND_DARK = [
  { label: '카테고리', color: '#a78bfa' },
  { label: '이전 문서', color: '#00d4ff' },
  { label: '다음 문서', color: '#ffd700' },
  { label: '연관 문서', color: '#ff69b4' },
  { label: '태그 연결', color: '#7dd3fc' },
];

/* ─── Page Component ─── */

export default function GraphPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { workspaces, currentWorkspace, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  // Resolve workspace from slug
  useEffect(() => {
    if (workspaces.length === 0) void fetchWorkspaces();
  }, [workspaces.length, fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      const found = workspaces.find((ws) => ws.name === decodeURIComponent(workspaceSlug));
      if (found) setCurrentWorkspace(found);
    }
  }, [currentWorkspace, workspaces, workspaceSlug, setCurrentWorkspace]);

  const slug = currentWorkspace?.name ?? workspaceSlug;
  const wsId = currentWorkspace?.id;

  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [filterCatId, setFilterCatId] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentDetail | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const categoryInfos: CategoryInfo[] = useMemo(() =>
    rawCategories.map((c, i) => ({ id: c.id, name: c.name, color: PALETTE[i % PALETTE.length] ?? '#6d28d9' })),
    [rawCategories],
  );

  const catMap = useMemo(() => {
    const m = new Map<number, { name: string; color: string }>();
    categoryInfos.forEach(c => m.set(c.id, { name: c.name, color: c.color }));
    return m;
  }, [categoryInfos]);

  const tagLinks: { fromId: number; toId: number }[] = useMemo(() => [], []);

  // Auto-select: prefer a node that has edges (most connected first)
  useEffect(() => {
    if (selectedDocId === null && nodes.length > 0 && edges.length >= 0) {
      const edgeCount = new Map<number, number>();
      for (const e of edges) {
        edgeCount.set(e.source, (edgeCount.get(e.source) ?? 0) + 1);
        edgeCount.set(e.target, (edgeCount.get(e.target) ?? 0) + 1);
      }
      const sorted = [...nodes].sort((a, b) => (edgeCount.get(b.id) ?? 0) - (edgeCount.get(a.id) ?? 0));
      setSelectedDocId(sorted[0]?.id ?? nodes[0]!.id);
    }
  }, [nodes, edges, selectedDocId]);

  const selectedDoc = nodes.find(n => n.id === selectedDocId);
  const selectedCat = selectedDoc?.categoryId != null ? catMap.get(selectedDoc.categoryId) : null;
  const previewCat = previewDoc?.categoryId != null ? catMap.get(previewDoc.categoryId) : null;

  // Prev/Next
  const prevDocId = useMemo(() => {
    if (!selectedDocId) return null;
    return edges.find(e => e.source === selectedDocId && e.type === 'prev')?.target ?? null;
  }, [edges, selectedDocId]);
  const nextDocId = useMemo(() => {
    if (!selectedDocId) return null;
    return edges.find(e => e.source === selectedDocId && e.type === 'next')?.target ?? null;
  }, [edges, selectedDocId]);

  // Node click → select + open preview
  const handleNodeClick = useCallback(async (docId: number) => {
    setSelectedDocId(docId);
    if (!wsId) return;
    try {
      const res = await apiFetch<{ document: DocumentDetail }>(`/workspaces/${wsId}/documents/${docId}`);
      setPreviewDoc(res.document);
      setPreviewOpen(true);
    } catch { /* preview unavailable */ }
  }, [wsId]);

  // Sidebar select (no preview)
  const handleSidebarSelect = useCallback((docId: number) => { setSelectedDocId(docId); }, []);

  // Group docs for sidebar
  const groupedDocs = useMemo(() => {
    const groups = new Map<number | null, MindMapNode[]>();
    const filtered = filterCatId !== null ? nodes.filter(n => n.categoryId === filterCatId) : nodes;
    for (const n of filtered) {
      const key = n.categoryId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    return groups;
  }, [nodes, filterCatId]);

  const legend = dark ? LEGEND_DARK : LEGEND_LIGHT;

  // Loading state
  if (!wsId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          워크스페이스를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: dark ? '#05080e' : 'var(--bg)' }}>
      {/* ─── Topbar ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 18px', height: '48px', flexShrink: 0,
        background: dark ? 'rgba(5,8,14,0.92)' : 'rgba(255,255,255,0.97)',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`,
        backdropFilter: 'blur(16px)',
      }}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: dark ? '#38bdf8' : 'var(--accent)', letterSpacing: '-0.5px' }}>
          MarkFlow<span style={{ fontWeight: 300, fontSize: '11px', color: dark ? '#3d4d60' : 'var(--text-3)', marginLeft: '7px' }}>/ Mind Map</span>
        </span>
        <span style={{ width: '1px', height: '18px', background: dark ? 'rgba(255,255,255,0.06)' : 'var(--border)' }} />
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: dark ? '#94a3b8' : 'var(--text-3)' }}>
          {selectedDoc ? `${selectedCat?.name ?? 'Root'} \u203A ${selectedDoc.title}` : '문서를 선택하세요'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Prev/Next */}
          <NavBtn dark={dark} disabled={!prevDocId} onClick={() => prevDocId && handleSidebarSelect(prevDocId)} title="이전 문서"><ChevronLeft size={14} /></NavBtn>
          <NavBtn dark={dark} disabled={!nextDocId} onClick={() => nextDocId && handleSidebarSelect(nextDocId)} title="다음 문서"><ChevronRight size={14} /></NavBtn>
          <Sep dark={dark} />
          {/* Theme toggle */}
          <div style={{
            display: 'flex', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`,
            borderRadius: '7px', overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', padding: '2px', gap: '2px',
          }}>
            <ThemeBtn active={!dark} onClick={() => setDark(false)} dark={dark}><Sun size={10} /> 라이트</ThemeBtn>
            <ThemeBtn active={dark} onClick={() => setDark(true)} dark={dark}><Moon size={10} /> 다크</ThemeBtn>
          </div>
          <Sep dark={dark} />
          {/* Dock toggle */}
          <button onClick={() => setDockOpen(v => !v)} style={{
            padding: '0 12px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px',
            border: `1px solid ${dockOpen ? (dark ? '#38bdf8' : 'var(--accent)') : (dark ? 'rgba(255,255,255,0.06)' : 'var(--border)')}`,
            borderRadius: '5px',
            background: dockOpen ? (dark ? 'rgba(56,189,248,0.08)' : 'var(--accent-2)') : 'transparent',
            color: dockOpen ? (dark ? '#38bdf8' : 'var(--accent)') : (dark ? '#94a3b8' : 'var(--text-3)'),
            cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap',
          }}>
            목록 <PanelRight size={10} />
          </button>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {graphQuery.isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
              <div style={{ textAlign: 'center', color: dark ? '#94a3b8' : 'var(--text-3)' }}>
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
              onSelectDoc={(docId) => void handleNodeClick(docId)}
              tagLinks={tagLinks}
              dark={dark}
            />
          )}
          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '16px', padding: '8px 20px',
            background: dark ? 'rgba(9,13,22,0.92)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`,
            borderRadius: '28px', backdropFilter: 'blur(14px)',
            boxShadow: dark ? 'none' : 'var(--shadow-sm)', zIndex: 10,
          }}>
            {legend.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: dark ? '#94a3b8' : 'var(--text-3)', fontFamily: 'monospace' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                {l.label}
              </div>
            ))}
          </div>
          {/* Hint */}
          <div style={{
            position: 'absolute', bottom: '56px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '10px', color: dark ? 'rgba(255,255,255,0.13)' : 'var(--text-3)',
            whiteSpace: 'nowrap', fontFamily: 'monospace', zIndex: 10,
          }}>
            노드 클릭 → 프리뷰 · 드래그 → 캔버스 이동 · 더블클릭 → 초기화
          </div>
        </div>

        {/* ─── Right dock ─── */}
        <div style={{
          width: dockOpen ? '254px' : '0px', flexShrink: 0, overflow: 'hidden',
          background: dark ? 'rgba(9,13,22,0.93)' : 'var(--surface)',
          borderLeft: dockOpen ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}` : 'none',
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`, flexShrink: 0 }}>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: dark ? '#3d4d60' : 'var(--text-3)', marginBottom: '10px', fontFamily: 'monospace' }}>
              문서 탐색
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <Chip dark={dark} active={filterCatId === null} color={dark ? '#38bdf8' : 'var(--accent)'} onClick={() => setFilterCatId(null)}>전체</Chip>
              {categoryInfos.map(c => (
                <Chip key={c.id} dark={dark} active={filterCatId === c.id} color={c.color} onClick={() => setFilterCatId(c.id)}>{c.name}</Chip>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {Array.from(groupedDocs.entries()).map(([catId, docs]) => {
              const cat = categoryInfos.find(c => c.id === catId);
              return (
                <div key={catId ?? 'root'} style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}` }}>
                  <div style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' as const, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', color: dark ? '#3d4d60' : 'var(--text-3)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat?.color ?? '#9A9890', flexShrink: 0 }} />
                    {cat?.name ?? 'Root'}
                  </div>
                  {docs.map(d => (
                    <div
                      key={d.id}
                      onClick={() => handleSidebarSelect(d.id)}
                      style={{
                        padding: '7px 14px 7px 26px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: d.id === selectedDocId ? (dark ? 'rgba(56,189,248,0.08)' : 'var(--accent-2)') : 'transparent',
                        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)'}`,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (d.id !== selectedDocId) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'var(--surface-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = d.id === selectedDocId ? (dark ? 'rgba(56,189,248,0.08)' : 'var(--accent-2)') : 'transparent'; }}
                    >
                      <FileText size={12} style={{ color: dark ? '#3d4d60' : 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dark ? '#dde4ef' : 'var(--text)' }}>
                        {d.title}
                      </span>
                      {d.id === selectedDocId && <span style={{ fontSize: '10px', color: dark ? '#38bdf8' : 'var(--accent)' }}>●</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      <GraphPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        workspaceSlug={slug}
        document={previewDoc ? {
          id: previewDoc.id, title: previewDoc.title, content: previewDoc.content,
          categoryName: previewCat?.name ?? null, categoryColor: previewCat?.color, updatedAt: previewDoc.updatedAt,
        } : null}
      />
    </div>
  );
}

/* ─── Sub-components ─── */

function NavBtn({ dark, disabled, onClick, title, children }: { dark: boolean; disabled: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`, borderRadius: 5, background: 'transparent',
      color: disabled ? (dark ? '#3d4d60' : 'var(--border)') : (dark ? '#dde4ef' : 'var(--text-2)'),
      cursor: disabled ? 'default' : 'pointer', fontSize: 11, fontFamily: 'monospace',
    }}>{children}</button>
  );
}

function ThemeBtn({ active, onClick, dark, children }: { active: boolean; onClick: () => void; dark: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      height: 24, padding: '0 10px', border: 'none', borderRadius: 5,
      background: active ? (dark ? '#38bdf8' : '#6d28d9') : 'transparent',
      color: active ? (dark ? '#05080e' : '#ffffff') : (dark ? '#3d4d60' : 'var(--text-3)'),
      cursor: 'pointer', fontSize: 10, fontFamily: 'monospace', fontWeight: active ? 500 : 400,
      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

function Sep({ dark }: { dark: boolean }) {
  return <span style={{ width: 1, height: 18, background: dark ? 'rgba(255,255,255,0.06)' : 'var(--border)' }} />;
}

function Chip({ dark, active, color, onClick, children }: { dark: boolean; active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace',
      background: active ? hexToRgba(color, dark ? 0.12 : 0.1) : (dark ? 'rgba(255,255,255,0.04)' : 'var(--surface-2)'),
      border: `1px solid ${active ? color : (dark ? 'rgba(255,255,255,0.06)' : 'var(--border)')}`,
      color: active ? color : (dark ? '#94a3b8' : 'var(--text-3)'), cursor: 'pointer',
    }}>{children}</button>
  );
}

function hexToRgba(hex: string, a: number): string {
  if (hex.startsWith('var(')) return hex; // CSS variable — can't parse
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
