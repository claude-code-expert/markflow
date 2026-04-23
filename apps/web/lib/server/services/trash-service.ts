import {
  documents,
  documentVersions,
  categories,
  eq,
  and,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound } from '../utils/errors';
import { logger } from '../utils/logger';

export function createTrashService(db: Db) {
  async function softDelete(documentId: string, workspaceId: string): Promise<void> {
    const numDocumentId = Number(documentId);
    const numWorkspaceId = Number(workspaceId);
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, numWorkspaceId),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    await db
      .update(documents)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(eq(documents.id, numDocumentId));

    logger.info('Document soft deleted', { documentId, workspaceId });
  }

  async function list(workspaceId: string) {
    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        categoryId: documents.categoryId,
        authorId: documents.authorId,
        deletedAt: documents.deletedAt,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, true),
      ))
      .orderBy(documents.deletedAt);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      originalCategoryId: row.categoryId,
      authorId: row.authorId,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async function restore(documentId: string, workspaceId: string) {
    const numDocumentId = Number(documentId);
    const numWorkspaceId = Number(workspaceId);
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, numWorkspaceId),
        eq(documents.isDeleted, true),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found in trash');
    }

    // Check if original category still exists
    let categoryId = doc.categoryId;
    if (categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(
          eq(categories.id, categoryId),
          eq(categories.workspaceId, numWorkspaceId),
        ))
        .limit(1);

      if (!cat) {
        categoryId = null;
      }
    }

    const [restored] = await db
      .update(documents)
      .set({
        isDeleted: false,
        deletedAt: null,
        categoryId,
      })
      .where(eq(documents.id, numDocumentId))
      .returning();

    logger.info('Document restored from trash', { documentId, workspaceId });

    return restored;
  }

  async function permanentDelete(documentId: string, workspaceId: string): Promise<void> {
    const numDocumentId = Number(documentId);
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, true),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found in trash');
    }

    // Delete all versions first (cascade should handle this, but be explicit)
    await db
      .delete(documentVersions)
      .where(eq(documentVersions.documentId, numDocumentId));

    // Hard delete document
    await db
      .delete(documents)
      .where(eq(documents.id, numDocumentId));

    logger.info('Document permanently deleted', { documentId, workspaceId });
  }

  return { softDelete, list, restore, permanentDelete };
}
