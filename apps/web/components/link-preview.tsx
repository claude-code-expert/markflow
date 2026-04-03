'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import type { DocumentResponse, Category } from '../lib/types';

interface LinkPreviewData {
  title: string;
  excerpt: string;
  categoryName: string | null;
}

interface LinkPreviewProps {
  /** The container element to listen for hover events on internal doc links */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Current workspace ID */
  workspaceId: number;
}

const HOVER_DELAY = 200;
const HIDE_DELAY = 200;

export function LinkPreview({ containerRef, workspaceId }: LinkPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);

  const cacheRef = useRef(new Map<number, LinkPreviewData>());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const currentDocIdRef = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setPreviewData(null);
    setLoading(false);
    currentDocIdRef.current = null;
  }, []);

  const extractDocId = useCallback((href: string): number | null => {
    // Match patterns like /workspaceName/doc/123 or */doc/123
    const match = /\/doc\/(\d+)/.exec(href);
    if (!match) return null;
    return Number(match[1]);
  }, []);

  const fetchPreview = useCallback(async (docId: number) => {
    const cached = cacheRef.current.get(docId);
    if (cached) {
      setPreviewData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [docRes, catRes] = await Promise.all([
        apiFetch<DocumentResponse>(`/workspaces/${workspaceId}/documents/${docId}`),
        apiFetch<{ categories: Category[] }>(`/workspaces/${workspaceId}/categories`),
      ]);

      const doc = docRes.document;
      const category = doc.categoryId
        ? catRes.categories.find((c) => c.id === doc.categoryId) ?? null
        : null;

      const excerpt = doc.content
        .replace(/^#.*$/gm, '') // remove headings
        .replace(/[*_`~\[\]()>!|]/g, '') // remove markdown syntax
        .replace(/\n+/g, ' ') // collapse newlines
        .trim()
        .slice(0, 150);

      const data: LinkPreviewData = {
        title: doc.title,
        excerpt: excerpt || '(내용 없음)',
        categoryName: category?.name ?? null,
      };

      cacheRef.current.set(docId, data);

      // Only update if still hovering on same doc
      if (currentDocIdRef.current === docId) {
        setPreviewData(data);
        setLoading(false);
      }
    } catch {
      if (currentDocIdRef.current === docId) {
        setLoading(false);
        setPreviewData(null);
        setVisible(false);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href*="/doc/"]') as HTMLAnchorElement | null;
      if (!anchor) return;

      // Only match internal doc links inside .mf-preview
      const inPreview = anchor.closest('.mf-preview');
      if (!inPreview) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const docId = extractDocId(href);
      if (docId === null) return;

      clearHideTimer();
      clearHoverTimer();

      hoverTimerRef.current = setTimeout(() => {
        const rect = anchor.getBoundingClientRect();
        currentDocIdRef.current = docId;

        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        setVisible(true);
        void fetchPreview(docId);
      }, HOVER_DELAY);
    }

    function handleMouseOut(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;

      const anchor = target.closest('a[href*="/doc/"]');
      if (!anchor) return;

      // Check if moving to the tooltip itself
      if (relatedTarget && tooltipRef.current?.contains(relatedTarget)) {
        return;
      }

      clearHoverTimer();
      hideTimerRef.current = setTimeout(hide, HIDE_DELAY);
    }

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      clearHoverTimer();
      clearHideTimer();
    };
  }, [containerRef, extractDocId, fetchPreview, hide, clearHoverTimer, clearHideTimer]);

  const handleTooltipMouseEnter = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  const handleTooltipMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(hide, HIDE_DELAY);
  }, [hide]);

  if (!visible) return null;

  // Position tooltip above the link, centered
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y - 8,
    transform: 'translate(-50%, -100%)',
    zIndex: 10000,
    width: '300px',
    padding: '12px 14px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    pointerEvents: 'auto' as const,
  };

  return (
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            문서 정보 로딩 중...
          </span>
        </div>
      ) : previewData ? (
        <div>
          {previewData.categoryName && (
            <div style={{
              fontSize: '11px',
              color: 'var(--accent)',
              fontWeight: 500,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {previewData.categoryName}
            </div>
          )}
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '6px',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-heading)',
          }}>
            {previewData.title}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-2)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {previewData.excerpt}
          </div>
        </div>
      ) : null}
    </div>
  );
}
