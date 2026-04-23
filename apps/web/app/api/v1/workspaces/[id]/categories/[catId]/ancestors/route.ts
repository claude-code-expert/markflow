import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { createCategoryService } from '../../../../../../../../lib/server/services/category-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> },
) {
  try {
    const { id, catId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const categoryService = createCategoryService(getDb());
    const ancestors = await categoryService.ancestors(catId, id);

    return NextResponse.json({ ancestors });
  } catch (error) {
    return handleApiError(error);
  }
}
