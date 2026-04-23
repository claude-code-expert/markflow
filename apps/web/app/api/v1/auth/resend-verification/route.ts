import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError } from '../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../lib/server/services/auth-service';
import { badRequest } from '../../../../../lib/server/utils/errors';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      throw badRequest('MISSING_FIELDS', 'email is required');
    }

    const authService = createAuthService(getDb());
    const result = await authService.resendVerification(email);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
