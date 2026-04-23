import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './utils/jwt';
import { AppError, unauthorized, forbidden } from './utils/errors';
import { logger } from './utils/logger';
import { getDb } from './db';
import { workspaceMembers, eq, and } from '@markflow/db';

// --- Types ---

export interface CurrentUser {
  userId: string;
  email: string;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId: number;
  role: string;
  joinedAt: Date;
}

export interface ApiContext {
  currentUser: CurrentUser;
  workspaceMember?: WorkspaceMember;
}

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

// --- Auth ---

export function extractCurrentUser(request: NextRequest): CurrentUser {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    return { userId: payload.userId, email: payload.email };
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

// --- RBAC ---

export async function checkRole(
  currentUser: CurrentUser,
  workspaceId: string,
  ...allowedRoles: Role[]
): Promise<WorkspaceMember> {
  const db = getDb();

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, Number(workspaceId)),
      eq(workspaceMembers.userId, Number(currentUser.userId)),
    ))
    .limit(1);

  if (!member) {
    throw forbidden('Not a member of this workspace');
  }

  const memberRole = member.role as Role;
  const hasPermission = allowedRoles.some(
    (role) => ROLE_HIERARCHY[memberRole] >= ROLE_HIERARCHY[role],
  );

  if (!hasPermission) {
    throw forbidden('Insufficient permissions');
  }

  return member as WorkspaceMember;
}

// --- Error Handler ---

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error('Unhandled API error', { message, stack });

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    { status: 500 },
  );
}
