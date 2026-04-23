import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../../../lib/server/middleware';
import { createExportService } from '../../../../../../../../lib/server/services/export-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> },
) {
  try {
    const { id, catId } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const exportService = createExportService(db);

    const { buffer, filename } = await exportService.exportCategory(catId, id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
