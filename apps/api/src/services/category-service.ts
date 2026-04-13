import {
  categories,
  categoryClosure,
  documents,
  eq,
  and,
  isNull,
  asc,
  desc,
  gt,
  inArray,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CategoryTreeDocument {
  id: number;
  title: string;
  updatedAt: Date;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryTreeNode[];
  documents: CategoryTreeDocument[];
}

export function createCategoryService(db: Db) {
  async function create(workspaceId: string, name: string, parentId?: string | null) {
    // Validate parent exists in same workspace
    if (parentId) {
      const [parent] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(
          eq(categories.id, Number(parentId)),
          eq(categories.workspaceId, Number(workspaceId)),
        ))
        .limit(1);

      if (!parent) {
        throw notFound('Parent category not found');
      }
    }

    // Check duplicate name under same parent
    const numWorkspaceId = Number(workspaceId);
    const numParentId = parentId ? Number(parentId) : null;

    const duplicateWhere = numParentId
      ? and(
          eq(categories.workspaceId, numWorkspaceId),
          eq(categories.parentId, numParentId),
          eq(categories.name, name),
        )
      : and(
          eq(categories.workspaceId, numWorkspaceId),
          isNull(categories.parentId),
          eq(categories.name, name),
        );

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(duplicateWhere)
      .limit(1);

    if (existing) {
      throw conflict('DUPLICATE_NAME', 'A category with this name already exists under the same parent');
    }

    // Insert category
    const [category] = await db
      .insert(categories)
      .values({
        workspaceId: numWorkspaceId,
        name,
        parentId: numParentId,
      })
      .returning();

    if (!category) {
      throw new Error('Failed to create category');
    }

    // Insert self-reference in closure table (depth 0)
    await db.insert(categoryClosure).values({
      ancestorId: category.id,
      descendantId: category.id,
      depth: 0,
    });

    // If parentId, copy ancestor rows with depth+1
    if (numParentId) {
      await db.execute(sql`
        INSERT INTO category_closure (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, ${category.id}, depth + 1
        FROM category_closure
        WHERE descendant_id = ${numParentId}
      `);
    }

    logger.info('Category created', { categoryId: category.id, workspaceId });

    return category;
  }

  async function list(workspaceId: string) {
    // Return flat list with depth info from closure table
    const rows = await db
      .select({
        id: categories.id,
        workspaceId: categories.workspaceId,
        name: categories.name,
        parentId: categories.parentId,
        createdAt: categories.createdAt,
        depth: categoryClosure.depth,
      })
      .from(categories)
      .innerJoin(
        categoryClosure,
        and(
          eq(categoryClosure.descendantId, categories.id),
          eq(categoryClosure.ancestorId, categories.id),
        ),
      )
      .where(eq(categories.workspaceId, Number(workspaceId)))
      .orderBy(categories.name);

    // The self-reference join gives depth=0 for all. We need actual depth from root.
    // Use a separate query to get max depth for each category.
    const depthRows = await db
      .select({
        descendantId: categoryClosure.descendantId,
        maxDepth: sql<number>`MAX(${categoryClosure.depth})`.as('max_depth'),
      })
      .from(categoryClosure)
      .innerJoin(categories, eq(categoryClosure.descendantId, categories.id))
      .where(eq(categories.workspaceId, Number(workspaceId)))
      .groupBy(categoryClosure.descendantId);

    const depthMap = new Map<number, number>();
    for (const row of depthRows) {
      depthMap.set(row.descendantId, Number(row.maxDepth));
    }

    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      parentId: row.parentId,
      depth: depthMap.get(row.id) ?? 0,
      createdAt: row.createdAt,
    }));
  }

  async function rename(categoryId: string, workspaceId: string, newName: string) {
    const numCategoryId = Number(categoryId);
    const numWorkspaceId = Number(workspaceId);

    const [category] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, numCategoryId),
        eq(categories.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (!category) {
      throw notFound('Category not found');
    }

    // Check duplicate under same parent
    const duplicateWhere = category.parentId
      ? and(
          eq(categories.workspaceId, numWorkspaceId),
          eq(categories.parentId, category.parentId),
          eq(categories.name, newName),
        )
      : and(
          eq(categories.workspaceId, numWorkspaceId),
          isNull(categories.parentId),
          eq(categories.name, newName),
        );

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(duplicateWhere)
      .limit(1);

    if (existing && existing.id !== numCategoryId) {
      throw conflict('DUPLICATE_NAME', 'A category with this name already exists under the same parent');
    }

    const [updated] = await db
      .update(categories)
      .set({ name: newName })
      .where(eq(categories.id, numCategoryId))
      .returning();

    logger.info('Category renamed', { categoryId, newName });

    return updated;
  }

  async function remove(categoryId: string, workspaceId: string) {
    const numCategoryId = Number(categoryId);
    const numWorkspaceId = Number(workspaceId);

    const [category] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, numCategoryId),
        eq(categories.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (!category) {
      throw notFound('Category not found');
    }

    // Check for subcategories
    const subcategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(
        eq(categories.parentId, numCategoryId),
        eq(categories.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (subcategories.length > 0) {
      throw badRequest('HAS_SUBCATEGORIES', 'Cannot delete a category that has subcategories');
    }

    // Move child documents to root (set category_id = null)
    await db
      .update(documents)
      .set({ categoryId: null })
      .where(and(
        eq(documents.categoryId, numCategoryId),
        eq(documents.workspaceId, numWorkspaceId),
      ));

    // Delete closure entries for this category
    await db
      .delete(categoryClosure)
      .where(eq(categoryClosure.descendantId, numCategoryId));

    await db
      .delete(categoryClosure)
      .where(eq(categoryClosure.ancestorId, numCategoryId));

    // Delete category
    await db
      .delete(categories)
      .where(eq(categories.id, numCategoryId));

    logger.info('Category deleted', { categoryId, workspaceId });
  }

  async function tree(workspaceId: string) {
    // 1. 카테고리 목록
    const categoryRows = await db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(eq(categories.workspaceId, Number(workspaceId)))
      .orderBy(asc(categories.orderIndex), asc(categories.name));

    // 2. 해당 워크스페이스의 활성 문서 (삭제되지 않은)
    const docRows = await db
      .select({
        id: documents.id,
        title: documents.title,
        categoryId: documents.categoryId,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
      ))
      .orderBy(asc(documents.title));

    // 3. 카테고리 → 트리 조립
    const nodeMap = new Map<number, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const c of categoryRows) {
      nodeMap.set(c.id, { id: c.id, name: c.name, parentId: c.parentId, children: [], documents: [] });
    }

    for (const c of categoryRows) {
      const node = nodeMap.get(c.id)!;
      if (c.parentId) {
        const parent = nodeMap.get(c.parentId);
        if (parent) { parent.children.push(node); continue; }
      }
      roots.push(node);
    }

    // 4. 문서를 카테고리에 배치
    const uncategorized: CategoryTreeDocument[] = [];

    for (const d of docRows) {
      const doc: CategoryTreeDocument = { id: d.id, title: d.title, updatedAt: d.updatedAt };
      if (d.categoryId) {
        const node = nodeMap.get(d.categoryId);
        if (node) { node.documents.push(doc); continue; }
      }
      uncategorized.push(doc);
    }

    return { categories: roots, uncategorized };
  }

  async function reorder(workspaceId: string, orderedIds: number[]) {
    const numWorkspaceId = Number(workspaceId);

    // Update orderIndex for each category based on array position
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(categories)
        .set({ orderIndex: i })
        .where(and(
          eq(categories.id, orderedIds[i]!),
          eq(categories.workspaceId, numWorkspaceId),
        ));
    }
  }

  async function ancestors(categoryId: string, workspaceId: string) {
    const numCategoryId = Number(categoryId);
    const numWorkspaceId = Number(workspaceId);

    // Verify category exists in workspace
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(
        eq(categories.id, numCategoryId),
        eq(categories.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (!category) {
      throw notFound('Category not found');
    }

    // Query closure table for ancestors (depth > 0 excludes self-reference)
    // Order by depth DESC so root comes first (root-to-leaf order)
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        depth: categoryClosure.depth,
        createdAt: categories.createdAt,
      })
      .from(categoryClosure)
      .innerJoin(categories, eq(categoryClosure.ancestorId, categories.id))
      .where(and(
        eq(categoryClosure.descendantId, numCategoryId),
        gt(categoryClosure.depth, 0),
      ))
      .orderBy(desc(categoryClosure.depth));

    return rows;
  }

  return { create, list, tree, rename, remove, reorder, ancestors };
}
