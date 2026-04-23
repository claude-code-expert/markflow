import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createTrashService } from '../../../../../../lib/server/services/trash-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const trashService = createTrashService(db);

    const documents = await trashService.list(id);

    return NextResponse.json({ documents });
  } catch (error) {
    return handleApiError(error);
  }
}
