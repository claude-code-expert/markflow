import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError, extractCurrentUser } from '../../../../../lib/server/middleware';
import { createWorkspaceService } from '../../../../../lib/server/services/workspace-service';

export async function GET(request: NextRequest) {
  try {
    const currentUser = extractCurrentUser(request);
    const db = getDb();
    const workspaceService = createWorkspaceService(db);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));

    const result = await workspaceService.listPublicWorkspaces(
      currentUser.userId,
      q,
      page,
      limit,
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
