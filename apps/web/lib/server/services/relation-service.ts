import {
  documentRelations,
  documents,
  eq,
  and,
  or,
  ne,
  inArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, notFound } from '../utils/errors';
import { logger } from '../utils/logger';

interface SetRelationsInput {
  prev?: string;
  next?: string;
  related?: string[];
}

interface RelationDoc {
  id: number;
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
    const numUnique = unique.map(Number);
    const found = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          inArray(documents.id, numUnique),
          eq(documents.workspaceId, Number(workspaceId)),
          eq(documents.isDeleted, false),
        ),
      );

    const foundIds = new Set(found.map((d) => d.id));
    for (const id of numUnique) {
      if (!foundIds.has(id)) {
        throw notFound(`Target document ${id} not found in workspace`);
      }
    }
  }

  /**
   * Batch-preload cycle detection for prev/next chain.
   * Loads all 'next' relations once, then traverses in-memory.
   * Starting from `startId`, follows `next` relations and checks if we reach `targetId`.
   * Also checks the reverse direction: from `targetId` following `next` relations.
   */
  async function detectCycle(
    docId: string,
    targetId: string,
    direction: 'prev' | 'next',
  ): Promise<boolean> {
    const numDocId = Number(docId);
    const numTargetId = Number(targetId);
    const startNode = direction === 'prev' ? numDocId : numTargetId;
    const searchFor = direction === 'prev' ? numTargetId : numDocId;

    // Batch preload: load all type='next' relations in a single query.
    // Exclude edges that involve the current document — those will be cleared
    // before the new relations are inserted, so including them produces false
    // positives (e.g. re-saving an existing prev/next value triggers a cycle).
    const nextRelations = await db
      .select({
        sourceId: documentRelations.sourceId,
        targetId: documentRelations.targetId,
      })
      .from(documentRelations)
      .where(
        and(
          eq(documentRelations.type, 'next'),
          ne(documentRelations.sourceId, numDocId),
          ne(documentRelations.targetId, numDocId),
        ),
      );

    // Build Map<sourceId, targetId> for O(1) lookup
    const nextMap = new Map<number, number>();
    for (const rel of nextRelations) {
      nextMap.set(rel.sourceId, rel.targetId);
    }

    // Forward traversal: startNode -> ... -> searchFor?
    const visited = new Set<number>();
    let current: number | null = startNode;
    while (current !== null) {
      if (visited.has(current)) break;
      visited.add(current);
      const next: number | null = nextMap.get(current) ?? null;
      if (next === searchFor) return true;
      current = next;
    }

    // Reverse traversal: searchFor -> ... -> startNode?
    const visited2 = new Set<number>();
    let current2: number | null = searchFor;
    while (current2 !== null) {
      if (visited2.has(current2)) break;
      visited2.add(current2);
      const next: number | null = nextMap.get(current2) ?? null;
      if (next === startNode) return true;
      current2 = next;
    }

    return false;
  }

  async function setRelations(
    docId: string,
    workspaceId: string,
    data: SetRelationsInput,
  ): Promise<RelationsResult> {
    const numDocId = Number(docId);
    // Validate the document itself exists
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.id, numDocId),
          eq(documents.workspaceId, Number(workspaceId)),
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

    // prev and next cannot point to the same document
    if (data.prev && data.next && data.prev === data.next) {
      throw badRequest('INVALID_RELATION', 'prev and next cannot point to the same document');
    }

    // Cycle detection BEFORE clearing existing relations
    // (clearing first removes the edges needed for detection)
    // Temporarily exclude current doc's outgoing relations to avoid false positives
    // from its own existing prev/next, but keep other docs' relations intact.
    if (data.prev) {
      const hasCycle = await detectCycle(docId, data.prev, 'prev');
      if (hasCycle) {
        throw badRequest('CIRCULAR_REFERENCE', 'Setting this relation would create a circular reference');
      }
    }

    if (data.next) {
      const hasCycle = await detectCycle(docId, data.next, 'next');
      if (hasCycle) {
        throw badRequest('CIRCULAR_REFERENCE', 'Setting this relation would create a circular reference');
      }
    }

    // Clear existing relations
    // 1. Delete all relations where this doc is source
    await db
      .delete(documentRelations)
      .where(eq(documentRelations.sourceId, numDocId));

    // 2. Delete bidirectional counterparts (where this doc is target for prev/next)
    await db
      .delete(documentRelations)
      .where(
        and(
          eq(documentRelations.targetId, numDocId),
          or(
            eq(documentRelations.type, 'prev'),
            eq(documentRelations.type, 'next'),
          ),
        ),
      );

    // Insert new relations
    const toInsert: Array<{
      sourceId: number;
      targetId: number;
      type: 'prev' | 'next' | 'related';
    }> = [];

    if (data.prev) {
      const numPrev = Number(data.prev);
      // A.prev = B
      toInsert.push({ sourceId: numDocId, targetId: numPrev, type: 'prev' });
      // Bidirectional: B.next = A
      toInsert.push({ sourceId: numPrev, targetId: numDocId, type: 'next' });
    }

    if (data.next) {
      const numNext = Number(data.next);
      // A.next = B
      toInsert.push({ sourceId: numDocId, targetId: numNext, type: 'next' });
      // Bidirectional: B.prev = A
      toInsert.push({ sourceId: numNext, targetId: numDocId, type: 'prev' });
    }

    if (data.related) {
      const uniqueRelated = [...new Set(data.related)];
      for (const relatedId of uniqueRelated) {
        toInsert.push({ sourceId: numDocId, targetId: Number(relatedId), type: 'related' });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(documentRelations).values(toInsert);
    }

    logger.info('Document relations updated', { docId, workspaceId });

    return getRelations(docId);
  }

  async function getRelations(docId: string): Promise<RelationsResult> {
    // Single JOIN query: fetch relations + target document info in one round-trip
    const rows = await db
      .select({
        type: documentRelations.type,
        targetId: documentRelations.targetId,
        docId: documents.id,
        docTitle: documents.title,
      })
      .from(documentRelations)
      .innerJoin(
        documents,
        and(
          eq(documentRelations.targetId, documents.id),
          eq(documents.isDeleted, false),
        ),
      )
      .where(eq(documentRelations.sourceId, Number(docId)));

    let prevDoc: RelationDoc | null = null;
    let nextDoc: RelationDoc | null = null;
    const relatedDocs: RelationDoc[] = [];

    for (const row of rows) {
      const doc = { id: row.docId, title: row.docTitle };
      if (row.type === 'prev') prevDoc = doc;
      else if (row.type === 'next') nextDoc = doc;
      else if (row.type === 'related') relatedDocs.push(doc);
    }

    return {
      prev: prevDoc,
      next: nextDoc,
      related: relatedDocs,
    };
  }

  return { setRelations, getRelations };
}
