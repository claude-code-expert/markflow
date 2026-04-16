import {
  documents,
  documentVersions,
  categories,
  users,
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound, forbidden } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { draftVisibilityClause } from './document-visibility.js';

const MAX_VERSIONS = 20;
const EXCERPT_RADIUS = 60;

export type DocumentStatus = 'draft' | 'published';

interface ListOptions {
  categoryId?: string | null;
  sort?: 'title' | 'updatedAt' | 'createdAt';
  order?: 'asc' | 'desc';
  q?: string;
  page?: number;
  limit?: number;
  // draft 가시성: 자기 draft 는 보이고, 남의 draft 는 숨기기 위해 필요
  currentUserId?: string;
}

/**
 * Extract a short excerpt around the first occurrence of `q` in `text`.
 * Returns an empty string if no match is found.
 */
function extractExcerpt(text: string, q: string): string {
  if (!text || !q) return text.slice(0, EXCERPT_RADIUS * 2);
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, EXCERPT_RADIUS * 2);

  const start = Math.max(0, idx - EXCERPT_RADIUS);
  const end = Math.min(text.length, idx + q.length + EXCERPT_RADIUS);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  return excerpt;
}

interface UpdateData {
  content?: string;
  title?: string;
  categoryId?: string | null;
  status?: DocumentStatus;
}

export function createDocumentService(db: Db) {
  async function create(
    workspaceId: string,
    authorId: string,
    title: string,
    content: string,
    categoryId?: string | null,
    status: DocumentStatus = 'published',
  ) {
    const numWorkspaceId = Number(workspaceId);

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId: numWorkspaceId,
        authorId: Number(authorId),
        title,
        categoryId: categoryId ? Number(categoryId) : null,
        content,
        currentVersion: 1,
        status,
      })
      .returning();

    if (!document) {
      throw new Error('Failed to create document');
    }

    // Create initial version (v1, empty content)
    await db.insert(documentVersions).values({
      documentId: document.id,
      version: 1,
      content: '',
    });

    logger.info('Document created', { documentId: document.id, workspaceId });

    return document;
  }

  async function getById(documentId: string, workspaceId: string, currentUserId?: string) {
    // draft 문서는 작성자 본인에게만 보임 — WHERE 절에서 직접 필터링하여
    // 다른 사용자에게는 not found 로 내려감.
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, Number(documentId)),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
        draftVisibilityClause(currentUserId),
      ))
      .limit(1);

    if (!document) {
      throw notFound('Document not found');
    }

    return document;
  }

  async function list(workspaceId: string, opts: ListOptions = {}) {
    const {
      categoryId,
      sort = 'updatedAt',
      order = 'desc',
      q,
      page = 1,
      limit = 20,
      currentUserId,
    } = opts;

    const conditions = [
      eq(documents.workspaceId, Number(workspaceId)),
      eq(documents.isDeleted, false),
      draftVisibilityClause(currentUserId),
    ];

    if (categoryId !== undefined) {
      if (categoryId === null) {
        conditions.push(sql`${documents.categoryId} IS NULL`);
      } else {
        conditions.push(eq(documents.categoryId, Number(categoryId)));
      }
    }

    const isSearch = Boolean(q && q.trim());

    if (isSearch) {
      // Search both title and content
      conditions.push(
        or(
          ilike(documents.title, `%${q}%`),
          ilike(documents.content, `%${q}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Sort column
    const sortColumnMap = {
      title: documents.title,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
    } as const;
    const sortColumn = sortColumnMap[sort];
    const orderFn = order === 'asc' ? asc : desc;

    // Count total
    const [countResult] = await db
      .select({ value: sql<number>`COUNT(*)`.as('count') })
      .from(documents)
      .where(whereClause);

    const total = Number(countResult?.value ?? 0);

    // Fetch page
    const offset = (page - 1) * limit;

    // When searching, rank title matches above content-only matches
    const orderClauses = isSearch
      ? [
          // Title match first (0 = match, 1 = no match)
          desc(sql`CASE WHEN ${documents.title} ILIKE ${'%' + q + '%'} THEN 0 ELSE 1 END`),
          orderFn(sortColumn),
        ]
      : [orderFn(sortColumn)];

    // Join categories + users to include category name and author name in list
    const rows = await db
      .select({
        id: documents.id,
        workspaceId: documents.workspaceId,
        categoryId: documents.categoryId,
        authorId: documents.authorId,
        title: documents.title,
        content: documents.content,
        currentVersion: documents.currentVersion,
        status: documents.status,
        isDeleted: documents.isDeleted,
        deletedAt: documents.deletedAt,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        categoryName: categories.name,
        authorName: users.name,
      })
      .from(documents)
      .leftJoin(categories, eq(documents.categoryId, categories.id))
      .leftJoin(users, eq(documents.authorId, users.id))
      .where(whereClause)
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset);

    // Build response with excerpts for search queries
    const enrichedDocs = rows.map((row) => {
      const { categoryName, authorName, ...doc } = row;
      if (isSearch && q) {
        return {
          ...doc,
          categoryName,
          authorName,
          excerpt: extractExcerpt(doc.content, q),
        };
      }
      return { ...doc, categoryName, authorName };
    });

    return {
      documents: enrichedDocs,
      total,
      page,
    };
  }

  async function update(documentId: string, workspaceId: string, data: UpdateData, userId?: string, isAdminOrOwner = false) {
    const numDocumentId = Number(documentId);
    const [existing] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!existing) {
      throw notFound('Document not found');
    }

    // 작성자 또는 admin/owner만 수정 가능
    if (userId && !isAdminOrOwner && existing.authorId !== Number(userId)) {
      throw forbidden('Only the document author or admin can edit this document');
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      updates.title = data.title;
    }

    if (data.categoryId !== undefined) {
      updates.categoryId = data.categoryId;
    }

    if (data.status !== undefined) {
      updates.status = data.status;
    }

    const contentChanged = data.content !== undefined && data.content !== existing.content;

    if (data.content !== undefined) {
      updates.content = data.content;
    }

    // If content changed, create a new version snapshot
    if (contentChanged) {
      const newVersion = existing.currentVersion + 1;
      updates.currentVersion = newVersion;

      await db.insert(documentVersions).values({
        documentId: numDocumentId,
        version: newVersion,
        content: data.content!,
        authorId: userId ? Number(userId) : null,
      });

      // FIFO: keep max MAX_VERSIONS, delete oldest
      const allVersions = await db
        .select({ id: documentVersions.id, version: documentVersions.version })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, numDocumentId))
        .orderBy(desc(documentVersions.version));

      if (allVersions.length > MAX_VERSIONS) {
        const toDelete = allVersions.slice(MAX_VERSIONS);
        for (const v of toDelete) {
          await db
            .delete(documentVersions)
            .where(eq(documentVersions.id, v.id));
        }
      }

      logger.info('Document version created', { documentId, version: newVersion });
    }

    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, numDocumentId))
      .returning();

    logger.info('Document updated', { documentId, workspaceId });

    return updated;
  }

  async function getVersions(documentId: string, workspaceId: string) {
    const numDocumentId = Number(documentId);
    // Verify document exists in workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, Number(workspaceId)),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    const rows = await db
      .select({
        id: documentVersions.id,
        version: documentVersions.version,
        content: documentVersions.content,
        createdAt: documentVersions.createdAt,
        authorId: documentVersions.authorId,
        authorName: users.name,
      })
      .from(documentVersions)
      .leftJoin(users, eq(documentVersions.authorId, users.id))
      .where(eq(documentVersions.documentId, numDocumentId))
      .orderBy(desc(documentVersions.version));

    return rows.map(v => ({
      id: v.id,
      version: v.version,
      content: v.content,
      createdAt: v.createdAt,
      createdBy: v.authorName ? { id: v.authorId, name: v.authorName } : null,
    }));
  }

  async function restoreVersion(
    documentId: string,
    workspaceId: string,
    versionNum: number,
    userId: string,
  ) {
    const numDocumentId = Number(documentId);

    // 1. Verify document exists in workspace
    const [existing] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, numDocumentId),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!existing) {
      throw notFound('Document not found');
    }

    // 2. Find the target version
    const [targetVersion] = await db
      .select()
      .from(documentVersions)
      .where(and(
        eq(documentVersions.documentId, numDocumentId),
        eq(documentVersions.version, versionNum),
      ))
      .limit(1);

    if (!targetVersion) {
      throw notFound('Version not found');
    }

    // 3. Create a backup version with the current content
    const backupVersionNum = existing.currentVersion + 1;
    await db.insert(documentVersions).values({
      documentId: numDocumentId,
      version: backupVersionNum,
      content: existing.content,
      authorId: Number(userId),
    });

    // 4. Create a restored version
    const restoredVersionNum = backupVersionNum + 1;
    await db.insert(documentVersions).values({
      documentId: numDocumentId,
      version: restoredVersionNum,
      content: targetVersion.content,
      authorId: Number(userId),
    });

    // 5. Update document content to restored version
    await db
      .update(documents)
      .set({
        content: targetVersion.content,
        currentVersion: restoredVersionNum,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, numDocumentId));

    // FIFO: keep max MAX_VERSIONS, delete oldest
    const allVersions = await db
      .select({ id: documentVersions.id, version: documentVersions.version })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, numDocumentId))
      .orderBy(desc(documentVersions.version));

    if (allVersions.length > MAX_VERSIONS) {
      const toDelete = allVersions.slice(MAX_VERSIONS);
      for (const v of toDelete) {
        await db
          .delete(documentVersions)
          .where(eq(documentVersions.id, v.id));
      }
    }

    logger.info('Document version restored', {
      documentId,
      fromVersion: versionNum,
      newVersion: restoredVersionNum,
    });

    return { newVersion: restoredVersionNum };
  }

  return { create, getById, list, update, getVersions, restoreVersion };
}
