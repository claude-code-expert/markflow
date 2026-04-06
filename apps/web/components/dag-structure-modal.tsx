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
  { label: '현재 문서', color: '#1A56DB', border: '#1343B0' },
  { label: '상위 카테고리', color: '#EEF3FF', border: '#93C5FD' },
  { label: '이전 / 다음', color: '#F0FDF4', border: '#86EFAC' },
  { label: '연관 문서', color: '#F5F3FF', border: '#C4B5FD' },
  { label: 'Root / 일반', color: '#F1F0EC', border: '#CBD5E1' },
];

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

  const navigateToDoc = (docId: number) => {
    onClose();
    router.push(`/${workspaceSlug}/doc/${docId}`);
  };

  const zoom = (factor: number) => {
    if (factor === 1) { setScale(1); setPanX(0); setPanY(0); }
    else setScale((s) => Math.max(0.5, Math.min(2, s * factor)));
  };

  if (!open) return null;

  // Layout — collect all right-side nodes, distribute vertically
  const N = { w: 120, h: 44, rx: 8 };
  const GAP = 12;
  const PAD = 24;

  const rightNodes: { doc: GraphNode; label: string; type: 'prev' | 'next' | 'related' }[] = [];
  if (prevDoc) rightNodes.push({ doc: prevDoc, label: '← prev', type: 'prev' });
  if (nextDoc) rightNodes.push({ doc: nextDoc, label: 'next →', type: 'next' });
  for (const rd of relatedDocs) {
    rightNodes.push({ doc: rd, label: 'related', type: 'related' });
  }

  const rightTotalH = rightNodes.length * N.h + Math.max(0, rightNodes.length - 1) * GAP;
  const leftMinH = categoryName ? N.h + 70 + 40 : 70 + 40; // root + category + current
  const contentH = Math.max(rightTotalH, leftMinH, 150);
  const SVG_H = contentH + PAD * 2;
  const SVG_W = 760;
  const cy = SVG_H / 2;

  // Right column: vertically centered
  const rightStartY = cy - rightTotalH / 2;

  // Left column positions
  const rootX = PAD;
  const rootCy = cy;
  const curX = 340;
  const curH = 60;
  const curY = cy - curH / 2;
  const rightX = 580;

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
              {/* Root */}
              <g>
                <rect x={rootX} y={rootCy - N.h / 2} width={80} height={N.h} rx={N.rx} fill="#F1F0EC" stroke="#CBD5E1" strokeWidth="2" />
                <text x={rootX + 40} y={rootCy - 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#57564F">root</text>
                <text x={rootX + 40} y={rootCy + 12} textAnchor="middle" fontSize="8" fill="#9A9890">{decodeURIComponent(workspaceSlug).slice(0, 12)}</text>
              </g>

              {/* Lines root → category/current */}
              {categoryName ? (
                <>
                  <line x1={rootX + 80} y1={rootCy} x2={190} y2={cy - 50} stroke="#CBD5E1" strokeWidth="2" />
                  <g>
                    <rect x={190} y={cy - 50 - N.h / 2} width={N.w} height={N.h} rx={N.rx} fill="#EEF3FF" stroke="#93C5FD" strokeWidth="2" />
                    <text x={190 + N.w / 2} y={cy - 50 + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1343B0">{categoryName.slice(0, 14)}</text>
                  </g>
                  <line x1={190 + N.w} y1={cy - 50} x2={curX} y2={cy} stroke="#93C5FD" strokeWidth="2" />
                </>
              ) : (
                <line x1={rootX + 80} y1={rootCy} x2={curX} y2={cy} stroke="#CBD5E1" strokeWidth="2" />
              )}

              {/* Current doc */}
              <g>
                <rect x={curX} y={curY} width={N.w} height={curH} rx={10} fill="#1A56DB" stroke="#1343B0" strokeWidth="2.5" />
                <rect x={curX - 3} y={curY - 3} width={N.w + 6} height={curH + 6} rx={13} fill="none" stroke="#93C5FD" strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
                </rect>
                <text x={curX + N.w / 2} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">현재 문서</text>
                <text x={curX + N.w / 2} y={cy + 12} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,.85)">{currentTitle.slice(0, 16)}</text>
              </g>

              {/* Right-side nodes: prev, next, related — dynamically positioned */}
              {rightNodes.map((node, i) => {
                const ny = rightStartY + i * (N.h + GAP) + N.h / 2;
                const isPrevNext = node.type === 'prev' || node.type === 'next';
                const fill = isPrevNext ? '#F0FDF4' : '#F5F3FF';
                const stroke = isPrevNext ? '#86EFAC' : '#C4B5FD';
                const textColor = isPrevNext ? '#16A34A' : '#7C3AED';
                const titleColor = isPrevNext ? '#15803D' : '#6D28D9';
                const dash = node.type === 'related' ? '5 3' : '0';

                return (
                  <g key={node.doc.id} className="cursor-pointer" onClick={() => navigateToDoc(node.doc.id)}>
                    <line x1={curX + N.w} y1={cy} x2={rightX} y2={ny} stroke={stroke} strokeWidth={isPrevNext ? 2 : 1.5} strokeDasharray={dash} />
                    <rect x={rightX} y={ny - N.h / 2} width={N.w} height={N.h} rx={N.rx} fill={fill} stroke={stroke} strokeWidth={isPrevNext ? 2 : 1.5} />
                    <text x={rightX + N.w / 2} y={ny - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={textColor}>{node.label}</text>
                    <text x={rightX + N.w / 2} y={ny + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill={titleColor}>{node.doc.title.slice(0, 14)}</text>
                  </g>
                );
              })}
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
