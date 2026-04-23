import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../lib/server/utils/errors';
import { createJoinRequestService } from '../../../../../../../lib/server/services/join-request-service';

const VALID_ROLES = ['admin', 'editor', 'viewer'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const { id, requestId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const { action, role } = await request.json();

    const db = getDb();
    const joinRequestService = createJoinRequestService(db);

    if (action === 'approve') {
      if (!VALID_ROLES.includes(role)) {
        throw badRequest('INVALID_ROLE', 'Role must be one of: admin, editor, viewer');
      }
      await joinRequestService.approve(requestId, currentUser.userId, role);
    } else if (action === 'reject') {
      await joinRequestService.reject(requestId, currentUser.userId);
    } else {
      throw badRequest('INVALID_ACTION', 'Action must be "approve" or "reject"');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
