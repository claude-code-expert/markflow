import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser } from '../../../../../../lib/server/middleware';
import { createInvitationService } from '../../../../../../lib/server/services/invitation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const currentUser = extractCurrentUser(request);

    const db = getDb();
    const invitationService = createInvitationService(db);

    const result = await invitationService.accept(token, currentUser.userId);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
