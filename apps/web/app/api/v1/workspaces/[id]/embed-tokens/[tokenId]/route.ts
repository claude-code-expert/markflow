import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { createEmbedTokenService } from '../../../../../../../lib/server/services/embed-token-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> },
) {
  try {
    const { id, tokenId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const db = getDb();
    const embedTokenService = createEmbedTokenService(db);

    await embedTokenService.revoke(Number(id), Number(tokenId));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
