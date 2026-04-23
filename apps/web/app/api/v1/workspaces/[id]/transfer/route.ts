import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createWorkspaceService } from '../../../../../../lib/server/services/workspace-service';
import { badRequest } from '../../../../../../lib/server/utils/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'owner');

    const { newOwnerId } = await request.json();
    if (!newOwnerId) {
      throw badRequest('MISSING_NEW_OWNER', 'newOwnerId is required');
    }

    const db = getDb();
    const workspaceService = createWorkspaceService(db);
    await workspaceService.transferOwnership(id, currentUser.userId, String(newOwnerId));

    return NextResponse.json({ transferred: true });
  } catch (error) {
    return handleApiError(error);
  }
}
