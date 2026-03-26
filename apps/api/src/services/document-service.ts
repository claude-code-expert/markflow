import {
  documents,
  documentVersions,
  eq,
  and,
  desc,
  asc,
  ilike,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { generateSlug, ensureUniqueSlug } from '../utils/slug.js';

const MAX_VERSIONS = 20;

interface ListOptions {
  categoryId?: string | null;
  sort?: 'title' | 'updatedAt' | 'createdAt';
  order?: 'asc' | 'desc';
  q?: string;
  page?: number;
  limit?: number;
}

interface UpdateData {
  content?: string;
  title?: string;
}

export function createDocumentService(db: Db) {
  async function create(
    workspaceId: string,
    authorId: string,
    title: string,
    categoryId?: string | null,
  ) {
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(db, workspaceId, baseSlug);

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId,
        authorId,
        title,
        slug,
        categoryId: categoryId ?? null,
        content: '',
        currentVersion: 1,
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

  async function getById(documentId: string, workspaceId: string) {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, workspaceId),
        eq(documents.isDeleted, false),
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
    } = opts;

    const conditions = [
      eq(documents.workspaceId, workspaceId),
      eq(documents.isDeleted, false),
    ];

    if (categoryId !== undefined) {
      if (categoryId === null) {
        conditions.push(sql`${documents.categoryId} IS NULL`);
      } else {
        conditions.push(eq(documents.categoryId, categoryId));
      }
    }

    if (q) {
      conditions.push(ilike(documents.title, `%${q}%`));
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
    const rows = await db
      .select()
      .from(documents)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return {
      documents: rows,
      total,
      page,
    };
  }

  async function update(documentId: string, workspaceId: string, data: UpdateData) {
    const [existing] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, workspaceId),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!existing) {
      throw notFound('Document not found');
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      updates.title = data.title;
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
        documentId,
        version: newVersion,
        content: data.content!,
      });

      // FIFO: keep max MAX_VERSIONS, delete oldest
      const allVersions = await db
        .select({ id: documentVersions.id, version: documentVersions.version })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
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
      .where(eq(documents.id, documentId))
      .returning();

    logger.info('Document updated', { documentId, workspaceId });

    return updated;
  }

  async function getVersions(documentId: string, workspaceId: string) {
    // Verify document exists in workspace
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, workspaceId),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    const versions = await db
      .select({
        id: documentVersions.id,
        version: documentVersions.version,
        createdAt: documentVersions.createdAt,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version));

    return versions;
  }

  return { create, getById, list, update, getVersions };
}
