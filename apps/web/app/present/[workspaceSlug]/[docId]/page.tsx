'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { parseMarkdown } from '@markflow/editor';
import '@markflow/editor/styles';
import { apiFetch } from '../../../../lib/api';
import { useWorkspaceStore } from '../../../../stores/workspace-store';
import type { DocumentResponse } from '../../../../lib/types';
import { X, Type, PenLine, Eraser, Palette, CircleDot, List } from 'lucide-react';

/* ─── Types ─── */

interface TocItem {
  id: string;
  text: string;
  level: number;
}

type FontSize = 'default' | 'medium' | 'large';

const FONT_SIZES: Record<FontSize, { label: string; size: number; width: number }> = {
  default: { label: '기본', size: 16, width: 900 },
  medium: { label: '중간', size: 20, width: 1100 },
  large: { label: '크게', size: 24, width: 1300 },
};

const PEN_COLORS = ['#ff5500', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#000000'];
const CURSOR_SIZES = [4, 8, 14, 20];

/* ─── Component ─── */

export default function PresentPage() {
  const { workspaceSlug, docId } = useParams<{ workspaceSlug: string; docId: string }>();
  const { workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (workspaces.length === 0) void fetchWorkspaces();
  }, [workspaces.length, fetchWorkspaces]);

  useEffect(() => {
    const found = workspaces.find((ws) => ws.name === decodeURIComponent(workspaceSlug));
    if (found) setCurrentWorkspace(found);
  }, [workspaces, workspaceSlug, setCurrentWorkspace]);

  const wsId = useWorkspaceStore((s) => s.currentWorkspace?.id);

  const documentQuery = useQuery({
    queryKey: ['document', wsId, docId],
    queryFn: async () => {
      const res = await apiFetch<DocumentResponse>(`/workspaces/${wsId}/documents/${docId}`);
      return res.document;
    },
    enabled: !!wsId,
  });

  const doc = documentQuery.data;

  if (!doc) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #1A56DB', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return <PresentationView title={doc.title} content={doc.content} />;
}

/* ─── Presentation View ─── */

function PresentationView({ title, content }: { title: string; content: string }) {
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [isPenMode, setIsPenMode] = useState(false);
  const [penColor, setPenColor] = useState('#ff5500');
  const [cursorSize, setCursorSize] = useState(8);
  const [showToc, setShowToc] = useState(false);
  const [showDock, setShowDock] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const dockTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const rawHtml = parseMarkdown(content);
  const { size: fontPx, width: contentWidth } = FONT_SIZES[fontSize];

  // Inject IDs into headings and extract TOC from HTML string
  const { processedHtml, extractedToc } = (() => {
    let idx = 0;
    const items: TocItem[] = [];
    const result = rawHtml.replace(/<(h[12])([^>]*)>([\s\S]*?)<\/h[12]>/gi, (_match, tag: string, attrs: string, inner: string) => {
      const id = `pres-heading-${idx++}`;
      const text = inner.replace(/<[^>]*>/g, '').trim();
      items.push({ id, text, level: tag.toLowerCase() === 'h1' ? 1 : 2 });
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
    });
    return { processedHtml: result, extractedToc: items };
  })();

  useEffect(() => {
    setToc(extractedToc);
  }, [rawHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ctx = canvas.getContext('2d');
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      temp.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx?.drawImage(temp, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Close dock on content area click (not on dock itself)
    setShowDock(false);
    setShowColorPicker(false);
    setShowSizePicker(false);

    if (!isPenMode) return;
    isDrawingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [isPenMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.clientY > window.innerHeight - 60) {
      setShowDock(true);
      if (dockTimeoutRef.current) clearTimeout(dockTimeoutRef.current);
    }

    if (!isPenMode || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = cursorSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [isPenMode, penColor, cursorSize]);

  const handleMouseUp = useCallback(() => { isDrawingRef.current = false; }, []);

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const closePage = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().then(() => window.close());
    } else {
      window.close();
    }
  }, []);

  // Enter fullscreen on mount
  useEffect(() => {
    const enterFullscreen = () => {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen().catch(() => { /* user denied */ });
      }
    };
    // Small delay so the page renders first
    const timer = setTimeout(enterFullscreen, 100);
    return () => clearTimeout(timer);
  }, []);

  // ESC: exit fullscreen first, then close on second press
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          window.close();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Set page title
  useEffect(() => { document.title = `${title} — 프리젠테이션`; }, [title]);

  /* ─── Dock button helper ─── */
  const DockBtn = ({ tip, active, onClick, children }: { tip: string; active?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      title={tip}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 8, cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff',
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{ minHeight: '100vh', background: '#fff', cursor: isPenMode ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }} />

      {/* Content */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px 120px' }}>
        <div
          ref={contentRef}
          className="mf-preview"
          style={{
            width: '100%', maxWidth: contentWidth, fontSize: fontPx, lineHeight: 1.8,
            transition: 'max-width 0.2s ease, font-size 0.2s ease',
          }}
          dangerouslySetInnerHTML={{ __html: `<h1>${title}</h1>${processedHtml}` }}
        />
      </div>

      {/* TOC panel */}
      {showToc && (
        <div
          style={{
            position: 'fixed', top: 0, right: 0, width: 280, height: '100%',
            background: 'rgba(255,255,255,0.97)', borderLeft: '1px solid #e5e5e5',
            zIndex: 10001, overflow: 'auto', padding: '20px 16px',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            목차
          </div>
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{
                display: 'block', padding: '6px 0', paddingLeft: item.level === 2 ? 16 : 0,
                fontSize: item.level === 1 ? 14 : 13, fontWeight: item.level === 1 ? 600 : 400,
                color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0',
              }}
            >
              {item.text}
            </a>
          ))}
        </div>
      )}

      {/* Bottom dock */}
      <div
        style={{
          position: 'fixed', bottom: showDock ? 20 : -80, left: '50%',
          transform: 'translateX(-50%)', zIndex: 10002,
          background: 'rgba(30,30,30,0.85)', backdropFilter: 'blur(10px)',
          borderRadius: 14, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'bottom 0.25s ease',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => { setShowDock(true); if (dockTimeoutRef.current) clearTimeout(dockTimeoutRef.current); }}
      >
        {/* Font sizes (3 steps) */}
        {(['default', 'medium', 'large'] as FontSize[]).map((fs) => (
          <DockBtn key={fs} tip={FONT_SIZES[fs].label} active={fontSize === fs} onClick={() => setFontSize(fs)}>
            <Type size={fs === 'default' ? 14 : fs === 'medium' ? 17 : 20} />
          </DockBtn>
        ))}

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        <DockBtn tip="펜 모드" active={isPenMode} onClick={() => { setIsPenMode((v) => !v); setShowColorPicker(false); setShowSizePicker(false); }}>
          <PenLine size={16} />
        </DockBtn>

        <DockBtn tip="드로잉 지우기" onClick={clearDrawing}>
          <Eraser size={16} />
        </DockBtn>

        {/* Pen color */}
        <div style={{ position: 'relative' }}>
          <DockBtn tip="펜 색상" active={showColorPicker} onClick={() => { setShowColorPicker((v) => !v); setShowSizePicker(false); }}>
            <Palette size={16} />
          </DockBtn>
          {showColorPicker && (
            <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', background: 'rgba(30,30,30,0.9)', borderRadius: 10, padding: 8, display: 'flex', gap: 6 }}>
              {PEN_COLORS.map((c) => (
                <button key={c} type="button" title={c} onClick={() => { setPenColor(c); setShowColorPicker(false); }}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: penColor === c ? '2px solid #fff' : '2px solid transparent', background: c, cursor: 'pointer' }} />
              ))}
            </div>
          )}
        </div>

        {/* Pen size */}
        <div style={{ position: 'relative' }}>
          <DockBtn tip="펜 굵기" active={showSizePicker} onClick={() => { setShowSizePicker((v) => !v); setShowColorPicker(false); }}>
            <CircleDot size={16} />
          </DockBtn>
          {showSizePicker && (
            <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', background: 'rgba(30,30,30,0.9)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {CURSOR_SIZES.map((s) => (
                <button key={s} type="button" title={`${s}px`} onClick={() => { setCursorSize(s); setShowSizePicker(false); }}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: cursorSize === s ? '2px solid #fff' : '2px solid transparent', borderRadius: '50%', background: 'transparent', cursor: 'pointer' }}>
                  <div style={{ width: s, height: s, borderRadius: '50%', background: '#fff' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        <DockBtn tip={showToc ? '목차 숨기기' : '목차 보기'} active={showToc} onClick={() => setShowToc((v) => !v)}>
          <List size={16} />
        </DockBtn>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        <button
          type="button"
          title="닫기"
          onClick={closePage}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(220,38,38,0.8)', color: '#fff',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
