import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../lib/server/utils/errors';
import { createDocumentService } from '../../../../../../lib/server/services/document-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const { searchParams } = request.nextUrl;
    const categoryId = searchParams.get('categoryId') ?? undefined;
    const sort = (searchParams.get('sort') as 'title' | 'updatedAt' | 'createdAt') ?? undefined;
    const order = (searchParams.get('order') as 'asc' | 'desc') ?? undefined;
    const q = searchParams.get('q') ?? undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    const documentService = createDocumentService(getDb());
    const result = await documentService.list(id, {
      categoryId,
      sort,
      order,
      q,
      page,
      limit,
      currentUserId: currentUser.userId,
    });

    return NextResponse.json(result);
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

    const { title, content, categoryId, status } = await request.json();

    if (!title || typeof title !== 'string') {
      throw badRequest('MISSING_TITLE', 'title is required');
    }
    if (title.trim().length > 300) {
      throw badRequest('TITLE_TOO_LONG', 'title must be 300 characters or less');
    }
    if (status !== undefined && status !== 'draft' && status !== 'published') {
      throw badRequest('INVALID_STATUS', 'status must be "draft" or "published"');
    }

    const documentService = createDocumentService(getDb());
    const document = await documentService.create(
      id,
      currentUser.userId,
      title.trim(),
      content ?? '',
      categoryId,
      status,
    );

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
