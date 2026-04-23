import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../lib/server/utils/errors';
import { createInvitationService } from '../../../../../../lib/server/services/invitation-service';

const VALID_ROLES = ['admin', 'editor', 'viewer'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const { email, role } = await request.json();

    if (!email || typeof email !== 'string') {
      throw badRequest('INVALID_EMAIL', 'Email is required');
    }

    if (!VALID_ROLES.includes(role)) {
      throw badRequest('INVALID_ROLE', 'Role must be one of: admin, editor, viewer');
    }

    const db = getDb();
    const invitationService = createInvitationService(db);

    const invitation = await invitationService.create(id, currentUser.userId, email, role);

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
