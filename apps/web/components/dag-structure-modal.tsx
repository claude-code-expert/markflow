'use client';

import { useState, useMemo } from 'react';
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

interface DagStructureModalProps {
  open: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  currentDocId: string;
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

export function DagStructureModal({
  open, onClose, nodes, edges, currentDocId, currentTitle,
  categoryName, workspaceSlug, onEditLinks,
}: DagStructureModalProps) {
  const router = useRouter();
  const [scale, setScale] = useState(1);

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

  const navigateToDoc = (docId: string) => {
    onClose();
    router.push(`/${workspaceSlug}/docs/${docId}`);
  };

  const zoom = (factor: number) => {
    if (factor === 1) setScale(1);
    else setScale((s) => Math.max(0.5, Math.min(2, s * factor)));
  };

  if (!open) return null;

  // Layout: simple horizontal flow
  const SVG_W = 820;
  const SVG_H = 400;
  const N = { w: 130, h: 50, rx: 8 };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[1000px] max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-[var(--font-sora)] text-[17px] font-semibold">문서 연결 구조 다이어그램</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9A9890]">{currentTitle}</span>
            <button onClick={onClose} className="text-[#9A9890] hover:text-[#1A1916]">✕</button>
          </div>
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

          {/* Diagram */}
          <div className="bg-[#F8F7F4] border border-[#E2E0D8] rounded-xl overflow-auto p-6">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', minWidth: '700px', transform: `scale(${scale})`, transformOrigin: 'center' }}>
              {/* Root */}
              <g className="cursor-pointer" onClick={() => {}}>
                <rect x={20} y={175} width={90} height={N.h} rx={N.rx} fill="#F1F0EC" stroke="#CBD5E1" strokeWidth="2" />
                <text x={65} y={196} textAnchor="middle" fontSize="11" fontWeight="700" fill="#57564F">root</text>
                <text x={65} y={213} textAnchor="middle" fontSize="9" fill="#9A9890">{workspaceSlug}</text>
              </g>
              {/* Lines root → category/current */}
              <line x1={110} y1={200} x2={218} y2={categoryName ? 120 : 200} stroke="#CBD5E1" strokeWidth="2" />
              {/* Category */}
              {categoryName && (
                <g>
                  <rect x={218} y={95} width={N.w} height={N.h} rx={N.rx} fill="#EEF3FF" stroke="#93C5FD" strokeWidth="2" />
                  <text x={283} y={116} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1343B0">{categoryName}</text>
                  <line x1={348} y1={120} x2={404} y2={200} stroke="#93C5FD" strokeWidth="2" />
                </g>
              )}
              {/* Current doc */}
              <g>
                <rect x={404} y={165} width={N.w} height={70} rx={10} fill="#1A56DB" stroke="#1343B0" strokeWidth="2.5" />
                <rect x={400} y={161} width={N.w + 8} height={78} rx={13} fill="none" stroke="#93C5FD" strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
                </rect>
                <text x={469} y={195} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">현재 문서</text>
                <text x={469} y={212} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.85)">{currentTitle.slice(0, 18)}</text>
              </g>
              {/* Prev */}
              {prevDoc && (
                <g className="cursor-pointer" onClick={() => navigateToDoc(prevDoc.id)}>
                  <line x1={534} y1={200} x2={600} y2={120} stroke="#86EFAC" strokeWidth="2" />
                  <rect x={600} y={95} width={N.w} height={N.h} rx={N.rx} fill="#F0FDF4" stroke="#86EFAC" strokeWidth="2" />
                  <text x={665} y={114} textAnchor="middle" fontSize="9" fontWeight="600" fill="#16A34A">← prev</text>
                  <text x={665} y={130} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#15803D">{prevDoc.title.slice(0, 16)}</text>
                </g>
              )}
              {/* Next */}
              {nextDoc && (
                <g className="cursor-pointer" onClick={() => navigateToDoc(nextDoc.id)}>
                  <line x1={534} y1={200} x2={600} y2={200} stroke="#86EFAC" strokeWidth="2" />
                  <rect x={600} y={175} width={N.w} height={N.h} rx={N.rx} fill="#F0FDF4" stroke="#86EFAC" strokeWidth="2" />
                  <text x={665} y={194} textAnchor="middle" fontSize="9" fontWeight="600" fill="#16A34A">next →</text>
                  <text x={665} y={210} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#15803D">{nextDoc.title.slice(0, 16)}</text>
                </g>
              )}
              {/* Related */}
              {relatedDocs.map((doc, i) => (
                <g key={doc.id} className="cursor-pointer" onClick={() => navigateToDoc(doc.id)}>
                  <line x1={534} y1={200} x2={600} y2={280 + i * 60} stroke="#C4B5FD" strokeWidth="1.5" strokeDasharray="5 3" />
                  <rect x={600} y={255 + i * 60} width={N.w} height={N.h - 2} rx={N.rx} fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="1.5" />
                  <text x={665} y={274 + i * 60} textAnchor="middle" fontSize="9" fill="#7C3AED">related</text>
                  <text x={665} y={290 + i * 60} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#6D28D9">{doc.title.slice(0, 16)}</text>
                </g>
              ))}
            </svg>
          </div>

          {/* Summary cards */}
          <div className="flex gap-3 mt-3.5 flex-wrap">
            <div className="flex-1 min-w-[160px] bg-[#F1F0EC] rounded-lg p-3 border border-[#E2E0D8]">
              <div className="text-[11px] font-semibold text-[#9A9890] uppercase tracking-wider mb-1">상위 카테고리</div>
              <div className="text-[13px] font-medium">{categoryName ?? '(루트)'}</div>
            </div>
            <div className="flex-1 min-w-[160px] bg-[#F1F0EC] rounded-lg p-3 border border-[#E2E0D8]">
              <div className="text-[11px] font-semibold text-[#9A9890] uppercase tracking-wider mb-1">이전 / 다음 문서</div>
              <div className="text-[13px]">{prevDoc ? `← ${prevDoc.title}` : '없음'}</div>
              <div className="text-[13px] mt-0.5">{nextDoc ? `→ ${nextDoc.title}` : '없음'}</div>
            </div>
            <div className="flex-1 min-w-[160px] bg-[#F1F0EC] rounded-lg p-3 border border-[#E2E0D8]">
              <div className="text-[11px] font-semibold text-[#9A9890] uppercase tracking-wider mb-1">연관 문서 ({relatedDocs.length}개)</div>
              {relatedDocs.slice(0, 2).map((d) => (
                <div key={d.id} className="text-[13px]">{d.title}</div>
              ))}
              {relatedDocs.length === 0 && <div className="text-[13px] text-[#9A9890]">없음</div>}
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
