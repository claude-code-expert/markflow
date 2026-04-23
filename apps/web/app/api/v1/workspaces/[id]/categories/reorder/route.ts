import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../lib/server/utils/errors';
import { createCategoryService } from '../../../../../../../lib/server/services/category-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      throw badRequest('INVALID_ORDERED_IDS', 'orderedIds must be an array');
    }

    const categoryService = createCategoryService(getDb());
    await categoryService.reorder(id, orderedIds);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
