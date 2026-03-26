'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useSidebarStore } from '../stores/sidebar-store';

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children: Category[];
  documentCount?: number;
}

interface CategoryTreeProps {
  categories: Category[];
  workspaceSlug: string;
  currentCategoryId?: string | null;
  onContextMenu?: (e: React.MouseEvent, category: Category) => void;
}

interface CategoryNodeProps {
  category: Category;
  workspaceSlug: string;
  currentCategoryId?: string | null;
  depth: number;
  onContextMenu?: (e: React.MouseEvent, category: Category) => void;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{
        transition: 'transform 0.15s ease',
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <path
        d="M4.5 2.5L8 6L4.5 9.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ opacity: 0.65, flexShrink: 0 }}
    >
      {open ? (
        <path
          d="M3.75 14.25C2.92157 14.25 2.25 13.5784 2.25 12.75V5.25C2.25 4.42157 2.92157 3.75 3.75 3.75H6.75L8.25 5.25H12.75C13.5784 5.25 14.25 5.92157 14.25 6.75V7.5M3.75 14.25H14.25C15.0784 14.25 15.75 13.5784 15.75 12.75V9.75C15.75 8.92157 15.0784 8.25 14.25 8.25H6.75C5.92157 8.25 5.25 8.92157 5.25 9.75V14.25C5.25 14.25 4.57843 14.25 3.75 14.25Z"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M2.25 5.25C2.25 4.42157 2.92157 3.75 3.75 3.75H6.75L8.25 5.25H14.25C15.0784 5.25 15.75 5.92157 15.75 6.75V12.75C15.75 13.5784 15.0784 14.25 14.25 14.25H3.75C2.92157 14.25 2.25 13.5784 2.25 12.75V5.25Z"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function CategoryNode({
  category,
  workspaceSlug,
  currentCategoryId,
  depth,
  onContextMenu,
}: CategoryNodeProps) {
  const { expandedCategoryIds, toggleCategory } = useSidebarStore();
  const isExpanded = expandedCategoryIds.has(category.id);
  const isActive = currentCategoryId === category.id;
  const hasChildren = category.children.length > 0;

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
            cursor: hasChildren ? 'pointer' : 'default',
            color: hasChildren ? 'var(--text-2)' : 'transparent',
            flexShrink: 0,
            borderRadius: '2px',
          }}
          tabIndex={-1}
          aria-label={isExpanded ? '폴더 접기' : '폴더 펼치기'}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>

        {/* Folder icon */}
        <FolderIcon open={isExpanded && hasChildren} />

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
        {category.documentCount !== undefined && category.documentCount > 0 && (
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
            {category.documentCount}
          </span>
        )}
      </Link>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              workspaceSlug={workspaceSlug}
              currentCategoryId={currentCategoryId}
              depth={depth + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({
  categories,
  workspaceSlug,
  currentCategoryId,
  onContextMenu,
}: CategoryTreeProps) {
  if (categories.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 18 18"
          fill="none"
          style={{
            margin: '0 auto 8px',
            opacity: 0.3,
            color: 'var(--text-2)',
          }}
        >
          <path
            d="M2.25 5.25C2.25 4.42157 2.92157 3.75 3.75 3.75H6.75L8.25 5.25H14.25C15.0784 5.25 15.75 5.92157 15.75 6.75V12.75C15.75 13.5784 15.0784 14.25 14.25 14.25H3.75C2.92157 14.25 2.25 13.5784 2.25 12.75V5.25Z"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-2)',
            opacity: 0.5,
            margin: 0,
          }}
        >
          폴더가 없습니다
        </p>
      </div>
    );
  }

  return (
    <nav style={{ padding: '4px 0' }} aria-label="카테고리 트리">
      {categories.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          workspaceSlug={workspaceSlug}
          currentCategoryId={currentCategoryId}
          depth={0}
          onContextMenu={onContextMenu}
        />
      ))}
    </nav>
  );
}
