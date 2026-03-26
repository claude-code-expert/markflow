import {
  documentRelations,
  documents,
  eq,
  and,
} from '@markflow/db';
import type { Db } from '@markflow/db';

interface GraphNode {
  id: string;
  title: string;
  categoryId: string | null;
}

interface GraphEdge {
  source: string;
  target: string;
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
          eq(documents.workspaceId, workspaceId),
          eq(documents.isDeleted, false),
        ),
      );

    const docIds = new Set(docs.map((d) => d.id));

    const nodes: GraphNode[] = docs.map((d) => ({
      id: d.id,
      title: d.title,
      categoryId: d.categoryId,
    }));

    // Fetch all relations involving these documents
    if (docs.length === 0) {
      return { nodes: [], edges: [] };
    }

    const allRelations = await db
      .select({
        sourceId: documentRelations.sourceId,
        targetId: documentRelations.targetId,
        type: documentRelations.type,
      })
      .from(documentRelations);

    // Filter to only include edges where both source and target are in this workspace
    const edges: GraphEdge[] = [];
    for (const rel of allRelations) {
      if (docIds.has(rel.sourceId) && docIds.has(rel.targetId)) {
        edges.push({
          source: rel.sourceId,
          target: rel.targetId,
          type: rel.type as 'prev' | 'next' | 'related',
        });
      }
    }

    return { nodes, edges };
  }

  return { getWorkspaceGraph };
}
