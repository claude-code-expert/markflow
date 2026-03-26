import {
  categories,
  categoryClosure,
  documents,
  eq,
  and,
  isNull,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function createCategoryService(db: Db) {
  async function create(workspaceId: string, name: string, parentId?: string | null) {
    // Validate parent exists in same workspace
    if (parentId) {
      const [parent] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(
          eq(categories.id, parentId),
          eq(categories.workspaceId, workspaceId),
        ))
        .limit(1);

      if (!parent) {
        throw notFound('Parent category not found');
      }
    }

    // Check duplicate name under same parent
    const duplicateWhere = parentId
      ? and(
          eq(categories.workspaceId, workspaceId),
          eq(categories.parentId, parentId),
          eq(categories.name, name),
        )
      : and(
          eq(categories.workspaceId, workspaceId),
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
        workspaceId,
        name,
        parentId: parentId ?? null,
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
    if (parentId) {
      await db.execute(sql`
        INSERT INTO category_closure (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, ${category.id}, depth + 1
        FROM category_closure
        WHERE descendant_id = ${parentId}
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
      .where(eq(categories.workspaceId, workspaceId))
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
      .where(eq(categories.workspaceId, workspaceId))
      .groupBy(categoryClosure.descendantId);

    const depthMap = new Map<string, number>();
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
    const [category] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId),
      ))
      .limit(1);

    if (!category) {
      throw notFound('Category not found');
    }

    // Check duplicate under same parent
    const duplicateWhere = category.parentId
      ? and(
          eq(categories.workspaceId, workspaceId),
          eq(categories.parentId, category.parentId),
          eq(categories.name, newName),
        )
      : and(
          eq(categories.workspaceId, workspaceId),
          isNull(categories.parentId),
          eq(categories.name, newName),
        );

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(duplicateWhere)
      .limit(1);

    if (existing && existing.id !== categoryId) {
      throw conflict('DUPLICATE_NAME', 'A category with this name already exists under the same parent');
    }

    const [updated] = await db
      .update(categories)
      .set({ name: newName })
      .where(eq(categories.id, categoryId))
      .returning();

    logger.info('Category renamed', { categoryId, newName });

    return updated;
  }

  async function remove(categoryId: string, workspaceId: string) {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId),
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
        eq(categories.parentId, categoryId),
        eq(categories.workspaceId, workspaceId),
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
        eq(documents.categoryId, categoryId),
        eq(documents.workspaceId, workspaceId),
      ));

    // Delete closure entries for this category
    await db
      .delete(categoryClosure)
      .where(eq(categoryClosure.descendantId, categoryId));

    await db
      .delete(categoryClosure)
      .where(eq(categoryClosure.ancestorId, categoryId));

    // Delete category
    await db
      .delete(categories)
      .where(eq(categories.id, categoryId));

    logger.info('Category deleted', { categoryId, workspaceId });
  }

  return { create, list, rename, remove };
}
