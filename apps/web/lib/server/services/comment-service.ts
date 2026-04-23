import {
  comments,
  documents,
  users,
  eq,
  and,
  asc,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound, forbidden } from '../utils/errors';
import { logger } from '../utils/logger';

export function createCommentService(db: Db) {
  async function list(documentId: string, workspaceId: string) {
    const numDocumentId = Number(documentId);
    const numWorkspaceId = Number(workspaceId);

    // Verify document belongs to workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    const rows = await db
      .select({
        id: comments.id,
        documentId: comments.documentId,
        authorId: comments.authorId,
        authorName: users.name,
        content: comments.content,
        parentId: comments.parentId,
        resolved: comments.resolved,
        resolvedBy: comments.resolvedBy,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.documentId, numDocumentId))
      .orderBy(asc(comments.createdAt));

    return rows;
  }

  async function create(
    documentId: string,
    workspaceId: string,
    authorId: string,
    content: string,
    parentId?: number | null,
  ) {
    const numDocumentId = Number(documentId);
    const numWorkspaceId = Number(workspaceId);

    // Verify document belongs to workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    // If parentId provided, verify it exists and belongs to same document
    if (parentId) {
      const [parent] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(and(
          eq(comments.id, parentId),
          eq(comments.documentId, numDocumentId),
        ))
        .limit(1);

      if (!parent) {
        throw notFound('Parent comment not found');
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        documentId: numDocumentId,
        authorId: Number(authorId),
        content,
        parentId: parentId ?? null,
      })
      .returning();

    if (!comment) {
      throw new Error('Failed to create comment');
    }

    // Fetch with author name
    const [result] = await db
      .select({
        id: comments.id,
        documentId: comments.documentId,
        authorId: comments.authorId,
        authorName: users.name,
        content: comments.content,
        parentId: comments.parentId,
        resolved: comments.resolved,
        resolvedBy: comments.resolvedBy,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.id, comment.id))
      .limit(1);

    logger.info('Comment created', { commentId: comment.id, documentId });

    return result;
  }

  async function update(
    commentId: string,
    workspaceId: string,
    userId: string,
    content: string,
  ) {
    const numCommentId = Number(commentId);

    const [comment] = await db
      .select({
        id: comments.id,
        authorId: comments.authorId,
        documentId: comments.documentId,
      })
      .from(comments)
      .where(eq(comments.id, numCommentId))
      .limit(1);

    if (!comment) {
      throw notFound('Comment not found');
    }

    // Verify document belongs to workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, comment.documentId),
        eq(documents.workspaceId, Number(workspaceId)),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Comment not found');
    }

    // Only author can edit
    if (comment.authorId !== Number(userId)) {
      throw forbidden('You can only edit your own comments');
    }

    await db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, numCommentId));

    // Fetch updated with author name
    const [result] = await db
      .select({
        id: comments.id,
        documentId: comments.documentId,
        authorId: comments.authorId,
        authorName: users.name,
        content: comments.content,
        parentId: comments.parentId,
        resolved: comments.resolved,
        resolvedBy: comments.resolvedBy,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.id, numCommentId))
      .limit(1);

    logger.info('Comment updated', { commentId, userId });

    return result;
  }

  async function toggleResolved(
    commentId: string,
    workspaceId: string,
    userId: string,
  ) {
    const numCommentId = Number(commentId);

    const [comment] = await db
      .select({
        id: comments.id,
        documentId: comments.documentId,
        resolved: comments.resolved,
      })
      .from(comments)
      .where(eq(comments.id, numCommentId))
      .limit(1);

    if (!comment) {
      throw notFound('Comment not found');
    }

    // Verify document belongs to workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, comment.documentId),
        eq(documents.workspaceId, Number(workspaceId)),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Comment not found');
    }

    const newResolved = !comment.resolved;

    await db
      .update(comments)
      .set({
        resolved: newResolved,
        resolvedBy: newResolved ? Number(userId) : null,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, numCommentId));

    // Fetch updated with author name
    const [result] = await db
      .select({
        id: comments.id,
        documentId: comments.documentId,
        authorId: comments.authorId,
        authorName: users.name,
        content: comments.content,
        parentId: comments.parentId,
        resolved: comments.resolved,
        resolvedBy: comments.resolvedBy,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.id, numCommentId))
      .limit(1);

    logger.info('Comment resolved toggled', { commentId, resolved: newResolved, userId });

    return result;
  }

  async function remove(commentId: string, workspaceId: string, userId: string) {
    const numCommentId = Number(commentId);

    // Fetch comment and verify document belongs to workspace
    const [comment] = await db
      .select({
        id: comments.id,
        authorId: comments.authorId,
        documentId: comments.documentId,
      })
      .from(comments)
      .where(eq(comments.id, numCommentId))
      .limit(1);

    if (!comment) {
      throw notFound('Comment not found');
    }

    // Verify document belongs to workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, comment.documentId),
        eq(documents.workspaceId, Number(workspaceId)),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Comment not found');
    }

    // Only author can delete their own comment
    if (comment.authorId !== Number(userId)) {
      throw forbidden('You can only delete your own comments');
    }

    await db
      .delete(comments)
      .where(eq(comments.id, numCommentId));

    logger.info('Comment deleted', { commentId, userId });
  }

  return { list, create, update, toggleResolved, remove };
}
