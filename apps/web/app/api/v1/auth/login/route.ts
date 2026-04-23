import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError } from '../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../lib/server/services/auth-service';
import { badRequest } from '../../../../../lib/server/utils/errors';

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
    const { email, password, rememberMe } = await request.json();
    if (!email || !password) {
      throw badRequest('MISSING_FIELDS', 'email and password are required');
    }

    const authService = createAuthService(getDb());
    const result = await authService.login(email, password, rememberMe ?? false);

    const response = NextResponse.json(
      { accessToken: result.accessToken, user: result.user },
      { status: 200 },
    );

    response.cookies.set('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
