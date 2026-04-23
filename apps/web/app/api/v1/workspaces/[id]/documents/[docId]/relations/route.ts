import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../../lib/server/utils/errors';
import { createRelationService } from '../../../../../../../../lib/server/services/relation-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const relationService = createRelationService(db);

    const result = await relationService.getRelations(docId);

    return NextResponse.json(result);
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

    const { prev, next, related } = await request.json();

    if (prev !== undefined && typeof prev !== 'string') {
      throw badRequest('INVALID_PREV', 'prev must be a string');
    }
    if (next !== undefined && typeof next !== 'string') {
      throw badRequest('INVALID_NEXT', 'next must be a string');
    }
    if (related !== undefined && !Array.isArray(related)) {
      throw badRequest('INVALID_RELATED', 'related must be an array');
    }

    const db = getDb();
    const relationService = createRelationService(db);

    const result = await relationService.setRelations(docId, id, { prev, next, related });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
