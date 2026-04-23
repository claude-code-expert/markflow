import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../lib/server/middleware';
import { createWorkspaceService } from '../../../../../lib/server/services/workspace-service';
import { badRequest } from '../../../../../lib/server/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const workspaceService = createWorkspaceService(db);
    const workspace = await workspaceService.getById(id);

    return NextResponse.json({ workspace });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'owner');

    const { name, isPublic } = await request.json();

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      throw badRequest('INVALID_NAME', 'Workspace name must be a non-empty string');
    }

    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      throw badRequest('INVALID_IS_PUBLIC', 'isPublic must be a boolean');
    }

    const db = getDb();
    const workspaceService = createWorkspaceService(db);
    const workspace = await workspaceService.update(id, { name, isPublic });

    return NextResponse.json({ workspace });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'owner');

    const { confirmName } = await request.json();
    if (!confirmName || typeof confirmName !== 'string') {
      throw badRequest('MISSING_CONFIRM_NAME', 'confirmName is required');
    }

    const db = getDb();
    const workspaceService = createWorkspaceService(db);
    await workspaceService.remove(id, confirmName);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
