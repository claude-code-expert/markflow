'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { usePermissions } from '../hooks/use-permissions';
import { TagInput } from './tag-input';
import { DocumentLinksModal } from './document-links-modal';
import { MiniDagDiagram } from './mini-dag-diagram';
import { DagStructureModal } from './dag-structure-modal';
import type { Category } from '../lib/types';

/* ─── Types ─── */

interface RelationDoc {
  id: string;
  title: string;
}

interface Relations {
  prev: RelationDoc | null;
  next: RelationDoc | null;
  related: RelationDoc[];
}

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

interface VersionSummary {
  id: string;
  version: number;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

interface DocumentInfo {
  id: string;
  title: string;
  categoryId: string | null;
  categoryPath: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
}

interface DocumentMetaPanelProps {
  document: DocumentInfo;
  workspaceSlug: string;
  workspaceId: string;
  role: string | null | undefined;
  onClose?: () => void;
}

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDate(dateStr);
}

/* ─── Section Components ─── */

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '12px',
    }}>
      <span style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        {children}
      </span>
      {action}
    </div>
  );
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)',
        border: '1.5px solid var(--border-2)', background: 'var(--surface)',
        color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function LinkDocItem({ title, onRemove }: { title: string; onRemove?: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)', marginBottom: '6px', fontSize: '13px',
    }}>
      <span>📄</span>
      <span style={{ flex: 1, fontWeight: 500, fontSize: '13px' }}>{title}</span>
      {onRemove && (
        <button onClick={onRemove} style={{
          width: '20px', height: '20px', fontSize: '11px', border: 'none',
          background: 'none', cursor: 'pointer', color: 'var(--text-3)',
        }}>✕</button>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export function DocumentMetaPanel({
  document: doc, workspaceSlug, workspaceId, role,
  onClose,
}: DocumentMetaPanelProps) {
  const queryClient = useQueryClient();
  const permissions = usePermissions(role);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showDagModal, setShowDagModal] = useState(false);

  // ── Data queries (all use workspaceId) ──

  const relationsQuery = useQuery({
    queryKey: ['relations', workspaceId, doc.id],
    queryFn: () => apiFetch<Relations>(`/workspaces/${workspaceId}/documents/${doc.id}/relations`),
    enabled: !!workspaceId,
  });

  const graphQuery = useQuery({
    queryKey: ['graph', workspaceId],
    queryFn: () => apiFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/workspaces/${workspaceId}/graph`),
    enabled: !!workspaceId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => apiFetch<{ categories: Category[] }>(`/workspaces/${workspaceId}/categories`),
    enabled: !!workspaceId,
  });

  const tagsQuery = useQuery({
    queryKey: ['doc-tags', workspaceId, doc.id],
    queryFn: () => apiFetch<{ tags: Array<{ id: string; name: string }> }>(`/workspaces/${workspaceId}/documents/${doc.id}/tags`),
    enabled: !!workspaceId,
  });

  // ── Category change handler ──

  const handleCategoryChange = useCallback(async (categoryId: string | null) => {
    try {
      await apiFetch(`/workspaces/${workspaceId}/documents/${doc.id}`, {
        method: 'PATCH',
        body: { categoryId },
      });
      void queryClient.invalidateQueries({ queryKey: ['document'] });
    } catch {
      // silently fail
    }
  }, [workspaceId, doc.id, queryClient]);

  const relations = relationsQuery.data;
  const categories = categoriesQuery.data?.categories ?? [];
  const docTags = tagsQuery.data?.tags ?? [];

  // ── Render ──

  return (
    <aside style={{
      width: '300px', borderLeft: '1px solid var(--border)', background: 'var(--surface)',
      overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>문서 속성</span>
        {onClose && (
          <button onClick={onClose} style={{
            width: '34px', height: '34px', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
          }}>✕</button>
        )}
      </div>

      {/* ── Tags Section ── */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <SectionTitle>태그</SectionTitle>
        <TagInput
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
          documentId={doc.id}
          initialTags={docTags}
          disabled={!permissions.canManageTags}
        />
      </div>

      {/* ── Category Section ── */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <SectionTitle>카테고리</SectionTitle>
        <select
          value={doc.categoryId ?? ''}
          onChange={(e) => handleCategoryChange(e.target.value || null)}
          disabled={!permissions.canEditDocument}
          style={{
            width: '100%', fontSize: '13px', padding: '8px 10px',
            borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            fontFamily: 'inherit', outline: 'none',
          }}
        >
          <option value="">/ (루트)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* ── Document Links Section ── */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <SectionTitle action={<SmallButton onClick={() => setShowLinksModal(true)}>관리</SmallButton>}>
          문서 링크
        </SectionTitle>

        {relationsQuery.isLoading && (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-3)', fontSize: '12px' }}>로딩 중...</div>
        )}

        {relations && (
          <>
            {relations.prev && (
              <>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }}>← 이전</div>
                <LinkDocItem title={relations.prev.title} />
              </>
            )}
            {relations.next && (
              <>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', margin: '8px 0' }}>다음 →</div>
                <LinkDocItem title={relations.next.title} />
              </>
            )}
            {relations.related.length > 0 && (
              <>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', margin: '8px 0' }}>연관 문서</div>
                {relations.related.map((r) => (
                  <LinkDocItem key={r.id} title={r.title} />
                ))}
              </>
            )}
            {!relations.prev && !relations.next && relations.related.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', padding: '8px' }}>
                연결된 문서가 없습니다
              </div>
            )}
            <button
              onClick={() => setShowLinksModal(true)}
              style={{
                width: '100%', fontSize: '12px', marginTop: '6px', color: 'var(--accent)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px', fontFamily: 'inherit',
              }}
            >
              + 연관 문서 추가
            </button>
          </>
        )}
      </div>

      {/* ── Document Structure Diagram ── */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <SectionTitle action={<SmallButton onClick={() => setShowDagModal(true)}>전체 보기</SmallButton>}>
          문서 연결 구조
        </SectionTitle>

        {relations && (
          <MiniDagDiagram
            currentTitle={doc.title}
            categoryName={doc.categoryPath}
            prev={relations.prev}
            next={relations.next}
            related={relations.related}
            onClickFullView={() => setShowDagModal(true)}
          />
        )}

        {graphQuery.isLoading && !relations && (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-3)', fontSize: '12px' }}>로딩 중...</div>
        )}
      </div>

      {/* ── Modals ── */}
      <DocumentLinksModal
        open={showLinksModal}
        onClose={() => setShowLinksModal(false)}
        workspaceId={workspaceId}
        documentId={doc.id}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['relations', workspaceId, doc.id] });
          void queryClient.invalidateQueries({ queryKey: ['graph', workspaceId] });
        }}
      />

      {graphQuery.data && (
        <DagStructureModal
          open={showDagModal}
          onClose={() => setShowDagModal(false)}
          nodes={graphQuery.data.nodes}
          edges={graphQuery.data.edges}
          currentDocId={doc.id}
          currentTitle={doc.title}
          categoryName={doc.categoryPath}
          workspaceSlug={workspaceSlug}
          onEditLinks={() => { setShowDagModal(false); setShowLinksModal(true); }}
        />
      )}
    </aside>
  );
}

export type { DocumentMetaPanelProps, DocumentInfo, Relations, RelationDoc };
