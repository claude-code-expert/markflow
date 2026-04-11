import {
  documentRelations,
  documents,
  eq,
  and,
  inArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';

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
  async function getWorkspaceGraph(workspaceId: string): Promise<WorkspaceGraph> {
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

  return { getWorkspaceGraph };
}
