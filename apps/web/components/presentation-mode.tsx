'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parseMarkdown } from '@markflow/editor';
import { X, Type, PenLine, Eraser, Palette, CircleDot, List } from 'lucide-react';

interface PresentationModeProps {
  open: boolean;
  onClose: () => void;
  content: string;
  title: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

type FontSize = 'default' | 'medium' | 'large' | 'xlarge';

const FONT_SIZES: Record<FontSize, { label: string; size: string }> = {
  default: { label: '기본', size: '16px' },
  medium: { label: '중간', size: '20px' },
  large: { label: '크게', size: '24px' },
  xlarge: { label: '더 크게', size: '30px' },
};

const PEN_COLORS = ['#ff5500', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#000000'];
const CURSOR_SIZES = [4, 8, 14, 20];

export function PresentationMode({ open, onClose, content, title }: PresentationModeProps) {
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

  // Parse HTML and extract TOC
  const html = parseMarkdown(content);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    const headings = contentRef.current.querySelectorAll('h1, h2');
    const items: TocItem[] = [];
    headings.forEach((el, i) => {
      const id = `pres-heading-${i}`;
      el.id = id;
      items.push({
        id,
        text: el.textContent ?? '',
        level: el.tagName === 'H1' ? 1 : 2,
      });
    });
    setToc(items);
  }, [open, html]);

  // Canvas resize
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Drawing handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPenMode) return;
    isDrawingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [isPenMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Show dock on bottom hover
    if (e.clientY > window.innerHeight - 80) {
      setShowDock(true);
      if (dockTimeoutRef.current) clearTimeout(dockTimeoutRef.current);
    } else if (!showColorPicker && !showSizePicker) {
      if (dockTimeoutRef.current) clearTimeout(dockTimeoutRef.current);
      dockTimeoutRef.current = setTimeout(() => setShowDock(false), 1500);
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
  }, [isPenMode, penColor, cursorSize, showColorPicker, showSizePicker]);

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const currentFontSize = FONT_SIZES[fontSize].size;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#fff', display: 'flex', flexDirection: 'column',
        cursor: isPenMode ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }}
      />

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={contentRef}
          className="mf-preview"
          style={{
            width: '90%', maxWidth: '1000px', padding: '60px 0',
            fontSize: currentFontSize, lineHeight: 1.8,
          }}
          dangerouslySetInnerHTML={{ __html: `<h1>${title}</h1>${html}` }}
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
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                display: 'block', padding: '6px 0',
                paddingLeft: item.level === 2 ? 16 : 0,
                fontSize: item.level === 1 ? 14 : 13,
                fontWeight: item.level === 1 ? 600 : 400,
                color: '#333', textDecoration: 'none',
                borderBottom: '1px solid #f0f0f0',
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
        onMouseEnter={() => {
          setShowDock(true);
          if (dockTimeoutRef.current) clearTimeout(dockTimeoutRef.current);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Font size */}
        {(['default', 'medium', 'large', 'xlarge'] as FontSize[]).map((fs) => (
          <button
            key={fs}
            type="button"
            title={FONT_SIZES[fs].label}
            onClick={() => setFontSize(fs)}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: fontSize === fs ? 'rgba(255,255,255,0.25)' : 'transparent',
              color: '#fff', fontSize: fs === 'default' ? 11 : fs === 'medium' ? 13 : fs === 'large' ? 15 : 17,
              fontWeight: 700,
            }}
          >
            <Type size={fs === 'default' ? 14 : fs === 'medium' ? 16 : fs === 'large' ? 18 : 20} />
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        {/* Pen mode */}
        <button
          type="button"
          title="펜 모드"
          onClick={() => { setIsPenMode((v) => !v); setShowColorPicker(false); setShowSizePicker(false); }}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            background: isPenMode ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff',
          }}
        >
          <PenLine size={16} />
        </button>

        {/* Clear drawing */}
        <button
          type="button"
          title="드로잉 지우기"
          onClick={clearDrawing}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', color: '#fff',
          }}
        >
          <Eraser size={16} />
        </button>

        {/* Pen color */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            title="펜 색상"
            onClick={() => { setShowColorPicker((v) => !v); setShowSizePicker(false); }}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: showColorPicker ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff',
            }}
          >
            <Palette size={16} />
          </button>
          {showColorPicker && (
            <div style={{
              position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(30,30,30,0.9)', borderRadius: 10, padding: 8,
              display: 'flex', gap: 6,
            }}>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setPenColor(c); setShowColorPicker(false); }}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', border: penColor === c ? '2px solid #fff' : '2px solid transparent',
                    background: c, cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cursor size */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            title="펜 굵기"
            onClick={() => { setShowSizePicker((v) => !v); setShowColorPicker(false); }}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: showSizePicker ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff',
            }}
          >
            <CircleDot size={16} />
          </button>
          {showSizePicker && (
            <div style={{
              position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(30,30,30,0.9)', borderRadius: 10, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {CURSOR_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setCursorSize(s); setShowSizePicker(false); }}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: cursorSize === s ? '2px solid #fff' : '2px solid transparent',
                    borderRadius: '50%', background: 'transparent', cursor: 'pointer',
                  }}
                >
                  <div style={{ width: s, height: s, borderRadius: '50%', background: '#fff' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        {/* TOC toggle */}
        <button
          type="button"
          title={showToc ? '목차 숨기기' : '목차 보기'}
          onClick={() => setShowToc((v) => !v)}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            background: showToc ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff',
          }}
        >
          <List size={16} />
        </button>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        {/* Close */}
        <button
          type="button"
          title="프리젠테이션 종료"
          onClick={onClose}
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
