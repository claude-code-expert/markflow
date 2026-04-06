'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/* ─── Types ─── */

interface MindMapNode {
  id: number;
  title: string;
  categoryId: number | null;
}

interface MindMapEdge {
  source: number;
  target: number;
  type: 'prev' | 'next' | 'related';
}

interface CategoryInfo {
  id: number;
  name: string;
  color: string;
}

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  categories: CategoryInfo[];
  selectedDocId: number;
  onSelectDoc: (docId: number) => void;
  tagLinks?: { fromId: number; toId: number }[];
}

/* ─── Branch Config ─── */

const BRANCH_COLORS = {
  cat:     '#6d28d9',
  prev:    '#0369a1',
  next:    '#c2410c',
  related: '#be185d',
  tag:     '#0e7490',
};

const BRANCH_META: Record<string, { label: string; icon: string; angle: number; color: string }> = {
  cat:     { label: '상위 카테고리', icon: '⬡', angle: -90,  color: BRANCH_COLORS.cat },
  prev:    { label: '이전 문서',     icon: '◀', angle: -150, color: BRANCH_COLORS.prev },
  next:    { label: '다음 문서',     icon: '▶', angle: -30,  color: BRANCH_COLORS.next },
  related: { label: '연관 문서',     icon: '↔', angle: 40,   color: BRANCH_COLORS.related },
  tag:     { label: '태그 연결',     icon: '#', angle: 150,  color: BRANCH_COLORS.tag },
};

const L1 = 155, L2 = 125, VSPACE = 50;

/* ─── Helpers ─── */

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
function trunc(s: string, n: number): string { return s.length > n ? s.slice(0, n) + '…' : s; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/* ─── Layout ─── */

interface BranchNode {
  id: number | string;
  label: string;
  docId: number | null;
  tx: number;
  ty: number;
}

interface Branch {
  key: string;
  meta: typeof BRANCH_META['cat'];
  hx: number;
  hy: number;
  nodes: BranchNode[];
}

interface ClickTarget {
  x: number; y: number; w: number; h: number; docId: number | null;
}

function computeBranches(
  docId: number,
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  categories: CategoryInfo[],
  tagLinks: { fromId: number; toId: number }[],
): Branch[] {
  const doc = nodes.find(n => n.id === docId);
  if (!doc) return [];

  const branches: { key: string; nodes: Omit<BranchNode, 'tx' | 'ty'>[] }[] = [];

  // Category
  const cat = categories.find(c => c.id === doc.categoryId);
  if (cat) {
    branches.push({ key: 'cat', nodes: [{ id: `c_${cat.id}`, label: cat.name, docId: null }] });
  }

  // Prev
  const prevs = edges.filter(e => e.source === docId && e.type === 'prev').map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as MindMapNode[];
  if (prevs.length) branches.push({ key: 'prev', nodes: prevs.map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  // Next
  const nexts = edges.filter(e => e.source === docId && e.type === 'next').map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as MindMapNode[];
  if (nexts.length) branches.push({ key: 'next', nodes: nexts.map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  // Related
  const rels = edges.filter(e => (e.source === docId || e.target === docId) && e.type === 'related')
    .map(e => { const tid = e.source === docId ? e.target : e.source; return nodes.find(n => n.id === tid); })
    .filter(Boolean) as MindMapNode[];
  if (rels.length) branches.push({ key: 'related', nodes: rels.map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  // Tag links
  const skip = new Set([docId, ...prevs.map(d => d.id), ...nexts.map(d => d.id), ...rels.map(d => d.id)]);
  const tagDocIds = tagLinks.filter(l => l.fromId === docId && !skip.has(l.toId)).map(l => l.toId);
  const tagDocs = tagDocIds.map(id => nodes.find(n => n.id === id)).filter(Boolean) as MindMapNode[];
  if (tagDocs.length) branches.push({ key: 'tag', nodes: tagDocs.slice(0, 7).map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  return branches
    .filter(b => BRANCH_META[b.key] !== undefined)
    .map(b => ({
      ...b,
      meta: BRANCH_META[b.key]!,
      hx: 0, hy: 0,
      nodes: b.nodes.map(n => ({ ...n, tx: 0, ty: 0 })),
    }));
}

function positionBranches(brs: Branch[], cx: number, cy: number) {
  for (const b of brs) {
    const rad = b.meta.angle * Math.PI / 180;
    b.hx = cx + Math.cos(rad) * L1;
    b.hy = cy + Math.sin(rad) * L1;
    const perpRad = rad + Math.PI / 2;
    const count = b.nodes.length;
    b.nodes.forEach((n, i) => {
      const off = (i - (count - 1) / 2) * VSPACE;
      n.tx = b.hx + Math.cos(rad) * L2 + Math.cos(perpRad) * off;
      n.ty = b.hy + Math.sin(rad) * L2 + Math.sin(perpRad) * off;
    });
  }
}

/* ─── Drawing ─── */

function drawBezierLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, lw: number, alpha: number) {
  ctx.save();
  const grd = ctx.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0, rgba(col, 0.04));
  grd.addColorStop(0.4, rgba(col, alpha * 0.5));
  grd.addColorStop(1, rgba(col, alpha));
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2, x2, y2);
  ctx.strokeStyle = grd; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

function drawConnection(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, e: number) {
  const alpha = e * 0.45;
  const cp1x = x1 + (x2 - x1) * 0.35, cp1y = y1 + (y2 - y1) * 0.1;
  const cp2x = x1 + (x2 - x1) * 0.65, cp2y = y1 + (y2 - y1) * 0.9;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  const grd = ctx.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0, rgba(col, 0.04));
  grd.addColorStop(0.5, rgba(col, alpha * 0.65));
  grd.addColorStop(1, rgba(col, alpha));
  ctx.strokeStyle = grd; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

function drawHub(ctx: CanvasRenderingContext2D, b: Branch, e: number) {
  const { hx: x, hy: y, meta } = b;
  const col = meta.color;
  const scale = 0.5 + e * 0.5;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.shadowColor = rgba(col, 0.25); ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = col; ctx.font = "bold 12px 'Sora', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(meta.icon, 0, 0);
  ctx.restore();
  const ld = meta.angle < 0 ? -36 : 36;
  ctx.fillStyle = rgba(col, 0.8); ctx.font = "600 10px 'Sora', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(meta.label, x, y + ld * e);
}

function drawLeaf(ctx: CanvasRenderingContext2D, b: Branch, node: BranchNode, e: number, isHov: boolean, targets: ClickTarget[]) {
  const { tx: x, ty: y } = node;
  const col = b.meta.color;
  const label = trunc(node.label, 16);
  ctx.font = "500 12px -apple-system, 'Pretendard', sans-serif";
  const tw = ctx.measureText(label).width;
  const w = tw + 34, h = 32, r = 10;
  const lx = x - w / 2, ly = y - h / 2;
  ctx.save(); ctx.globalAlpha = e;
  if (isHov) { ctx.shadowColor = rgba(col, 0.25); ctx.shadowBlur = 12; }
  roundRect(ctx, lx, ly, w, h, r);
  ctx.fillStyle = isHov ? rgba(col, 0.10) : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = rgba(col, isHov ? 1.0 : 0.65);
  ctx.lineWidth = isHov ? 2 : 1.5; ctx.stroke();
  ctx.shadowBlur = 0;
  roundRect(ctx, lx, ly + 6, 3, h - 12, 1.5); ctx.fillStyle = rgba(col, 0.85); ctx.fill();
  ctx.fillStyle = isHov ? '#0f172a' : '#334155';
  ctx.font = "500 12px -apple-system, 'Pretendard', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 2, y);
  ctx.restore();
  targets.push({ x: lx, y: ly, w, h, docId: node.docId });
}

function drawCenter(ctx: CanvasRenderingContext2D, doc: MindMapNode, cat: CategoryInfo | undefined, cx: number, cy: number) {
  const col = cat?.color ?? '#6d28d9';
  const pt = Date.now() / 1000;
  const pulse = 1 + Math.sin(pt * 1.8) * 0.04;
  const R = 46;

  for (let i = 3; i >= 1; i--) {
    const rr = R + i * 13 + Math.sin(pt + i * 0.7) * 2;
    ctx.beginPath(); ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, 0.04 / i); ctx.lineWidth = 1; ctx.stroke();
  }

  ctx.save(); ctx.shadowColor = rgba(col, 0.28); ctx.shadowBlur = 28;
  ctx.beginPath(); ctx.arc(cx, cy, R * pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fill(); ctx.restore();

  ctx.beginPath(); ctx.arc(cx, cy, R * pulse, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();

  ctx.strokeStyle = rgba(col, 0.30); ctx.lineWidth = 1;
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (R + 4), cy + Math.sin(ang) * (R + 4));
    ctx.lineTo(cx + Math.cos(ang) * (R + 12), cy + Math.sin(ang) * (R + 12)); ctx.stroke();
  }

  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();

  const words = doc.title.split(' ');
  const lines: string[] = []; let cur = '';
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (t.length > 10 && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  const lh = 15;
  ctx.font = "600 12px 'Sora', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const yy = cy + (i - (lines.length - 1) / 2) * lh;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(l, cx + 1, yy + 1);
    ctx.fillStyle = '#0f172a'; ctx.fillText(l, cx, yy);
  });

  if (cat) {
    ctx.font = "10px 'Sora', sans-serif"; ctx.fillStyle = rgba(col, 0.95);
    ctx.fillText(cat.name, cx, cy + R * pulse + 15);
  }
}

/* ─── Component ─── */

const CAT_PALETTE = ['#e05252', '#d97706', '#0891b2', '#0284c7', '#7c3aed', '#ca8a04', '#16a34a', '#be185d', '#0369a1', '#9333ea'];

export function MindMapCanvas({ nodes, edges, categories, selectedDocId, onSelectDoc, tagLinks = [] }: MindMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    offX: 0, offY: 0,
    branches: [] as Branch[],
    animT: 1,
    clickTargets: [] as ClickTarget[],
    hoverId: null as number | null,
    // Drag state
    dragging: false,
    dragStartX: 0, dragStartY: 0,     // screen coords at mousedown
    dragStartOffX: 0, dragStartOffY: 0, // offX/offY at mousedown
    didDrag: false,                     // moved more than threshold
    lastTime: 0,
    selectedDocId,
  });
  const [, forceUpdate] = useState(0);

  // Assign colors to categories
  const catMap = useRef(new Map<number, CategoryInfo>());
  useEffect(() => {
    const m = new Map<number, CategoryInfo>();
    categories.forEach((c, i) => {
      m.set(c.id, { ...c, color: c.color || CAT_PALETTE[i % CAT_PALETTE.length] || '#6d28d9' });
    });
    catMap.current = m;
  }, [categories]);

  const rebuild = useCallback(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    const cx = W / 2 + s.offX;
    const cy = H / 2 + s.offY + 26;

    const catsWithColors = Array.from(catMap.current.values());
    s.branches = computeBranches(s.selectedDocId, nodes, edges, catsWithColors, tagLinks);
    positionBranches(s.branches, cx, cy);
    s.animT = 0;
  }, [nodes, edges, tagLinks]);

  // Rebuild when selected doc changes
  useEffect(() => {
    stateRef.current.selectedDocId = selectedDocId;
    rebuild();
    forceUpdate(n => n + 1);
  }, [selectedDocId, rebuild]);

  // Canvas setup + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let rafId: number;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    }

    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas.parentElement!);

    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      if (!ctx || !canvas) return;
      const s = stateRef.current;
      const dt = Math.min((ts - s.lastTime) / 1000, 0.05);
      s.lastTime = ts;
      if (s.animT < 1) s.animT = Math.min(1, s.animT + dt / 0.52);
      const e = easeOut(s.animT);

      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      const cx = W / 2 + s.offX;
      const cy = H / 2 + s.offY + 26;

      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createRadialGradient(W * 0.4, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      bg.addColorStop(0, '#F8F7F4'); bg.addColorStop(1, '#F1F0EC');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Grid
      const gs = 50;
      ctx.strokeStyle = 'rgba(0,0,80,0.035)'; ctx.lineWidth = 0.5;
      for (let x = (s.offX % gs + gs) % gs; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (s.offY % gs + gs) % gs; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      s.clickTargets = [];

      // Draw branches
      for (const b of s.branches) {
        const col = b.meta.color;
        drawBezierLine(ctx, cx, cy, b.hx, b.hy, col, 2, 0.32 * e);
        for (const n of b.nodes) {
          drawConnection(ctx, b.hx, b.hy, n.tx, n.ty, col, e);
        }
        drawHub(ctx, b, e);
        for (const n of b.nodes) {
          drawLeaf(ctx, b, n, e, s.hoverId === n.docId && n.docId !== null, s.clickTargets);
        }
      }

      // Center node
      const doc = nodes.find(n => n.id === s.selectedDocId);
      if (doc) {
        const cat: CategoryInfo | undefined = catMap.current.get(doc.categoryId ?? -1);
        drawCenter(ctx, doc, cat, cx, cy);
      }
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
    };
  }, [nodes, rebuild]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    s.dragging = true;
    s.didDrag = false;
    s.dragStartX = e.clientX;
    s.dragStartY = e.clientY;
    s.dragStartOffX = s.offX;
    s.dragStartOffY = s.offY;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (s.dragging) {
      const dx = e.clientX - s.dragStartX;
      const dy = e.clientY - s.dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.didDrag = true;
      s.offX = s.dragStartOffX + dx;
      s.offY = s.dragStartOffY + dy;
      rebuild();
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Hover detection
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: number | null = null;
    for (const t of s.clickTargets) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h && t.docId !== null) {
        found = t.docId;
        break;
      }
    }
    s.hoverId = found;
    canvas.style.cursor = found !== null ? 'pointer' : 'grab';
  }, [rebuild]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    if (!s.dragging) return;
    s.dragging = false;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'grab';

    // Only treat as click if we didn't drag
    if (s.didDrag) return;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const t of s.clickTargets) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h && t.docId !== null) {
        // Reset offset so new center is in the middle
        s.offX = 0;
        s.offY = 0;
        onSelectDoc(t.docId);
        return;
      }
    }
  }, [onSelectDoc]);

  const handleDblClick = useCallback(() => {
    stateRef.current.offX = 0;
    stateRef.current.offY = 0;
    rebuild();
  }, [rebuild]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { stateRef.current.dragging = false; stateRef.current.hoverId = null; }}
        onDoubleClick={handleDblClick}
      />
    </div>
  );
}

export type { MindMapNode, MindMapEdge, CategoryInfo };
