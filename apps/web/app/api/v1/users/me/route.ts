import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/server/db';
import { handleApiError, extractCurrentUser } from '../../../../../lib/server/middleware';
import { badRequest } from '../../../../../lib/server/utils/errors';
import { users, eq } from '@markflow/db';

export async function GET(request: NextRequest) {
  try {
    const currentUser = extractCurrentUser(request);
    const db = getDb();

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, Number(currentUser.userId)))
      .limit(1);

    if (!user) {
      throw badRequest('USER_NOT_FOUND', 'User not found');
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = extractCurrentUser(request);
    const { name, avatarUrl } = await request.json();
    const db = getDb();

    const updates: { name?: string; avatarUrl?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw badRequest('INVALID_NAME', 'Name must be a non-empty string');
      }
      updates.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        throw badRequest('INVALID_AVATAR_URL', 'Avatar URL must be a string or null');
      }
      updates.avatarUrl = avatarUrl;
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, Number(currentUser.userId)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const user = updated[0];
    if (!user) {
      throw badRequest('USER_NOT_FOUND', 'User not found');
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
