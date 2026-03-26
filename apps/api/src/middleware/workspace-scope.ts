import type { FastifyRequest, FastifyReply } from 'fastify';
import { forbidden } from '../utils/errors.js';

export async function workspaceScopeMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, string>;
  const workspaceId = params.workspaceId ?? params.wsId;

  if (!workspaceId) {
    return;
  }

  const userId = request.currentUser?.userId;
  if (!userId) {
    const error = forbidden('Authentication required for workspace access');
    return reply.status(error.statusCode).send(error.toJSON());
  }

  // Workspace membership is already validated by RBAC middleware
  // This middleware ensures workspace_id is always present in the request context
  (request as FastifyRequest & { workspaceId: string }).workspaceId = workspaceId;
}
