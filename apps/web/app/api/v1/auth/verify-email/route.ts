import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError } from '../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../lib/server/services/auth-service';
import { badRequest } from '../../../../../lib/server/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      throw badRequest('MISSING_TOKEN', 'token query parameter is required');
    }

    const authService = createAuthService(getDb());
    const result = await authService.verifyEmail(token);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
