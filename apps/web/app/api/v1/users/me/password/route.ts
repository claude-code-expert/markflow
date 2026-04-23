import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/server/db';
import { handleApiError, extractCurrentUser } from '../../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../../lib/server/services/auth-service';
import { badRequest } from '../../../../../../lib/server/utils/errors';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function PUT(request: NextRequest) {
  try {
    const currentUser = extractCurrentUser(request);
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      throw badRequest('MISSING_FIELDS', 'currentPassword and newPassword are required');
    }

    const db = getDb();
    const authService = createAuthService(db);
    const result = await authService.changePassword(
      Number(currentUser.userId),
      currentPassword,
      newPassword,
    );

    const response = NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/v1/auth',
      secure: IS_PRODUCTION,
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
