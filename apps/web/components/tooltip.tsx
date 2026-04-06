'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface TooltipProps {
  label: string;
  shortcut?: string;
  position?: 'top' | 'bottom';
  delay?: number;
  children: React.ReactElement<Record<string, unknown>>;
}

export function Tooltip({ label, shortcut, position = 'bottom', delay = 400, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: position === 'top' ? rect.top : rect.bottom,
      });
      setVisible(true);
    }, delay);
  }, [delay, position]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: coords.x,
            top: position === 'top' ? coords.y - 6 : coords.y + 6,
            transform: position === 'top'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div style={bubbleStyle}>
            <span>{label}</span>
            {shortcut && <kbd style={kbdStyle}>{shortcut}</kbd>}
          </div>
          <div
            style={{
              ...arrowStyle,
              ...(position === 'top'
                ? { bottom: '-4px', borderTop: '4px solid var(--text, #1e293b)' }
                : { top: '-4px', borderBottom: '4px solid var(--text, #1e293b)' }),
            }}
          />
        </div>
      )}
    </div>
  );
}

const bubbleStyle: React.CSSProperties = {
  background: 'var(--text, #1e293b)',
  color: '#fff',
  fontSize: '11.5px',
  fontWeight: 500,
  lineHeight: 1,
  padding: '6px 10px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

const kbdStyle: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: 'var(--font-mono, monospace)',
  fontWeight: 400,
  padding: '2px 4px',
  borderRadius: '3px',
  background: 'rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.7)',
};

const arrowStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 0,
  height: 0,
  borderLeft: '4px solid transparent',
  borderRight: '4px solid transparent',
};
