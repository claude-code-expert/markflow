import type { FastifyRequest, FastifyReply } from 'fastify';
import { forbidden } from '../utils/errors.js';
import type { Db } from '@markflow/db';
import { workspaceMembers, eq, and } from '@markflow/db';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      const error = forbidden('Authentication required');
      return reply.status(error.statusCode).send(error.toJSON());
    }

    const workspaceId = (request.params as Record<string, string>).workspaceId
      ?? (request.params as Record<string, string>).wsId
      ?? (request.params as Record<string, string>).id;

    if (!workspaceId) {
      const error = forbidden('Workspace context required');
      return reply.status(error.statusCode).send(error.toJSON());
    }

    const db: Db = (request.server as unknown as { db: Db }).db;
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ))
      .limit(1);

    if (!member) {
      const error = forbidden('Not a member of this workspace');
      return reply.status(error.statusCode).send(error.toJSON());
    }

    const memberRole = member.role as Role;
    const hasPermission = allowedRoles.some(
      (role) => ROLE_HIERARCHY[memberRole] >= ROLE_HIERARCHY[role],
    );

    if (!hasPermission) {
      const error = forbidden('Insufficient permissions');
      return reply.status(error.statusCode).send(error.toJSON());
    }

    (request as FastifyRequest & { workspaceMember: typeof member }).workspaceMember = member;
  };
}

export { ROLE_HIERARCHY };
export type { Role };
