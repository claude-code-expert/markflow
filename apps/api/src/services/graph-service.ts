import {
  documentRelations,
  documents,
  categories,
  tags,
  documentTags,
  eq,
  and,
  inArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound } from '../utils/errors.js';
import { draftVisibilityClause } from './document-visibility.js';

interface GraphNode {
  id: number;
  title: string;
  categoryId: number | null;
}

interface GraphEdge {
  source: number;
  target: number;
  type: 'prev' | 'next' | 'related';
}

interface WorkspaceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function createGraphService(db: Db) {
  async function getWorkspaceGraph(workspaceId: string, currentUserId?: string): Promise<WorkspaceGraph> {
    // Fetch all non-deleted documents in the workspace
    const docs = await db
      .select({
        id: documents.id,
        title: documents.title,
        categoryId: documents.categoryId,
      })
      .from(documents)
      .where(
        and(
          eq(documents.workspaceId, Number(workspaceId)),
          eq(documents.isDeleted, false),
          draftVisibilityClause(currentUserId),
        ),
      );

    const nodes: GraphNode[] = docs.map((d) => ({
      id: d.id,
      title: d.title,
      categoryId: d.categoryId,
    }));

    // Guard: empty workspace returns empty graph (no DB query needed)
    if (docs.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Fetch only relations where both source and target belong to this workspace
    const docIdArray = docs.map((d) => d.id);
    const relations = await db
      .select({
        sourceId: documentRelations.sourceId,
        targetId: documentRelations.targetId,
        type: documentRelations.type,
      })
      .from(documentRelations)
      .where(
        and(
          inArray(documentRelations.sourceId, docIdArray),
          inArray(documentRelations.targetId, docIdArray),
        ),
      );

    const edges: GraphEdge[] = relations.map((rel) => ({
      source: rel.sourceId,
      target: rel.targetId,
      type: rel.type as 'prev' | 'next' | 'related',
    }));

    return { nodes, edges };
  }

  async function getDocumentContext(docId: string, workspaceId: string, currentUserId?: string) {
    const numDocId = Number(docId);
    const numWorkspaceId = Number(workspaceId);
    const draftFilter = draftVisibilityClause(currentUserId);

    // Step 1: Verify document exists in the given workspace and is not deleted
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.id, numDocId),
          eq(documents.workspaceId, numWorkspaceId),
          eq(documents.isDeleted, false),
          draftFilter,
        ),
      )
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    // Step 2: Outgoing relations (this document is source)
    const outgoingRows = await db
      .select({
        type: documentRelations.type,
        docId: documents.id,
        docTitle: documents.title,
        categoryId: documents.categoryId,
        categoryName: categories.name,
      })
      .from(documentRelations)
      .innerJoin(
        documents,
        and(
          eq(documentRelations.targetId, documents.id),
          eq(documents.isDeleted, false),
          draftFilter,
        ),
      )
      .leftJoin(categories, eq(documents.categoryId, categories.id))
      .where(eq(documentRelations.sourceId, numDocId));

    // Step 3: Incoming relations (this document is target)
    const incomingRows = await db
      .select({
        type: documentRelations.type,
        docId: documents.id,
        docTitle: documents.title,
        categoryId: documents.categoryId,
        categoryName: categories.name,
      })
      .from(documentRelations)
      .innerJoin(
        documents,
        and(
          eq(documentRelations.sourceId, documents.id),
          eq(documents.isDeleted, false),
          draftFilter,
        ),
      )
      .leftJoin(categories, eq(documents.categoryId, categories.id))
      .where(eq(documentRelations.targetId, numDocId));

    // Step 4: Batch-fetch tags for all related documents (N+1 prevention)
    const relatedDocIds = [
      ...new Set([
        ...outgoingRows.map((r) => r.docId),
        ...incomingRows.map((r) => r.docId),
      ]),
    ];

    const tagMap = new Map<number, string[]>();
    if (relatedDocIds.length > 0) {
      const tagRows = await db
        .select({
          documentId: documentTags.documentId,
          tagName: tags.name,
        })
        .from(documentTags)
        .innerJoin(tags, eq(documentTags.tagId, tags.id))
        .where(inArray(documentTags.documentId, relatedDocIds));

      for (const row of tagRows) {
        const existing = tagMap.get(row.documentId) ?? [];
        existing.push(row.tagName);
        tagMap.set(row.documentId, existing);
      }
    }

    // Step 5: Assemble result
    function toContextRelation(row: {
      type: string;
      docId: number;
      docTitle: string;
      categoryId: number | null;
      categoryName: string | null;
    }) {
      return {
        type: row.type,
        document: {
          id: row.docId,
          title: row.docTitle,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          tags: tagMap.get(row.docId) ?? [],
        },
      };
    }

    return {
      incoming: incomingRows.map(toContextRelation),
      outgoing: outgoingRows.map(toContextRelation),
    };
  }

  return { getWorkspaceGraph, getDocumentContext };
}
