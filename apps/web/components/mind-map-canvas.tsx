'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/* ─── Public Types ─── */

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
  dark?: boolean;
}

/* ─── Branch Config (theme-aware) ─── */

const BRANCH_CONFIGS = {
  light: {
    cat:     { label: '상위 카테고리', icon: '⬡', color: '#6d28d9', angle: -90 },
    prev:    { label: '이전 문서',     icon: '◀', color: '#0369a1', angle: -150 },
    next:    { label: '다음 문서',     icon: '▶', color: '#c2410c', angle: -30 },
    related: { label: '연관 문서',     icon: '↔', color: '#be185d', angle: 40 },
    tag:     { label: '태그 연결',     icon: '#', color: '#0e7490', angle: 150 },
  },
  dark: {
    cat:     { label: '상위 카테고리', icon: '⬡', color: '#a78bfa', angle: -90 },
    prev:    { label: '이전 문서',     icon: '◀', color: '#00d4ff', angle: -150 },
    next:    { label: '다음 문서',     icon: '▶', color: '#ffd700', angle: -30 },
    related: { label: '연관 문서',     icon: '↔', color: '#ff69b4', angle: 40 },
    tag:     { label: '태그 연결',     icon: '#', color: '#7dd3fc', angle: 150 },
  },
} as const;

type BranchKey = 'cat' | 'prev' | 'next' | 'related' | 'tag';
type BranchMeta = { label: string; icon: string; color: string; angle: number };

const L1 = 155, L2 = 125, VSPACE = 50;

/* ─── Helpers ─── */

function rgba(hex: string, a: number): string {
  if (hex.startsWith('rgba')) return hex.replace(/[\d.]+\)$/, a + ')');
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
function trunc(s: string, n: number): string { return s.length > n ? s.slice(0, n) + '\u2026' : s; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/* ─── Internal Types ─── */

interface BranchNode {
  id: number | string;
  label: string;
  docId: number | null;
  tx: number;
  ty: number;
}

interface Branch {
  key: BranchKey;
  meta: BranchMeta;
  hx: number;
  hy: number;
  nodes: BranchNode[];
}

interface ClickTarget {
  x: number; y: number; w: number; h: number; docId: number | null;
}

interface Particle {
  branch: BranchKey;
  progress: number;
  speed: number;
  fromHub: boolean;
}

/* ─── Layout ─── */

function computeBranches(
  docId: number,
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  categories: CategoryInfo[],
  tagLinks: { fromId: number; toId: number }[],
  branchMeta: Record<BranchKey, BranchMeta>,
): Branch[] {
  const doc = nodes.find(n => n.id === docId);
  if (!doc) return [];

  const raw: { key: BranchKey; nodes: Omit<BranchNode, 'tx' | 'ty'>[] }[] = [];

  // Category
  const cat = categories.find(c => c.id === doc.categoryId);
  if (cat) raw.push({ key: 'cat', nodes: [{ id: `c_${cat.id}`, label: cat.name, docId: null }] });

  // Prev
  const prevs = edges.filter(e => e.source === docId && e.type === 'prev').map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as MindMapNode[];
  if (prevs.length) raw.push({ key: 'prev', nodes: prevs.map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  // Next
  const nexts = edges.filter(e => e.source === docId && e.type === 'next').map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as MindMapNode[];
  if (nexts.length) raw.push({ key: 'next', nodes: nexts.map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  // Related (bidirectional)
  const rels = edges.filter(e => (e.source === docId || e.target === docId) && e.type === 'related')
    .map(e => { const tid = e.source === docId ? e.target : e.source; return nodes.find(n => n.id === tid); })
    .filter(Boolean) as MindMapNode[];
  const uniqueRels = [...new Map(rels.map(d => [d.id, d])).values()];
  if (uniqueRels.length) raw.push({ key: 'related', nodes: uniqueRels.map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  // Tag links
  const skip = new Set([docId, ...prevs.map(d => d.id), ...nexts.map(d => d.id), ...uniqueRels.map(d => d.id)]);
  const tagDocIds = tagLinks.filter(l => l.fromId === docId && !skip.has(l.toId)).map(l => l.toId);
  const tagDocs = tagDocIds.map(id => nodes.find(n => n.id === id)).filter(Boolean) as MindMapNode[];
  if (tagDocs.length) raw.push({ key: 'tag', nodes: tagDocs.slice(0, 7).map(d => ({ id: d.id, label: d.title, docId: d.id })) });

  return raw.map(b => ({
    key: b.key,
    meta: branchMeta[b.key],
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

function deepClone(b: Branch): Branch {
  return { ...b, nodes: b.nodes.map(n => ({ ...n })), meta: { ...b.meta } };
}

/* ─── Drawing (theme-aware — matching HTML prototype) ─── */

function drawBezierLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, lw: number, alpha: number, dk: boolean) {
  ctx.save();
  const grd = ctx.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0, rgba(dk ? '#ffffff' : col, 0.04));
  grd.addColorStop(0.4, rgba(col, alpha * 0.5));
  grd.addColorStop(1, rgba(col, alpha));
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2, x2, y2);
  ctx.strokeStyle = grd; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

function drawConnection(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, e: number, dk: boolean) {
  const alpha = e * (dk ? 0.55 : 0.45);
  const cp1x = x1 + (x2 - x1) * 0.35, cp1y = y1 + (y2 - y1) * 0.1;
  const cp2x = x1 + (x2 - x1) * 0.65, cp2y = y1 + (y2 - y1) * 0.9;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  const grd = ctx.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0, rgba(col, 0.04));
  grd.addColorStop(0.5, rgba(col, alpha * 0.65));
  grd.addColorStop(1, rgba(col, alpha));
  ctx.strokeStyle = grd; ctx.lineWidth = dk ? 1.2 : 1.5; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

function drawHub(ctx: CanvasRenderingContext2D, b: Branch, e: number, dk: boolean) {
  const { hx: x, hy: y, meta } = b;
  const col = meta.color;
  const scale = 0.5 + e * 0.5;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);

  if (dk) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    g.addColorStop(0, rgba(col, 0.22)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  } else {
    ctx.shadowColor = rgba(col, 0.25); ctx.shadowBlur = 16;
  }

  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fillStyle = dk ? rgba(col, 0.12) : '#ffffff'; ctx.fill();
  ctx.strokeStyle = rgba(col, dk ? 0.75 : 0.9); ctx.lineWidth = dk ? 1.5 : 2; ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = col; ctx.font = "bold 12px 'Sora', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(meta.icon, 0, 0);
  ctx.restore();

  const ld = meta.angle < 0 ? -36 : 36;
  ctx.fillStyle = rgba(col, dk ? 0.65 : 0.8); ctx.font = "600 10px 'Sora', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(meta.label, x, y + ld * e);
}

function drawLeaf(ctx: CanvasRenderingContext2D, b: Branch, node: BranchNode, e: number, isHov: boolean, dk: boolean, targets: ClickTarget[]) {
  const { tx: x, ty: y } = node;
  const col = b.meta.color;
  const label = trunc(node.label, 16);
  ctx.font = "500 12px -apple-system, 'Pretendard', sans-serif";
  const tw = ctx.measureText(label).width;
  const w = tw + 34, h = 32, r = 10;
  const lx = x - w / 2, ly = y - h / 2;
  ctx.save(); ctx.globalAlpha = e;
  if (isHov) { ctx.shadowColor = rgba(col, dk ? 0.35 : 0.25); ctx.shadowBlur = dk ? 14 : 12; }

  roundRect(ctx, lx, ly, w, h, r);
  if (dk) ctx.fillStyle = rgba(col, isHov ? 0.20 : 0.10);
  else ctx.fillStyle = isHov ? rgba(col, 0.10) : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = rgba(col, isHov ? (dk ? 0.90 : 1.0) : (dk ? 0.45 : 0.65));
  ctx.lineWidth = isHov ? (dk ? 1.5 : 2) : (dk ? 1 : 1.5); ctx.stroke();
  ctx.shadowBlur = 0;

  roundRect(ctx, lx, ly + 6, 3, h - 12, 1.5); ctx.fillStyle = rgba(col, dk ? 0.9 : 0.85); ctx.fill();

  ctx.fillStyle = dk
    ? (isHov ? 'rgba(255,255,255,.95)' : 'rgba(210,220,235,.85)')
    : (isHov ? '#0f172a' : '#334155');
  ctx.font = "500 12px -apple-system, 'Pretendard', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 2, y);
  ctx.restore();
  targets.push({ x: lx, y: ly, w, h, docId: node.docId });
}

function drawCenter(ctx: CanvasRenderingContext2D, doc: MindMapNode, cat: CategoryInfo | undefined, cx: number, cy: number, dk: boolean) {
  const col = cat?.color ?? '#6d28d9';
  const pt = Date.now() / 1000;
  const pulse = 1 + Math.sin(pt * 1.8) * 0.04;
  const R = 46;

  // Outer rings
  for (let i = 3; i >= 1; i--) {
    const rr = R + i * 13 + Math.sin(pt + i * 0.7) * 2;
    ctx.beginPath(); ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, dk ? 0.06 / i : 0.04 / i); ctx.lineWidth = 1; ctx.stroke();
  }

  // Glow
  if (dk) {
    const g = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, R * 1.6);
    g.addColorStop(0, rgba(col, 0.32)); g.addColorStop(0.6, rgba(col, 0.10)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R * pulse * 1.6, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  } else {
    ctx.save(); ctx.shadowColor = rgba(col, 0.28); ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(cx, cy, R * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fill(); ctx.restore();
  }

  // Main circle
  ctx.beginPath(); ctx.arc(cx, cy, R * pulse, 0, Math.PI * 2);
  if (dk) {
    const cg = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, R * pulse);
    cg.addColorStop(0, rgba(col, 0.30)); cg.addColorStop(1, rgba(col, 0.08));
    ctx.fillStyle = cg;
  } else ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = dk ? 2 : 2.5; ctx.stroke();

  // Crosshair
  ctx.strokeStyle = rgba(col, dk ? 0.25 : 0.30); ctx.lineWidth = 1;
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (R + 4), cy + Math.sin(ang) * (R + 4));
    ctx.lineTo(cx + Math.cos(ang) * (R + 12), cy + Math.sin(ang) * (R + 12)); ctx.stroke();
  }

  // Inner dot
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();

  // Title
  const words = doc.title.split(' ');
  const lines: string[] = []; let cur = '';
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (t.length > 10 && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  const lh = 15;
  ctx.font = "600 12px 'Sora', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const yy = cy + (i - (lines.length - 1) / 2) * lh;
    if (dk) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(l, cx + 1, yy + 1); }
    else { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(l, cx + 1, yy + 1); }
    ctx.fillStyle = dk ? 'rgba(255,255,255,.95)' : '#0f172a'; ctx.fillText(l, cx, yy);
  });

  if (cat) {
    ctx.font = "10px 'Sora', sans-serif"; ctx.fillStyle = rgba(col, dk ? 0.85 : 0.95);
    ctx.fillText(cat.name, cx, cy + R * pulse + 15);
  }
}

/* ─── Particle helpers ─── */

function bzPt(t: number, x1: number, y1: number, ax: number, ay: number, bx: number, by: number, x2: number, y2: number) {
  const m = 1 - t;
  return { x: m * m * m * x1 + 3 * m * m * t * ax + 3 * m * t * t * bx + t * t * t * x2,
           y: m * m * m * y1 + 3 * m * m * t * ay + 3 * m * t * t * by + t * t * t * y2 };
}

function spawnParticles(branches: Branch[]): Particle[] {
  const ps: Particle[] = [];
  for (const b of branches) {
    if (!['next', 'prev', 'related'].includes(b.key)) continue;
    for (let ni = 0; ni < b.nodes.length; ni++) {
      for (let i = 0; i < 2; i++) {
        ps.push({ branch: b.key, progress: Math.random(), speed: 0.006 + Math.random() * 0.004, fromHub: b.key === 'prev' });
      }
    }
  }
  return ps;
}

/* ─── Component ─── */

export function MindMapCanvas({ nodes, edges, categories, selectedDocId, onSelectDoc, tagLinks = [], dark = false }: MindMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    offX: 0, offY: 0,
    branches: [] as Branch[],
    fromBranches: null as Branch[] | null,
    animT: 1,
    particles: [] as Particle[],
    clickTargets: [] as ClickTarget[],
    hoverId: null as number | null,
    dragging: false, dragStartX: 0, dragStartY: 0, dragStartOffX: 0, dragStartOffY: 0, didDrag: false,
    lastTime: 0,
    selectedDocId,
    dark,
  });
  const [, forceUpdate] = useState(0);

  // Build category map
  const catMap = useRef(new Map<number, CategoryInfo>());
  useEffect(() => {
    const m = new Map<number, CategoryInfo>();
    categories.forEach(c => m.set(c.id, c));
    catMap.current = m;
  }, [categories]);

  // Theme-aware branch meta
  const branchMeta = dark ? BRANCH_CONFIGS.dark : BRANCH_CONFIGS.light;

  const getCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 400, cy: 300 };
    const s = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    return { cx: W / 2 + s.offX, cy: H / 2 + s.offY + 26 };
  }, []);

  const rebuild = useCallback(() => {
    const s = stateRef.current;
    const { cx, cy } = getCenter();
    // Snapshot current for interpolation
    s.fromBranches = s.animT < 1
      ? interpolate(s.branches, s.fromBranches, easeOut(s.animT))
      : s.branches.map(deepClone);
    s.branches = computeBranches(s.selectedDocId, nodes, edges, Array.from(catMap.current.values()), tagLinks, branchMeta);
    positionBranches(s.branches, cx, cy);
    s.animT = 0;
    s.particles = spawnParticles(s.branches);
  }, [nodes, edges, tagLinks, branchMeta, getCenter]);

  // Update on selection change
  useEffect(() => {
    stateRef.current.selectedDocId = selectedDocId;
    rebuild();
    forceUpdate(n => n + 1);
  }, [selectedDocId, rebuild]);

  // Update dark mode
  useEffect(() => { stateRef.current.dark = dark; }, [dark]);

  // Canvas setup + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let rafId: number;

    function resize() {
      if (!canvas || !ctx) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    }
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas.parentElement!);

    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      if (!ctx || !canvas) return;
      const s = stateRef.current;
      const dk = s.dark;
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
      if (dk) {
        ctx.fillStyle = '#05080e';
      } else {
        const bg = ctx.createRadialGradient(W * 0.4, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
        bg.addColorStop(0, '#eef1f9'); bg.addColorStop(1, '#e4e9f5');
        ctx.fillStyle = bg;
      }
      ctx.fillRect(0, 0, W, H);

      // Grid
      const gs = 50;
      ctx.strokeStyle = dk ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,80,0.04)';
      ctx.lineWidth = 0.5;
      for (let x = (s.offX % gs + gs) % gs; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (s.offY % gs + gs) % gs; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      s.clickTargets = [];

      // Draw branches with interpolation
      for (const b of s.branches) {
        const fB = s.fromBranches?.find(x => x.key === b.key);
        const chx = fB ? lerp(fB.hx, b.hx, e) : b.hx;
        const chy = fB ? lerp(fB.hy, b.hy, e) : b.hy;
        const col = b.meta.color;

        // Center → Hub
        drawBezierLine(ctx, cx, cy, chx, chy, col, dk ? 1.8 : 2, (dk ? 0.40 : 0.32) * e, dk);

        // Hub → Leaf
        b.nodes.forEach((n, i) => {
          const fn = fB?.nodes[i];
          const nx = fn ? lerp(fn.tx, n.tx, e) : n.tx;
          const ny = fn ? lerp(fn.ty, n.ty, e) : n.ty;
          drawConnection(ctx, chx, chy, nx, ny, col, e, dk);
        });

        // Hub
        drawHub(ctx, { ...b, hx: chx, hy: chy }, e, dk);

        // Leaves
        b.nodes.forEach((n, i) => {
          const fn = fB?.nodes[i];
          const nx = fn ? lerp(fn.tx, n.tx, e) : n.tx;
          const ny = fn ? lerp(fn.ty, n.ty, e) : n.ty;
          drawLeaf(ctx, b, { ...n, tx: nx, ty: ny }, e, s.hoverId === n.docId && n.docId !== null, dk, s.clickTargets);
        });
      }

      // Particles (after transition)
      if (e > 0.75) {
        const pe = (e - 0.75) / 0.25;
        for (const p of s.particles) {
          p.progress += p.speed;
          if (p.progress >= 1) p.progress = 0;
          const br = s.branches.find(b => b.key === p.branch);
          if (!br || !br.nodes.length) continue;
          const fB = s.fromBranches?.find(x => x.key === br.key);
          const hx = fB ? lerp(fB.hx, br.hx, e) : br.hx;
          const hy = fB ? lerp(fB.hy, br.hy, e) : br.hy;
          const n = br.nodes[0]!;
          const fN = fB?.nodes[0];
          const nx = fN ? lerp(fN.tx, n.tx, e) : n.tx;
          const ny = fN ? lerp(fN.ty, n.ty, e) : n.ty;
          const t = p.fromHub ? 1 - p.progress : p.progress;
          let pt: { x: number; y: number };
          if (p.progress < 0.5) {
            pt = bzPt(t * 2, cx, cy, (cx + hx) / 2, (cy + hy) / 2, (cx + hx) / 2, (cy + hy) / 2, hx, hy);
          } else {
            pt = bzPt((t - 0.5) * 2, hx, hy, (hx + nx) / 2, (hy + ny) / 2, (hx + nx) / 2, (hy + ny) / 2, nx, ny);
          }
          const alpha = pe * Math.sin(p.progress * Math.PI) * (dk ? 0.85 : 0.7);
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = rgba(br.meta.color, alpha); ctx.fill();
        }
      }

      // Center node (top layer)
      const doc = nodes.find(n => n.id === s.selectedDocId);
      if (doc) {
        const cat = catMap.current.get(doc.categoryId ?? -1);
        drawCenter(ctx, doc, cat, cx, cy, dk);
      }
    }

    rafId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafId); obs.disconnect(); };
  }, [nodes, rebuild]);

  /* ─── Interaction ─── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    s.dragging = true; s.didDrag = false;
    s.dragStartX = e.clientX; s.dragStartY = e.clientY;
    s.dragStartOffX = s.offX; s.dragStartOffY = s.offY;
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

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: number | null = null;
    for (const t of s.clickTargets) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h && t.docId !== null) { found = t.docId; break; }
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
    if (s.didDrag) return;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const t of s.clickTargets) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h && t.docId !== null) {
        s.offX = 0; s.offY = 0;
        onSelectDoc(t.docId);
        return;
      }
    }
  }, [onSelectDoc]);

  const handleDblClick = useCallback(() => {
    stateRef.current.offX = 0; stateRef.current.offY = 0;
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

/* ─── Interpolation helper ─── */
function interpolate(branches: Branch[], fromBranches: Branch[] | null, e: number): Branch[] {
  return branches.map(b => {
    const fb = fromBranches?.find(x => x.key === b.key);
    return {
      ...b,
      hx: fb ? lerp(fb.hx, b.hx, e) : b.hx,
      hy: fb ? lerp(fb.hy, b.hy, e) : b.hy,
      nodes: b.nodes.map((n, i) => {
        const fn = fb?.nodes[i];
        return { ...n, tx: fn ? lerp(fn.tx, n.tx, e) : n.tx, ty: fn ? lerp(fn.ty, n.ty, e) : n.ty };
      }),
    };
  });
}

export type { MindMapNode, MindMapEdge, CategoryInfo };
