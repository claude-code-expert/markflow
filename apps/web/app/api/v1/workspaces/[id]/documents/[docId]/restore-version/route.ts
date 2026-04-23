import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../../../lib/server/utils/errors';
import { createDocumentService } from '../../../../../../../../lib/server/services/document-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const { versionNum } = await request.json();

    if (!Number.isInteger(versionNum) || versionNum < 1) {
      throw badRequest('INVALID_VERSION', 'versionNum must be a positive integer');
    }

    const documentService = createDocumentService(getDb());
    const result = await documentService.restoreVersion(docId, id, versionNum, currentUser.userId);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
