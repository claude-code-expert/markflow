import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../lib/server/utils/errors';
import { createCategoryService } from '../../../../../../../lib/server/services/category-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> },
) {
  try {
    const { id, catId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      throw badRequest('MISSING_NAME', 'name is required');
    }
    if (name.trim().length > 100) {
      throw badRequest('NAME_TOO_LONG', 'name must be 100 characters or less');
    }

    const categoryService = createCategoryService(getDb());
    const category = await categoryService.rename(catId, id, name.trim());

    return NextResponse.json({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> },
) {
  try {
    const { id, catId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const categoryService = createCategoryService(getDb());
    await categoryService.remove(catId, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
