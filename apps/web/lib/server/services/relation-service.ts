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
   * Cycle detection for the prev/next chain.
   *
   * Builds the FUTURE 'next' graph that will exist after `setRelations` finishes:
   *   1. Load all current 'next' edges and drop the ones adjacent to `docId`.
   *      Those edges are about to be removed by the deletion step (source=docId
   *      for any type, or target=docId for type IN ('prev','next')), so they
   *      must not influence detection — otherwise re-saving an existing prev /
   *      next value triggers a false positive via the bidirectional pair.
   *   2. Add the new 'next' edges introduced by this update:
   *        - data.next  → direct edge docId → data.next
   *        - data.prev  → bidirectional edge data.prev → docId
   *
   * Then walk the chain starting from `docId`. If it returns to `docId`,
   * a cycle exists.
   */
  async function detectCycle(
    docId: string,
    data: SetRelationsInput,
  ): Promise<boolean> {
    const numDocId = Number(docId);

    const surviving = await db
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

    const nextMap = new Map<number, number>();
    for (const rel of surviving) {
      nextMap.set(rel.sourceId, rel.targetId);
    }
    if (data.next) {
      nextMap.set(numDocId, Number(data.next));
    }
    if (data.prev) {
      nextMap.set(Number(data.prev), numDocId);
    }

    let current: number | null = nextMap.get(numDocId) ?? null;
    const visited = new Set<number>();
    while (current !== null) {
      if (current === numDocId) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = nextMap.get(current) ?? null;
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

    // Cycle detection BEFORE clearing existing relations.
    // detectCycle simulates the future graph (current edges minus the ones
    // adjacent to this doc, plus the new prev/next edges this update introduces).
    if (data.prev || data.next) {
      const hasCycle = await detectCycle(docId, data);
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
