import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError } from '../../../../../lib/server/middleware';
import { createInvitationService } from '../../../../../lib/server/services/invitation-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const db = getDb();
    const invitationService = createInvitationService(db);

    const invitation = await invitationService.getByToken(token);

    return NextResponse.json({ invitation });
  } catch (error) {
    return handleApiError(error);
  }
}
