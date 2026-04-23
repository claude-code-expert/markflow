import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, extractCurrentUser } from '../../../../lib/server/middleware';
import { logger } from '../../../../lib/server/utils/logger';

export async function GET(request: NextRequest) {
  try {
    extractCurrentUser(request);

    const uploadSecret = process.env.R2_UPLOAD_SECRET;

    if (!uploadSecret) {
      logger.warn('R2_UPLOAD_SECRET is not configured');
      return NextResponse.json({ token: null });
    }

    return NextResponse.json({ token: uploadSecret });
  } catch (error) {
    return handleApiError(error);
  }
}
