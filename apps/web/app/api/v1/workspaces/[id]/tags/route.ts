import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createTagService } from '../../../../../../lib/server/services/tag-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const tagService = createTagService(db);

    const tags = await tagService.listWorkspaceTags(id);

    return NextResponse.json({ tags });
  } catch (error) {
    return handleApiError(error);
  }
}
