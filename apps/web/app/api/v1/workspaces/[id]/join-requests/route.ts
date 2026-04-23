import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser, checkRole } from '../../../../../../lib/server/middleware';
import { createJoinRequestService } from '../../../../../../lib/server/services/join-request-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = extractCurrentUser(request);

    const { message } = await request.json();

    const db = getDb();
    const joinRequestService = createJoinRequestService(db);

    const joinRequest = await joinRequestService.create(id, currentUser.userId, message);

    return NextResponse.json({ joinRequest }, { status: 201 });
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

    const status = request.nextUrl.searchParams.get('status');

    const db = getDb();
    const joinRequestService = createJoinRequestService(db);

    const joinRequests = await joinRequestService.list(id, status ?? undefined);

    return NextResponse.json({ joinRequests });
  } catch (error) {
    return handleApiError(error);
  }
}
