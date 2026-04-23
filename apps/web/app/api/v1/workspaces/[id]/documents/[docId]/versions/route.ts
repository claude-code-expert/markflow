import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { createDocumentService } from '../../../../../../../../lib/server/services/document-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const documentService = createDocumentService(getDb());
    const versions = await documentService.getVersions(docId, id);

    return NextResponse.json({ versions });
  } catch (error) {
    return handleApiError(error);
  }
}
