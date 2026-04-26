'use client';

interface RelationDoc {
  id: number;
  title: string;
}

interface MiniDagProps {
  currentTitle: string;
  categoryName: string | null;
  prev: RelationDoc | null;
  next: RelationDoc | null;
  siblings: RelationDoc[];
  onClickFullView?: () => void;
}

const SVG_W = 440;
const SVG_H = 140;

const N = {
  root:     { x: 16,  y: 22,  w: 64,  h: 24 },
  category: { x: 16,  y: 94,  w: 64,  h: 24 },
  sibling:  { x: 96,  y: 58,  w: 64,  h: 24 },
  current:  { x: 180, y: 54,  w: 84,  h: 32 },
  prev:     { x: 286, y: 22,  w: 138, h: 24 },
  next:     { x: 286, y: 94,  w: 138, h: 24 },
} as const;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function MiniDagDiagram({ currentTitle, categoryName, prev, next, siblings, onClickFullView }: MiniDagProps) {
  const firstSibling = siblings[0] ?? null;
  const extraSiblings = Math.max(0, siblings.length - 1);
  const showCategory = !!categoryName;
  const showSibling = !!firstSibling;

  return (
    <div
      className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 hover:border-[var(--accent)] transition-colors"
      onClick={onClickFullView}
    >
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto block">
        {/* Edges */}
        <g fill="none" strokeWidth="1.2">
          {showSibling ? (
            <>
              <path d="M 80 34 C 90 50 90 60 96 66" stroke="#d6ddd7" />
              {showCategory && <path d="M 80 106 C 90 90 90 80 96 74" stroke="#d6ddd7" />}
              <path d="M 160 70 Q 170 70 180 70" stroke="#4a8a6e" />
            </>
          ) : (
            <>
              <path d="M 80 34 Q 130 56 180 64" stroke="#d6ddd7" />
              {showCategory && <path d="M 80 106 Q 130 84 180 76" stroke="#d6ddd7" />}
            </>
          )}
          <path d="M 264 70 Q 275 36 286 34" stroke={prev ? '#4a8a6e' : '#d6ddd7'} strokeDasharray={prev ? '0' : '3 2'} />
          <path d="M 264 70 Q 275 104 286 106" stroke={next ? '#4a8a6e' : '#d6ddd7'} strokeDasharray={next ? '0' : '3 2'} />
        </g>

        {/* Root */}
        <rect x={N.root.x} y={N.root.y} width={N.root.w} height={N.root.h} rx="5" fill="#fff" stroke="#d6ddd7" strokeWidth="1" />
        <text x={N.root.x + N.root.w / 2} y={N.root.y + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="#57564F">root</text>

        {/* 상위 카테고리 */}
        {showCategory && (
          <>
            <rect x={N.category.x} y={N.category.y} width={N.category.w} height={N.category.h} rx="5" fill="#fff" stroke="#d6ddd7" strokeWidth="1" />
            <text x={N.category.x + N.category.w / 2} y={N.category.y + 16} textAnchor="middle" fontSize="8" fontWeight="600" fill="#57564F">{truncate(categoryName!, 10)}</text>
          </>
        )}

        {/* 상위의 연관 문서 */}
        {showSibling && firstSibling && (
          <>
            <rect x={N.sibling.x} y={N.sibling.y} width={N.sibling.w} height={N.sibling.h} rx="5" fill="#eef6f0" stroke="#4a8a6e" strokeWidth="1" />
            <text x={N.sibling.x + N.sibling.w / 2} y={N.sibling.y + 16} textAnchor="middle" fontSize="8" fontWeight="600" fill="#1a3a2e">{truncate(firstSibling.title, 10)}</text>
            {extraSiblings > 0 && (
              <text x={N.sibling.x + N.sibling.w - 4} y={N.sibling.y - 2} textAnchor="end" fontSize="8" fontWeight="700" fill="#4a8a6e">+{extraSiblings}</text>
            )}
          </>
        )}

        {/* 현재 문서 */}
        <rect x={N.current.x - 2} y={N.current.y - 2} width={N.current.w + 4} height={N.current.h + 4} rx="8" fill="none" stroke="#4a8a6e" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <rect x={N.current.x} y={N.current.y} width={N.current.w} height={N.current.h} rx="6" fill="#1a3a2e" stroke="#0f2a20" strokeWidth="1.5" />
        <text x={N.current.x + N.current.w / 2} y={N.current.y + 13} textAnchor="middle" fontSize="7" fontWeight="600" fill="rgba(255,255,255,.85)">현재 문서</text>
        <text x={N.current.x + N.current.w / 2} y={N.current.y + 25} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{truncate(currentTitle, 12)}</text>

        {/* 이전 문서 */}
        {prev ? (
          <>
            <rect x={N.prev.x} y={N.prev.y} width={N.prev.w} height={N.prev.h} rx="5" fill="#fff" stroke="#4a8a6e" strokeWidth="1" />
            <text x={N.prev.x + 8} y={N.prev.y + 10} fontSize="7" fontWeight="600" fill="#4a8a6e">← 이전</text>
            <text x={N.prev.x + 8} y={N.prev.y + 20} fontSize="8" fontWeight="700" fill="#1a3a2e">{truncate(prev.title, 22)}</text>
          </>
        ) : (
          <>
            <rect x={N.prev.x} y={N.prev.y} width={N.prev.w} height={N.prev.h} rx="5" fill="#fff" stroke="#d6ddd7" strokeWidth="1" strokeDasharray="3 2" />
            <text x={N.prev.x + N.prev.w / 2} y={N.prev.y + 16} textAnchor="middle" fontSize="8" fill="#CBC9C0">이전 문서 없음</text>
          </>
        )}

        {/* 다음 문서 */}
        {next ? (
          <>
            <rect x={N.next.x} y={N.next.y} width={N.next.w} height={N.next.h} rx="5" fill="#fff" stroke="#4a8a6e" strokeWidth="1" />
            <text x={N.next.x + 8} y={N.next.y + 10} fontSize="7" fontWeight="600" fill="#4a8a6e">다음 →</text>
            <text x={N.next.x + 8} y={N.next.y + 20} fontSize="8" fontWeight="700" fill="#1a3a2e">{truncate(next.title, 22)}</text>
          </>
        ) : (
          <>
            <rect x={N.next.x} y={N.next.y} width={N.next.w} height={N.next.h} rx="5" fill="#fff" stroke="#d6ddd7" strokeWidth="1" strokeDasharray="3 2" />
            <text x={N.next.x + N.next.w / 2} y={N.next.y + 16} textAnchor="middle" fontSize="8" fill="#CBC9C0">다음 문서 없음</text>
          </>
        )}
      </svg>
      <p className="text-[11px] text-[var(--text-3)] text-center mt-1">클릭하면 전체 다이어그램을 확인합니다</p>
    </div>
  );
}
