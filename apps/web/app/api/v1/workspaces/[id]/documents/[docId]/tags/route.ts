import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../../lib/server/utils/errors';
import { createTagService } from '../../../../../../../../lib/server/services/tag-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const tagService = createTagService(db);

    const tags = await tagService.getDocumentTags(docId);

    return NextResponse.json({ tags });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const { tags } = await request.json();

    if (!Array.isArray(tags)) {
      throw badRequest('INVALID_TAGS', 'tags must be an array');
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw badRequest('INVALID_TAG', 'Each tag must be a non-empty string');
      }
      if (tag.length > 50) {
        throw badRequest('TAG_TOO_LONG', 'Each tag must be at most 50 characters');
      }
    }

    const tagNames = tags.map((t: string) => t.trim());

    const db = getDb();
    const tagService = createTagService(db);

    const result = await tagService.setDocumentTags(docId, id, tagNames);

    return NextResponse.json({ tags: result });
  } catch (error) {
    return handleApiError(error);
  }
}
