import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../lib/server/utils/errors';
import { createDocumentService } from '../../../../../../../lib/server/services/document-service';
import { createTrashService } from '../../../../../../../lib/server/services/trash-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const documentService = createDocumentService(getDb());
    const document = await documentService.getById(docId, id, currentUser.userId);

    return NextResponse.json({ document });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    const member = await checkRole(currentUser, id, 'editor');

    const { content, title, categoryId, status } = await request.json();

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        throw badRequest('INVALID_TITLE', 'title must be a non-empty string');
      }
      if (title.trim().length > 300) {
        throw badRequest('TITLE_TOO_LONG', 'title must be 300 characters or less');
      }
    }
    if (status !== undefined && status !== 'draft' && status !== 'published') {
      throw badRequest('INVALID_STATUS', 'status must be "draft" or "published"');
    }

    const isAdminOrOwner = member.role === 'admin' || member.role === 'owner';

    const documentService = createDocumentService(getDb());
    const document = await documentService.update(
      docId,
      id,
      { content, title, categoryId, status },
      currentUser.userId,
      isAdminOrOwner,
    );

    return NextResponse.json({ document });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const trashService = createTrashService(getDb());
    await trashService.softDelete(docId, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
