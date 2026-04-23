import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { badRequest } from '../../../../../../lib/server/utils/errors';
import { createImportService } from '../../../../../../lib/server/services/import-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'editor');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      throw badRequest('MISSING_FILE', 'A file must be uploaded');
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const categoryId = request.nextUrl.searchParams.get('categoryId');

    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext !== 'md' && ext !== 'html') {
      throw badRequest('INVALID_FILE_TYPE', 'Only .md and .html files are supported');
    }

    const db = getDb();
    const importService = createImportService(db);

    const userId = currentUser.userId;
    const content = buffer.toString('utf-8');

    let document;
    if (ext === 'md') {
      document = await importService.importMarkdown(id, userId, filename, content, categoryId);
    } else {
      document = await importService.importHtml(id, userId, filename, content, categoryId);
    }

    return NextResponse.json({
      imported: 1,
      documents: [{ id: document.id, title: document.title, categoryId: document.categoryId }],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
