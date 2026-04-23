import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/server/db';
import { handleApiError, extractCurrentUser } from '../../../../lib/server/middleware';
import { createWorkspaceService } from '../../../../lib/server/services/workspace-service';
import { badRequest } from '../../../../lib/server/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const currentUser = extractCurrentUser(request);
    const db = getDb();
    const workspaceService = createWorkspaceService(db);

    const workspaces = await workspaceService.listForUser(currentUser.userId);

    return NextResponse.json({ workspaces });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = extractCurrentUser(request);
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw badRequest('INVALID_NAME', 'Workspace name is required');
    }

    const db = getDb();
    const workspaceService = createWorkspaceService(db);

    const workspace = await workspaceService.create(currentUser.userId, name.trim());

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
