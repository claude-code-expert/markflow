'use client';

interface RelationDoc {
  id: string;
  title: string;
}

interface MiniDagProps {
  currentTitle: string;
  categoryName: string | null;
  prev: RelationDoc | null;
  next: RelationDoc | null;
  related: RelationDoc[];
  onClickFullView?: () => void;
}

const NODE = { w: 90, h: 28, rx: 6 };
const GAP_X = 30;
const GAP_Y = 22;
const SVG_W = 440;
const SVG_H = 140;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function MiniDagDiagram({ currentTitle, categoryName, prev, next, related, onClickFullView }: MiniDagProps) {
  const cx = SVG_W / 2;
  const cy = SVG_H / 2;

  // Node positions
  const rootX = 20;
  const rootY = cy;
  const catX = rootX + NODE.w + GAP_X;
  const catY = cy;
  const curX = categoryName ? catX + NODE.w + GAP_X : rootX + NODE.w + GAP_X;
  const curY = cy;
  const rightX = curX + NODE.w + GAP_X;

  const connectedDocs = [
    ...(prev ? [{ ...prev, type: 'prev' as const }] : []),
    ...(next ? [{ ...next, type: 'next' as const }] : []),
    ...related.slice(0, 2).map((r) => ({ ...r, type: 'related' as const })),
  ];

  return (
    <div
      className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 hover:border-[var(--accent)] transition-colors"
      onClick={onClickFullView}
    >
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto block">
        {/* Root → Category/Current lines */}
        {categoryName && (
          <line x1={rootX + NODE.w} y1={rootY} x2={catX} y2={catY} stroke="#CBD5E1" strokeWidth="1.5" />
        )}
        <line
          x1={categoryName ? catX + NODE.w : rootX + NODE.w}
          y1={cy}
          x2={curX}
          y2={curY}
          stroke={categoryName ? '#93C5FD' : '#CBD5E1'}
          strokeWidth="1.5"
        />

        {/* Current → connected docs lines */}
        {connectedDocs.map((doc, i) => {
          const dy = (i - (connectedDocs.length - 1) / 2) * (NODE.h + GAP_Y);
          const color = doc.type === 'related' ? '#C4B5FD' : '#86EFAC';
          const dash = doc.type === 'related' ? '4 2' : '0';
          return (
            <line
              key={doc.id}
              x1={curX + NODE.w}
              y1={curY}
              x2={rightX}
              y2={cy + dy}
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray={dash}
            />
          );
        })}

        {/* Root node */}
        <rect x={rootX} y={rootY - NODE.h / 2} width={NODE.w} height={NODE.h} rx={NODE.rx} fill="#F1F0EC" stroke="#CBD5E1" strokeWidth="1.5" />
        <text x={rootX + NODE.w / 2} y={rootY + 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#57564F">root</text>

        {/* Category node */}
        {categoryName && (
          <>
            <rect x={catX} y={catY - NODE.h / 2} width={NODE.w} height={NODE.h} rx={NODE.rx} fill="#EEF3FF" stroke="#93C5FD" strokeWidth="1.5" />
            <text x={catX + NODE.w / 2} y={catY + 4} textAnchor="middle" fontSize="8" fontWeight="600" fill="#1343B0">
              {truncate(categoryName, 12)}
            </text>
          </>
        )}

        {/* Current doc node (highlighted) */}
        <rect x={curX} y={curY - NODE.h / 2} width={NODE.w} height={NODE.h} rx={NODE.rx} fill="#1A56DB" stroke="#1343B0" strokeWidth="2" />
        <rect x={curX - 2} y={curY - NODE.h / 2 - 2} width={NODE.w + 4} height={NODE.h + 4} rx={NODE.rx + 2} fill="none" stroke="#93C5FD" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <text x={curX + NODE.w / 2} y={curY + 4} textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">
          {truncate(currentTitle, 12)}
        </text>

        {/* Connected doc nodes */}
        {connectedDocs.map((doc, i) => {
          const dy = (i - (connectedDocs.length - 1) / 2) * (NODE.h + GAP_Y);
          const fill = doc.type === 'related' ? '#F5F3FF' : '#F0FDF4';
          const stroke = doc.type === 'related' ? '#C4B5FD' : '#86EFAC';
          const textColor = doc.type === 'related' ? '#7C3AED' : '#16A34A';
          const label = doc.type === 'prev' ? '← prev' : doc.type === 'next' ? 'next →' : 'related';
          return (
            <g key={doc.id}>
              <rect x={rightX} y={cy + dy - NODE.h / 2} width={NODE.w} height={NODE.h} rx={NODE.rx} fill={fill} stroke={stroke} strokeWidth="1.5" />
              <text x={rightX + NODE.w / 2} y={cy + dy - 2} textAnchor="middle" fontSize="7" fill={textColor}>{label}</text>
              <text x={rightX + NODE.w / 2} y={cy + dy + 9} textAnchor="middle" fontSize="8" fontWeight="600" fill={textColor}>
                {truncate(doc.title, 10)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-[var(--text-3)] text-center mt-1">클릭하면 전체 다이어그램을 확인합니다</p>
    </div>
  );
}
