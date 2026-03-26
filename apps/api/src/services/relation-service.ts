import {
  documentRelations,
  documents,
  eq,
  and,
  or,
  inArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface SetRelationsInput {
  prev?: string;
  next?: string;
  related?: string[];
}

interface RelationDoc {
  id: string;
  title: string;
}

interface RelationsResult {
  prev: RelationDoc | null;
  next: RelationDoc | null;
  related: RelationDoc[];
}

export function createRelationService(db: Db) {
  /**
   * Validate that all target document IDs exist and belong to the given workspace.
   */
  async function validateTargets(targetIds: string[], workspaceId: string): Promise<void> {
    if (targetIds.length === 0) return;

    const unique = [...new Set(targetIds)];
    const found = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          inArray(documents.id, unique),
          eq(documents.workspaceId, workspaceId),
          eq(documents.isDeleted, false),
        ),
      );

    const foundIds = new Set(found.map((d) => d.id));
    for (const id of unique) {
      if (!foundIds.has(id)) {
        throw notFound(`Target document ${id} not found in workspace`);
      }
    }
  }

  /**
   * DFS cycle detection for prev/next chain.
   * Starting from `startId`, follows `next` relations and checks if we reach `targetId`.
   * Also checks the reverse direction: from `targetId` following `next` relations.
   */
  async function detectCycle(
    docId: string,
    targetId: string,
    direction: 'prev' | 'next',
  ): Promise<boolean> {
    // If setting A.prev = B, the chain is B -> A.
    // We need to check that A's "next" chain doesn't eventually reach B.
    // If setting A.next = B, the chain is A -> B.
    // We need to check that B's "next" chain doesn't eventually reach A.

    // For prev: docId.prev = targetId means targetId -> docId
    // Check if following docId's next chain reaches targetId
    // For next: docId.next = targetId means docId -> targetId
    // Check if following targetId's next chain reaches docId

    const startNode = direction === 'prev' ? docId : targetId;
    const searchFor = direction === 'prev' ? targetId : docId;

    const visited = new Set<string>();
    let current = startNode;

    while (current) {
      if (visited.has(current)) break;
      visited.add(current);

      const [rel] = await db
        .select({ targetId: documentRelations.targetId })
        .from(documentRelations)
        .where(
          and(
            eq(documentRelations.sourceId, current),
            eq(documentRelations.type, 'next'),
          ),
        )
        .limit(1);

      if (!rel) break;

      if (rel.targetId === searchFor) {
        return true; // cycle detected
      }

      current = rel.targetId;
    }

    // Also check prev chain in reverse
    const visited2 = new Set<string>();
    let current2 = searchFor;

    while (current2) {
      if (visited2.has(current2)) break;
      visited2.add(current2);

      const [rel] = await db
        .select({ targetId: documentRelations.targetId })
        .from(documentRelations)
        .where(
          and(
            eq(documentRelations.sourceId, current2),
            eq(documentRelations.type, 'next'),
          ),
        )
        .limit(1);

      if (!rel) break;

      if (rel.targetId === startNode) {
        return true; // cycle detected
      }

      current2 = rel.targetId;
    }

    return false;
  }

  async function setRelations(
    docId: string,
    workspaceId: string,
    data: SetRelationsInput,
  ): Promise<RelationsResult> {
    // Validate the document itself exists
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.id, docId),
          eq(documents.workspaceId, workspaceId),
          eq(documents.isDeleted, false),
        ),
      )
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    // Collect all target IDs
    const targetIds: string[] = [];
    if (data.prev) targetIds.push(data.prev);
    if (data.next) targetIds.push(data.next);
    if (data.related) targetIds.push(...data.related);

    // Self-reference check
    for (const tid of targetIds) {
      if (tid === docId) {
        throw badRequest('SELF_REFERENCE', 'A document cannot reference itself');
      }
    }

    // Validate all targets exist in the workspace
    await validateTargets(targetIds, workspaceId);

    // Related docs max 20 limit
    if (data.related && data.related.length > 20) {
      throw badRequest('TOO_MANY_RELATED_DOCS', 'Maximum 20 related documents allowed');
    }

    // Cycle detection for prev/next
    if (data.prev) {
      // We want to set docId.prev = data.prev, which means data.prev -> docId
      // Check: does following docId's next chain reach data.prev?
      const hasCycle = await detectCycle(docId, data.prev, 'prev');
      if (hasCycle) {
        throw badRequest('CIRCULAR_REFERENCE', 'Setting this relation would create a circular reference');
      }
    }

    if (data.next) {
      // We want to set docId.next = data.next, which means docId -> data.next
      // Check: does following data.next's next chain reach docId?
      const hasCycle = await detectCycle(docId, data.next, 'next');
      if (hasCycle) {
        throw badRequest('CIRCULAR_REFERENCE', 'Setting this relation would create a circular reference');
      }
    }

    // prev and next cannot point to the same document
    if (data.prev && data.next && data.prev === data.next) {
      throw badRequest('INVALID_RELATION', 'prev and next cannot point to the same document');
    }

    // Clear existing relations for this document (both as source and bidirectional next/prev)
    // 1. Delete all relations where this doc is source
    await db
      .delete(documentRelations)
      .where(eq(documentRelations.sourceId, docId));

    // 2. Delete bidirectional counterparts (where this doc is target for prev/next)
    await db
      .delete(documentRelations)
      .where(
        and(
          eq(documentRelations.targetId, docId),
          or(
            eq(documentRelations.type, 'prev'),
            eq(documentRelations.type, 'next'),
          ),
        ),
      );

    // Insert new relations
    const toInsert: Array<{
      sourceId: string;
      targetId: string;
      type: 'prev' | 'next' | 'related';
    }> = [];

    if (data.prev) {
      // A.prev = B
      toInsert.push({ sourceId: docId, targetId: data.prev, type: 'prev' });
      // Bidirectional: B.next = A
      toInsert.push({ sourceId: data.prev, targetId: docId, type: 'next' });
    }

    if (data.next) {
      // A.next = B
      toInsert.push({ sourceId: docId, targetId: data.next, type: 'next' });
      // Bidirectional: B.prev = A
      toInsert.push({ sourceId: data.next, targetId: docId, type: 'prev' });
    }

    if (data.related) {
      const uniqueRelated = [...new Set(data.related)];
      for (const relatedId of uniqueRelated) {
        toInsert.push({ sourceId: docId, targetId: relatedId, type: 'related' });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(documentRelations).values(toInsert);
    }

    logger.info('Document relations updated', { docId, workspaceId });

    return getRelations(docId);
  }

  async function getRelations(docId: string): Promise<RelationsResult> {
    // Get all relations where this doc is the source
    const rows = await db
      .select({
        type: documentRelations.type,
        targetId: documentRelations.targetId,
      })
      .from(documentRelations)
      .where(eq(documentRelations.sourceId, docId));

    let prevDoc: RelationDoc | null = null;
    let nextDoc: RelationDoc | null = null;
    const relatedDocs: RelationDoc[] = [];

    for (const row of rows) {
      const [target] = await db
        .select({ id: documents.id, title: documents.title })
        .from(documents)
        .where(
          and(
            eq(documents.id, row.targetId),
            eq(documents.isDeleted, false),
          ),
        )
        .limit(1);

      if (!target) continue;

      if (row.type === 'prev') {
        prevDoc = target;
      } else if (row.type === 'next') {
        nextDoc = target;
      } else if (row.type === 'related') {
        relatedDocs.push(target);
      }
    }

    return {
      prev: prevDoc,
      next: nextDoc,
      related: relatedDocs,
    };
  }

  return { setRelations, getRelations };
}
