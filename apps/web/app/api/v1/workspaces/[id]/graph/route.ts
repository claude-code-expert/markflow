import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createGraphService } from '../../../../../../lib/server/services/graph-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const graphService = createGraphService(db);

    const graph = await graphService.getWorkspaceGraph(id, currentUser.userId);

    return NextResponse.json(graph);
  } catch (error) {
    return handleApiError(error);
  }
}
