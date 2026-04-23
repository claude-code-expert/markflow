import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { createExportService } from '../../../../../../../../lib/server/services/export-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const format = request.nextUrl.searchParams.get('format') ?? 'md';

    const db = getDb();
    const exportService = createExportService(db);

    if (format === 'html') {
      const { content, filename } = await exportService.exportDocumentHtml(docId, id);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    const { content, filename } = await exportService.exportDocument(docId, id);
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
