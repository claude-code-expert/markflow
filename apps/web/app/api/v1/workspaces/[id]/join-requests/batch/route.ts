import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../lib/server/utils/errors';
import { createJoinRequestService } from '../../../../../../../lib/server/services/join-request-service';

const VALID_ROLES = ['admin', 'editor', 'viewer'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const { requestIds, role } = await request.json();

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      throw badRequest('INVALID_REQUEST_IDS', 'requestIds must be a non-empty array');
    }

    if (!VALID_ROLES.includes(role)) {
      throw badRequest('INVALID_ROLE', 'Role must be one of: admin, editor, viewer');
    }

    const db = getDb();
    const joinRequestService = createJoinRequestService(db);

    const result = await joinRequestService.batchApprove(requestIds, currentUser.userId, role);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
