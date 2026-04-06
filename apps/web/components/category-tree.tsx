'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import { useSidebarStore } from '../stores/sidebar-store';

export interface TreeDocument {
  id: number;
  title: string;
  updatedAt: string;
  categoryId?: number | null;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  children: Category[];
  documents: TreeDocument[];
}

interface CategoryTreeProps {
  categories: Category[];
  workspaceSlug: string;
  currentCategoryId?: number | null;
  currentDocId?: number | null;
  onContextMenu?: (e: React.MouseEvent, category: Category) => void;
  onDocContextMenu?: (e: React.MouseEvent, doc: TreeDocument) => void;
  onReorder?: (orderedIds: number[]) => void;
  onMoveDoc?: (docId: number, targetCategoryId: number | null) => void;
  basePl?: number;
  indentPx?: number;
}

interface CategoryNodeProps {
  category: Category;
  workspaceSlug: string;
  currentCategoryId?: number | null;
  currentDocId?: number | null;
  depth: number;
  onContextMenu?: (e: React.MouseEvent, category: Category) => void;
  onDocContextMenu?: (e: React.MouseEvent, doc: TreeDocument) => void;
  onMoveDoc?: (docId: number, targetCategoryId: number | null) => void;
  basePl: number;
  indentPx: number;
}

/* chevron(16) + gap(4) = 20px spacer for doc alignment */
export const DOC_SPACER_PX = 20;

function CategoryNode({
  category,
  workspaceSlug,
  currentCategoryId,
  currentDocId,
  depth,
  onContextMenu,
  onDocContextMenu,
  onMoveDoc,
  basePl,
  indentPx,
}: CategoryNodeProps) {
  const { expandedCategoryIds, toggleCategory } = useSidebarStore();
  const isExpanded = expandedCategoryIds.has(category.id);
  const isActive = currentCategoryId === category.id;
  const hasChildren = category.children.length > 0;
  const hasDocs = category.documents.length > 0;
  const hasContent = hasChildren || hasDocs;
  const [docDragOver, setDocDragOver] = useState(false);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCategory(category.id);
    },
    [category.id, toggleCategory],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (onContextMenu) {
        e.preventDefault();
        onContextMenu(e, category);
      }
    },
    [category, onContextMenu],
  );

  const paddingLeft = basePl + depth * indentPx;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(category.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <Link
        href={`/${workspaceSlug}/doc?categoryId=${category.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 10px',
          paddingLeft: `${paddingLeft}px`,
          fontSize: '13.5px',
          fontWeight: isActive ? 500 : 400,
          color: isActive ? 'var(--accent)' : 'var(--text-2)',
          background: docDragOver ? 'var(--accent-2)' : isActive ? 'var(--accent-2)' : 'transparent',
          borderRadius: 'var(--radius-sm)',
          textDecoration: 'none',
          transition: 'background 0.15s ease, color 0.15s ease',
          cursor: 'pointer',
          userSelect: 'none',
          outline: docDragOver ? '2px solid var(--accent)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isActive && !docDragOver) {
            e.currentTarget.style.background = 'var(--surface-2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!docDragOver) {
            e.currentTarget.style.background = isActive
              ? 'var(--accent-2)'
              : 'transparent';
          }
        }}
        onContextMenu={handleContextMenu}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('application/x-doc-id')) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          if (!docDragOver) setDocDragOver(true);
        }}
        onDragLeave={() => setDocDragOver(false)}
        onDrop={(e) => {
          const docIdStr = e.dataTransfer.getData('application/x-doc-id');
          if (docIdStr && onMoveDoc) {
            e.preventDefault();
            e.stopPropagation();
            onMoveDoc(Number(docIdStr), category.id);
          }
          setDocDragOver(false);
        }}
      >
        {/* Expand/Collapse chevron */}
        <button
          type="button"
          onClick={handleToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: hasContent ? 'pointer' : 'default',
            color: hasContent ? 'var(--text-2)' : 'transparent',
            flexShrink: 0,
            borderRadius: '2px',
          }}
          tabIndex={-1}
          aria-label={isExpanded ? '폴더 접기' : '폴더 펼치기'}
        >
          <ChevronRight
            size={12}
            style={{
              transition: 'transform 0.15s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
          />
        </button>

        {/* Folder icon */}
        {isExpanded && hasContent ? (
          <FolderOpen size={16} style={{ opacity: 0.65, flexShrink: 0 }} />
        ) : (
          <Folder size={16} style={{ opacity: 0.65, flexShrink: 0 }} />
        )}

        {/* Name */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {category.name}
        </span>

        {/* Document count badge */}
        {hasDocs && (
          <span
            style={{
              flexShrink: 0,
              fontSize: '11px',
              lineHeight: '16px',
              background: 'var(--surface-3)',
              borderRadius: '100px',
              padding: '1px 6px',
              color: 'var(--text-2)',
            }}
          >
            {category.documents.length}
          </span>
        )}
      </Link>

      {/* Children (subcategories + documents) */}
      {isExpanded && (
        <div>
          {/* Subcategories */}
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              workspaceSlug={workspaceSlug}
              currentCategoryId={currentCategoryId}
              currentDocId={currentDocId}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              onDocContextMenu={onDocContextMenu}
              onMoveDoc={onMoveDoc}
              basePl={basePl}
              indentPx={indentPx}
            />
          ))}
          {/* Documents in this category */}
          {category.documents.map((doc) => {
            const docHref = `/${workspaceSlug}/doc/${doc.id}`;
            const isDocActive = currentDocId === doc.id;
            const docPl = basePl + (depth + 1) * indentPx + DOC_SPACER_PX;
            return (
              <Link
                key={doc.id}
                href={docHref}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-doc-id', String(doc.id));
                  e.dataTransfer.effectAllowed = 'move';
                  e.stopPropagation();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  paddingLeft: `${docPl}px`,
                  fontSize: '13px',
                  fontWeight: isDocActive ? 500 : 400,
                  color: isDocActive ? 'var(--accent)' : 'var(--text-2)',
                  background: isDocActive ? 'var(--accent-2)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                  cursor: 'grab',
                }}
                onMouseEnter={(e) => {
                  if (!isDocActive) e.currentTarget.style.background = 'var(--surface-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDocActive ? 'var(--accent-2)' : 'transparent';
                }}
                onContextMenu={(e) => {
                  if (onDocContextMenu) {
                    e.preventDefault();
                    onDocContextMenu(e, doc);
                  }
                }}
              >
                <FileText size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                <span style={{
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {doc.title || '제목 없음'}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({
  categories,
  workspaceSlug,
  currentCategoryId,
  currentDocId,
  onContextMenu,
  onDocContextMenu,
  onReorder,
  onMoveDoc,
  basePl = 10,
  indentPx = 16,
}: CategoryTreeProps) {
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  if (categories.length === 0) {
    return null;
  }

  function handleDragOver(e: React.DragEvent, categoryId: number) {
    // Only handle folder reorder drag (text/plain), not doc drags
    if (e.dataTransfer.types.includes('application/x-doc-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(categoryId);
  }

  function handleDrop(e: React.DragEvent, targetId: number) {
    // Skip if this is a doc drop (handled by CategoryNode)
    if (e.dataTransfer.types.includes('application/x-doc-id')) return;
    e.preventDefault();
    setDragOverId(null);
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggedId || draggedId === targetId || !onReorder) return;

    const ids = categories.map((c) => c.id);
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedId);
    onReorder(ids);
  }

  return (
    <nav style={{ padding: '4px 0' }} aria-label="카테고리 트리">
      {categories.map((category) => (
        <div
          key={category.id}
          onDragOver={(e) => handleDragOver(e, category.id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => handleDrop(e, category.id)}
          style={{
            borderTop: dragOverId === category.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <CategoryNode
            category={category}
            workspaceSlug={workspaceSlug}
            currentCategoryId={currentCategoryId}
            currentDocId={currentDocId}
            depth={0}
            onContextMenu={onContextMenu}
            onDocContextMenu={onDocContextMenu}
            onMoveDoc={onMoveDoc}
            basePl={basePl}
            indentPx={indentPx}
          />
        </div>
      ))}
    </nav>
  );
}
