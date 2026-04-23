import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../lib/server/utils/errors';
import { createCategoryService } from '../../../../../../lib/server/services/category-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const categoryService = createCategoryService(getDb());
    const categories = await categoryService.list(id);

    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const { name, parentId } = await request.json();

    if (!name || typeof name !== 'string') {
      throw badRequest('MISSING_NAME', 'name is required');
    }
    if (name.trim().length > 100) {
      throw badRequest('NAME_TOO_LONG', 'name must be 100 characters or less');
    }

    const categoryService = createCategoryService(getDb());
    const category = await categoryService.create(id, name.trim(), parentId);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
