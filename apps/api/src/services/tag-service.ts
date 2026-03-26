import {
  tags,
  documentTags,
  documents,
  eq,
  and,
  sql,
  inArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const MAX_TAGS = 30;

export function createTagService(db: Db) {
  /**
   * Replace all tags for a document.
   * Upserts tags by (workspace_id, name) and sets the document_tags join table.
   */
  async function setDocumentTags(
    documentId: string,
    workspaceId: string,
    tagNames: string[],
  ) {
    // Validate max tags
    if (tagNames.length > MAX_TAGS) {
      throw badRequest('TOO_MANY_TAGS', `Maximum ${MAX_TAGS} tags allowed per document`);
    }

    // Deduplicate and trim
    const uniqueNames = [...new Set(tagNames.map((n) => n.trim()).filter((n) => n.length > 0))];

    // Remove all existing document_tags for this document
    await db
      .delete(documentTags)
      .where(eq(documentTags.documentId, documentId));

    if (uniqueNames.length === 0) {
      return [];
    }

    // Upsert tags: find existing or create new
    const tagRows: Array<{ id: string; name: string }> = [];

    for (const name of uniqueNames) {
      // Try to find existing tag in workspace
      const [existing] = await db
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(and(
          eq(tags.workspaceId, workspaceId),
          eq(tags.name, name),
        ))
        .limit(1);

      if (existing) {
        tagRows.push(existing);
      } else {
        // Create new tag
        const [created] = await db
          .insert(tags)
          .values({ workspaceId, name })
          .returning({ id: tags.id, name: tags.name });

        if (created) {
          tagRows.push(created);
        }
      }
    }

    // Insert document_tags
    if (tagRows.length > 0) {
      await db
        .insert(documentTags)
        .values(tagRows.map((t) => ({
          documentId,
          tagId: t.id,
        })));
    }

    logger.info('Document tags updated', { documentId, tagCount: tagRows.length });

    return tagRows;
  }

  /**
   * List all tags in a workspace with document counts.
   */
  async function listWorkspaceTags(workspaceId: string) {
    const rows = await db
      .select({
        id: tags.id,
        name: tags.name,
        documentCount: sql<number>`COUNT(${documentTags.documentId})`.as('document_count'),
      })
      .from(tags)
      .leftJoin(documentTags, eq(documentTags.tagId, tags.id))
      .where(eq(tags.workspaceId, workspaceId))
      .groupBy(tags.id, tags.name)
      .orderBy(tags.name);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      documentCount: Number(r.documentCount),
    }));
  }

  /**
   * Get tags for a specific document.
   */
  async function getDocumentTags(documentId: string) {
    const rows = await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(documentTags)
      .innerJoin(tags, eq(tags.id, documentTags.tagId))
      .where(eq(documentTags.documentId, documentId))
      .orderBy(tags.name);

    return rows;
  }

  return { setDocumentTags, listWorkspaceTags, getDocumentTags };
}
