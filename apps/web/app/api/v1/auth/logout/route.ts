import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError, extractCurrentUser } from '../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../lib/server/services/auth-service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    secure: IS_PRODUCTION,
  };
}

export async function POST(request: NextRequest) {
  try {
    extractCurrentUser(request);

    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (refreshToken) {
      const authService = createAuthService(getDb());
      await authService.logout(refreshToken);
    }

    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete({
      name: 'refreshToken',
      ...getRefreshTokenCookieOptions(),
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
