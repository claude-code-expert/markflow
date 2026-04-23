import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createEmbedTokenService } from '../../../../../../lib/server/services/embed-token-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const { label, scope, expiresAt } = await request.json();

    const db = getDb();
    const embedTokenService = createEmbedTokenService(db);

    const result = await embedTokenService.create(
      Number(id),
      Number(currentUser.userId),
      label,
      scope,
      expiresAt,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);
    await checkRole(currentUser, id, 'admin');

    const db = getDb();
    const embedTokenService = createEmbedTokenService(db);

    const result = await embedTokenService.list(Number(id));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
