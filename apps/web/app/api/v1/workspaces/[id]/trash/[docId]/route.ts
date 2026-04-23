import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { createTrashService } from '../../../../../../../lib/server/services/trash-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const db = getDb();
    const trashService = createTrashService(db);

    await trashService.permanentDelete(docId, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
