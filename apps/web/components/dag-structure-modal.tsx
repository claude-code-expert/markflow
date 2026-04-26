'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, FolderOpen } from 'lucide-react';

interface GraphNode {
  id: number;
  title: string;
  categoryId: number | null;
}

interface GraphEdge {
  source: number;
  target: number;
  type: 'prev' | 'next' | 'related';
}

interface DagStructureModalProps {
  open: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  currentDocId: number;
  currentTitle: string;
  categoryName: string | null;
  workspaceSlug: string;
  onEditLinks?: () => void;
}

const LEGEND = [
  { label: '현재 문서', color: '#1a3a2e', border: '#0f2a20' },
  { label: '상위 카테고리', color: '#fff', border: '#d6ddd7' },
  { label: '상위의 연관 문서', color: '#eef6f0', border: '#4a8a6e' },
  { label: '이전 / 다음', color: '#fff', border: '#4a8a6e' },
  { label: 'Root', color: '#fff', border: '#d6ddd7' },
];

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/* ── Related docs dropdown ── */

function RelatedDropdown({ docs, onNavigate }: { docs: GraphNode[]; onNavigate: (id: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md hover:bg-white transition-colors h-full"
      >
        <div className="text-center">
          <div className="text-[10px] font-semibold text-[#9A9890] uppercase tracking-wider">연관 문서</div>
          <div className="text-[13px] font-medium text-[#7C3AED] flex items-center justify-center gap-1">
            {docs.length}개
            <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </div>
        </div>
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 bg-white border border-[#E2E0D8] rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => onNavigate(d.id)}
              className="w-full text-left px-3 py-2 text-[13px] text-[#6D28D9] hover:bg-[#F5F3FF] flex items-center gap-2 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] shrink-0" />
              <span className="truncate">{d.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DagStructureModal({
  open, onClose, nodes, edges, currentDocId, currentTitle,
  categoryName, workspaceSlug, onEditLinks,
}: DagStructureModalProps) {
  const router = useRouter();
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Drag-to-pan via viewBox offset
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const onPanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('g[class*="cursor-pointer"]')) return;
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, panX, panY };
    e.currentTarget.style.cursor = 'grabbing';
  }, [panX, panY]);

  const onPanMove = useCallback((e: React.MouseEvent) => {
    const ds = dragState.current;
    if (!ds.dragging || !svgRef.current) return;
    // Convert pixel movement to SVG units using the rendered size
    const rect = svgRef.current.getBoundingClientRect();
    const svgW = svgRef.current.viewBox.baseVal.width;
    const ratio = svgW / rect.width;
    setPanX(ds.panX - (e.clientX - ds.startX) * ratio);
    setPanY(ds.panY - (e.clientY - ds.startY) * ratio);
  }, []);

  const onPanEnd = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dragState.current.dragging = false;
    e.currentTarget.style.cursor = 'grab';
  }, []);

  const currentEdges = useMemo(() => edges.filter(
    (e) => e.source === currentDocId || e.target === currentDocId
  ), [edges, currentDocId]);

  const prevDoc = useMemo(() => {
    const edge = currentEdges.find((e) => e.type === 'prev' && e.source === currentDocId);
    return edge ? nodes.find((n) => n.id === edge.target) : undefined;
  }, [currentEdges, nodes, currentDocId]);

  const nextDoc = useMemo(() => {
    const edge = currentEdges.find((e) => e.type === 'next' && e.source === currentDocId);
    return edge ? nodes.find((n) => n.id === edge.target) : undefined;
  }, [currentEdges, nodes, currentDocId]);

  const relatedDocs = useMemo(() => {
    return currentEdges
      .filter((e) => e.type === 'related')
      .map((e) => {
        const targetId = e.source === currentDocId ? e.target : e.source;
        return nodes.find((n) => n.id === targetId);
      })
      .filter(Boolean) as GraphNode[];
  }, [currentEdges, nodes, currentDocId]);

  const currentNode = useMemo(
    () => nodes.find((n) => n.id === currentDocId) ?? null,
    [nodes, currentDocId],
  );

  // 상위 문서의 연관문서 = 같은 카테고리에 속한 sibling 문서들 (카테고리가 곧 "상위")
  const siblings = useMemo(() => {
    if (currentNode?.categoryId == null) return [];
    return nodes.filter(
      (n) => n.categoryId === currentNode.categoryId && n.id !== currentDocId,
    );
  }, [nodes, currentNode, currentDocId]);

  const navigateToDoc = (docId: number) => {
    onClose();
    router.push(`/${workspaceSlug}/doc/${docId}`);
  };

  const zoom = (factor: number) => {
    if (factor === 1) { setScale(1); setPanX(0); setPanY(0); }
    else setScale((s) => Math.max(0.5, Math.min(2, s * factor)));
  };

  if (!open) return null;

  // Layout from docs/sample/DocumentMap.tsx — 4 columns, fixed viewBox
  const SVG_W = 900;
  const SVG_H = 380;

  const N = {
    root:     { x: 40,  y: 85,  w: 130, h: 50 },
    category: { x: 40,  y: 245, w: 130, h: 50 },
    sibling:  { x: 170, y: 165, w: 130, h: 50 },
    current:  { x: 330, y: 160, w: 170, h: 60 },
    prev:     { x: 590, y: 75,  w: 260, h: 50 },
    next:     { x: 590, y: 255, w: 260, h: 50 },
  } as const;

  const firstSibling = siblings[0] ?? null;
  const extraSiblings = Math.max(0, siblings.length - 1);
  const showCategory = !!categoryName;
  const showSibling = !!firstSibling;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[1000px] max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        {/* Header — category badge + title */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2.5">
            {categoryName && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#1343B0] bg-[#EEF3FF] border border-[#93C5FD] rounded-md">
                <FolderOpen size={11} /> {categoryName}
              </span>
            )}
            {!categoryName && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#9A9890] bg-[#F1F0EC] border border-[#E2E0D8] rounded-md">
                <FolderOpen size={11} /> Root
              </span>
            )}
            <h2 className="font-[var(--font-sora)] text-[17px] font-semibold">문서 연결 구조</h2>
          </div>
          <button onClick={onClose} className="text-[#9A9890] hover:text-[#1A1916]">✕</button>
        </div>

        <div className="px-6 py-4">
          {/* Legend + Zoom */}
          <div className="flex flex-wrap items-center gap-3.5 mb-4 p-3 bg-[#F1F0EC] rounded-lg border border-[#E2E0D8]">
            {LEGEND.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-[#57564F]">
                <div className="w-4 h-4 rounded-sm" style={{ background: l.color, border: `1.5px solid ${l.border}` }} />
                {l.label}
              </div>
            ))}
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => zoom(0.85)} className="px-2 py-1 text-xs bg-white border border-[#CBC9C0] rounded">−</button>
              <button onClick={() => zoom(1)} className="px-2 py-1 text-xs bg-white border border-[#CBC9C0] rounded">1:1</button>
              <button onClick={() => zoom(1.15)} className="px-2 py-1 text-xs bg-white border border-[#CBC9C0] rounded">+</button>
            </div>
          </div>

          {/* Diagram — drag to pan */}
          <div
            className="bg-[#F8F7F4] border border-[#E2E0D8] rounded-xl overflow-hidden p-4"
            style={{ cursor: 'grab' }}
            onMouseDown={onPanStart}
            onMouseMove={onPanMove}
            onMouseUp={onPanEnd}
            onMouseLeave={onPanEnd}
          >
            <svg ref={svgRef} viewBox={`${panX} ${panY} ${SVG_W / scale} ${SVG_H / scale}`} style={{ width: '100%', height: `${Math.max(280, SVG_H * scale * 0.6)}px` }}>
              {/* Edges — root/category/sibling → current → prev/next */}
              <g fill="none" strokeWidth="1.5">
                {showSibling ? (
                  <>
                    <path d="M 170 110 C 220 130 220 160 170 180" stroke="#d6ddd7" />
                    {showCategory && <path d="M 170 270 C 220 250 220 220 170 200" stroke="#d6ddd7" />}
                    <path d="M 300 190 Q 315 190 330 190" stroke="#4a8a6e" />
                  </>
                ) : (
                  <>
                    <path d="M 170 110 Q 250 150 330 180" stroke="#d6ddd7" />
                    {showCategory && <path d="M 170 270 Q 250 230 330 200" stroke="#d6ddd7" />}
                  </>
                )}
                <path d="M 500 190 Q 545 100 590 100" stroke={prevDoc ? '#4a8a6e' : '#d6ddd7'} strokeDasharray={prevDoc ? '0' : '4 3'} />
                <path d="M 500 190 Q 545 280 590 280" stroke={nextDoc ? '#4a8a6e' : '#d6ddd7'} strokeDasharray={nextDoc ? '0' : '4 3'} />
              </g>

              {/* Root */}
              <g>
                <rect x={N.root.x} y={N.root.y} width={N.root.w} height={N.root.h} rx="8" fill="#fff" stroke="#d6ddd7" strokeWidth="1.5" />
                <text x={N.root.x + N.root.w / 2} y={N.root.y + 22} textAnchor="middle" fontSize="11" fontWeight="700" fill="#57564F">root</text>
                <text x={N.root.x + N.root.w / 2} y={N.root.y + 38} textAnchor="middle" fontSize="9" fill="#9A9890">{truncate(decodeURIComponent(workspaceSlug), 18)}</text>
              </g>

              {/* 상위 카테고리 */}
              {showCategory && (
                <g>
                  <rect x={N.category.x} y={N.category.y} width={N.category.w} height={N.category.h} rx="8" fill="#fff" stroke="#d6ddd7" strokeWidth="1.5" />
                  <text x={N.category.x + N.category.w / 2} y={N.category.y + 20} textAnchor="middle" fontSize="9" fontWeight="600" fill="#9A9890">상위</text>
                  <text x={N.category.x + N.category.w / 2} y={N.category.y + 36} textAnchor="middle" fontSize="11" fontWeight="700" fill="#57564F">{truncate(categoryName!, 14)}</text>
                </g>
              )}

              {/* 상위의 연관 문서 (sibling) */}
              {showSibling && firstSibling && (
                <g className="cursor-pointer" onClick={() => navigateToDoc(firstSibling.id)}>
                  <rect x={N.sibling.x} y={N.sibling.y} width={N.sibling.w} height={N.sibling.h} rx="8" fill="#eef6f0" stroke="#4a8a6e" strokeWidth="1.5" />
                  <text x={N.sibling.x + N.sibling.w / 2} y={N.sibling.y + 20} textAnchor="middle" fontSize="9" fontWeight="600" fill="#4a8a6e">상위의 연관</text>
                  <text x={N.sibling.x + N.sibling.w / 2} y={N.sibling.y + 36} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a3a2e">{truncate(firstSibling.title, 14)}</text>
                  {extraSiblings > 0 && (
                    <text x={N.sibling.x + N.sibling.w - 6} y={N.sibling.y - 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#4a8a6e">+{extraSiblings}</text>
                  )}
                </g>
              )}

              {/* 현재 문서 */}
              <g>
                <rect x={N.current.x - 3} y={N.current.y - 3} width={N.current.w + 6} height={N.current.h + 6} rx="13" fill="none" stroke="#4a8a6e" strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
                </rect>
                <rect x={N.current.x} y={N.current.y} width={N.current.w} height={N.current.h} rx="10" fill="#1a3a2e" stroke="#0f2a20" strokeWidth="2" />
                <text x={N.current.x + N.current.w / 2} y={N.current.y + 24} textAnchor="middle" fontSize="10" fontWeight="600" fill="rgba(255,255,255,.85)">현재 문서</text>
                <text x={N.current.x + N.current.w / 2} y={N.current.y + 44} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{truncate(currentTitle, 18)}</text>
              </g>

              {/* 이전 문서 */}
              {prevDoc ? (
                <g className="cursor-pointer" onClick={() => navigateToDoc(prevDoc.id)}>
                  <rect x={N.prev.x} y={N.prev.y} width={N.prev.w} height={N.prev.h} rx="8" fill="#fff" stroke="#4a8a6e" strokeWidth="1.5" />
                  <text x={N.prev.x + 16} y={N.prev.y + 20} fontSize="9" fontWeight="600" fill="#4a8a6e">← 이전 문서</text>
                  <text x={N.prev.x + 16} y={N.prev.y + 38} fontSize="11" fontWeight="700" fill="#1a3a2e">{truncate(prevDoc.title, 32)}</text>
                </g>
              ) : (
                <g>
                  <rect x={N.prev.x} y={N.prev.y} width={N.prev.w} height={N.prev.h} rx="8" fill="#fff" stroke="#d6ddd7" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x={N.prev.x + N.prev.w / 2} y={N.prev.y + 30} textAnchor="middle" fontSize="11" fill="#CBC9C0">이전 문서 없음</text>
                </g>
              )}

              {/* 다음 문서 */}
              {nextDoc ? (
                <g className="cursor-pointer" onClick={() => navigateToDoc(nextDoc.id)}>
                  <rect x={N.next.x} y={N.next.y} width={N.next.w} height={N.next.h} rx="8" fill="#fff" stroke="#4a8a6e" strokeWidth="1.5" />
                  <text x={N.next.x + 16} y={N.next.y + 20} fontSize="9" fontWeight="600" fill="#4a8a6e">다음 문서 →</text>
                  <text x={N.next.x + 16} y={N.next.y + 38} fontSize="11" fontWeight="700" fill="#1a3a2e">{truncate(nextDoc.title, 32)}</text>
                </g>
              ) : (
                <g>
                  <rect x={N.next.x} y={N.next.y} width={N.next.w} height={N.next.h} rx="8" fill="#fff" stroke="#d6ddd7" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x={N.next.x + N.next.w / 2} y={N.next.y + 30} textAnchor="middle" fontSize="11" fill="#CBC9C0">다음 문서 없음</text>
                </g>
              )}
            </svg>
          </div>

          {/* Navigation bar: ← prev | related (center) | next → */}
          <div className="flex items-stretch gap-2 mt-3.5 bg-[#F1F0EC] rounded-lg border border-[#E2E0D8] p-1.5">
            {/* Left: prev */}
            <div className="flex-1 min-w-0">
              {prevDoc ? (
                <button
                  onClick={() => navigateToDoc(prevDoc.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left hover:bg-white transition-colors"
                >
                  <span className="text-[#16A34A] text-sm font-bold shrink-0">←</span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-[#9A9890] uppercase tracking-wider">이전 문서</div>
                    <div className="text-[13px] font-medium text-[#15803D] truncate">{prevDoc.title}</div>
                  </div>
                </button>
              ) : (
                <div className="flex items-center justify-center h-full px-3 py-2.5">
                  <span className="text-[12px] text-[#CBC9C0]">이전 문서 없음</span>
                </div>
              )}
            </div>

            {/* Center divider */}
            <div className="w-px bg-[#E2E0D8] self-stretch my-1" />

            {/* Center: related docs */}
            <div className="flex-1 min-w-0">
              {relatedDocs.length > 0 ? (
                <RelatedDropdown docs={relatedDocs} onNavigate={navigateToDoc} />
              ) : (
                <div className="flex items-center justify-center h-full px-3 py-2.5">
                  <span className="text-[12px] text-[#CBC9C0]">연관 문서 없음</span>
                </div>
              )}
            </div>

            {/* Right divider */}
            <div className="w-px bg-[#E2E0D8] self-stretch my-1" />

            {/* Right: next */}
            <div className="flex-1 min-w-0">
              {nextDoc ? (
                <button
                  onClick={() => navigateToDoc(nextDoc.id)}
                  className="w-full flex items-center justify-end gap-2 px-3 py-2.5 rounded-md text-right hover:bg-white transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-[#9A9890] uppercase tracking-wider text-right">다음 문서</div>
                    <div className="text-[13px] font-medium text-[#15803D] truncate">{nextDoc.title}</div>
                  </div>
                  <span className="text-[#16A34A] text-sm font-bold shrink-0">→</span>
                </button>
              ) : (
                <div className="flex items-center justify-center h-full px-3 py-2.5">
                  <span className="text-[12px] text-[#CBC9C0]">다음 문서 없음</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[#E2E0D8]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#57564F] bg-white border-[1.5px] border-[#CBC9C0] rounded-md hover:bg-[#F1F0EC]">
            닫기
          </button>
          {onEditLinks && (
            <button onClick={onEditLinks} className="px-4 py-2 text-sm font-medium text-white bg-[#1A56DB] rounded-md hover:bg-[#1343B0]">
              링크 편집
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
