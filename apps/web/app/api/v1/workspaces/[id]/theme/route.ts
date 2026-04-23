import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createThemeService } from '../../../../../../lib/server/services/theme-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'viewer');

    const db = getDb();
    const themeService = createThemeService(db);

    const result = await themeService.getTheme(id);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const { preset, css } = await request.json();

    const db = getDb();
    const themeService = createThemeService(db);

    const result = await themeService.updateTheme(id, preset, css);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
