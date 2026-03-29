'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import { useSidebarStore } from '../stores/sidebar-store';

export interface TreeDocument {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children: Category[];
  documents: TreeDocument[];
}

interface CategoryTreeProps {
  categories: Category[];
  workspaceSlug: string;
  currentCategoryId?: string | null;
  currentDocId?: string | null;
  onContextMenu?: (e: React.MouseEvent, category: Category) => void;
}

interface CategoryNodeProps {
  category: Category;
  workspaceSlug: string;
  currentCategoryId?: string | null;
  currentDocId?: string | null;
  depth: number;
  onContextMenu?: (e: React.MouseEvent, category: Category) => void;
}

function CategoryNode({
  category,
  workspaceSlug,
  currentCategoryId,
  currentDocId,
  depth,
  onContextMenu,
}: CategoryNodeProps) {
  const { expandedCategoryIds, toggleCategory } = useSidebarStore();
  const isExpanded = expandedCategoryIds.has(category.id);
  const isActive = currentCategoryId === category.id;
  const hasChildren = category.children.length > 0;
  const hasDocs = category.documents.length > 0;
  const hasContent = hasChildren || hasDocs;

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

  const paddingLeft = depth * 14 + 12;

  return (
    <div>
      <Link
        href={`/${workspaceSlug}/docs?categoryId=${category.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          paddingLeft: `${paddingLeft}px`,
          fontSize: '13.5px',
          fontWeight: isActive ? 500 : 400,
          color: isActive ? 'var(--accent)' : 'var(--text-2)',
          background: isActive ? 'var(--accent-2)' : 'transparent',
          borderRadius: 'var(--radius-sm)',
          textDecoration: 'none',
          transition: 'background 0.15s ease, color 0.15s ease',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'var(--surface-2)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isActive
            ? 'var(--accent-2)'
            : 'transparent';
        }}
        onContextMenu={handleContextMenu}
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
            />
          ))}
          {/* Documents in this category */}
          {category.documents.map((doc) => {
            const docHref = `/${workspaceSlug}/docs/${doc.id}`;
            const isDocActive = currentDocId === doc.id;
            return (
              <Link
                key={doc.id}
                href={docHref}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  paddingLeft: `${(depth + 1) * 14 + 12}px`,
                  fontSize: '13px',
                  fontWeight: isDocActive ? 500 : 400,
                  color: isDocActive ? 'var(--accent)' : 'var(--text-2)',
                  background: isDocActive ? 'var(--accent-2)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isDocActive) e.currentTarget.style.background = 'var(--surface-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDocActive ? 'var(--accent-2)' : 'transparent';
                }}
              >
                <FileText size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
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
}: CategoryTreeProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <nav style={{ padding: '4px 0' }} aria-label="카테고리 트리">
      {categories.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          workspaceSlug={workspaceSlug}
          currentCategoryId={currentCategoryId}
          currentDocId={currentDocId}
          depth={0}
          onContextMenu={onContextMenu}
        />
      ))}
    </nav>
  );
}
