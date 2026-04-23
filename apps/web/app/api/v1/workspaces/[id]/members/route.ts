import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createMemberService } from '../../../../../../lib/server/services/member-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const memberService = createMemberService(db);
    const members = await memberService.list(id);

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}
