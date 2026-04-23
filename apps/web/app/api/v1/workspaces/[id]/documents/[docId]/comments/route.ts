import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../../lib/server/utils/errors';
import { createCommentService } from '../../../../../../../../lib/server/services/comment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const commentService = createCommentService(db);

    const comments = await commentService.list(docId, id);

    return NextResponse.json({ comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const { content, parentId } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw badRequest('INVALID_CONTENT', 'Content is required');
    }
    if (content.length > 5000) {
      throw badRequest('CONTENT_TOO_LONG', 'Content must be at most 5000 characters');
    }

    const db = getDb();
    const commentService = createCommentService(db);

    const comment = await commentService.create(docId, id, currentUser.userId, content.trim(), parentId);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
