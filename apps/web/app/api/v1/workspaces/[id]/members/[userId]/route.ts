import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { createMemberService } from '../../../../../../../lib/server/services/member-service';
import { badRequest } from '../../../../../../../lib/server/utils/errors';

const VALID_ROLES = new Set(['admin', 'editor', 'viewer']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const { role } = await request.json();
    if (!role || !VALID_ROLES.has(role)) {
      throw badRequest('INVALID_ROLE', 'Role must be one of: admin, editor, viewer');
    }

    const db = getDb();
    const memberService = createMemberService(db);
    const member = await memberService.updateRole(id, userId, role);

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const db = getDb();
    const memberService = createMemberService(db);
    await memberService.remove(id, userId, currentUser.userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
