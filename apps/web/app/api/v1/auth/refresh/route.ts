import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError } from '../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../lib/server/services/auth-service';
import { badRequest } from '../../../../../lib/server/utils/errors';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
      throw badRequest('MISSING_TOKEN', 'Refresh token cookie is required');
    }

    const authService = createAuthService(getDb());
    const result = await authService.refresh(refreshToken);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
