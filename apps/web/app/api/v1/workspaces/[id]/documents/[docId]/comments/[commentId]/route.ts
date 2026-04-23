import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../../../lib/server/utils/errors';
import { createCommentService } from '../../../../../../../../../lib/server/services/comment-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string; commentId: string }> },
) {
  try {
    const { id, commentId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const body = await request.json();
    const { content, resolved } = body;

    const db = getDb();
    const commentService = createCommentService(db);

    let comment;

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw badRequest('INVALID_CONTENT', 'Content must be a non-empty string');
      }
      if (content.length > 5000) {
        throw badRequest('CONTENT_TOO_LONG', 'Content must be at most 5000 characters');
      }
      comment = await commentService.update(commentId, id, currentUser.userId, content.trim());
    } else if (resolved !== undefined) {
      comment = await commentService.toggleResolved(commentId, id, currentUser.userId);
    } else {
      throw badRequest('MISSING_FIELDS', 'Either content or resolved must be provided');
    }

    return NextResponse.json({ comment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string; commentId: string }> },
) {
  try {
    const { id, commentId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const db = getDb();
    const commentService = createCommentService(db);

    await commentService.remove(commentId, id, currentUser.userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
