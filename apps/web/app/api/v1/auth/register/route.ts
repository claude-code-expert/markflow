import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError } from '../../../../../lib/server/middleware';
import { createAuthService } from '../../../../../lib/server/services/auth-service';
import { badRequest } from '../../../../../lib/server/utils/errors';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password || !name) {
      throw badRequest('MISSING_FIELDS', 'email, password, and name are required');
    }

    const authService = createAuthService(getDb());
    const result = await authService.register(email, password, name);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
