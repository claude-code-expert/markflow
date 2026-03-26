import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createJoinRequestService } from '../services/join-request-service.js';
import { badRequest } from '../utils/errors.js';

type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
const VALID_ASSIGNABLE_ROLES = new Set<string>(['admin', 'editor', 'viewer']);

interface JoinRequestsRoutesOptions {
  db: Db;
}

export async function joinRequestsRoutes(app: FastifyInstance, opts: JoinRequestsRoutesOptions) {
  const joinRequestService = createJoinRequestService(opts.db);

  // Decorate server with db for RBAC middleware
  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  // All routes require auth
  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/workspaces/:id/join-requests — auth required
  app.post<{
    Params: { id: string };
    Body: { message?: string };
  }>('/workspaces/:id/join-requests', async (request, reply) => {
    const userId = request.currentUser!.userId;
    const joinRequest = await joinRequestService.create(
      request.params.id,
      userId,
      request.body.message,
    );
    return reply.status(201).send({ joinRequest });
  });

  // GET /api/v1/workspaces/:id/join-requests — admin+
  app.get<{
    Params: { id: string };
    Querystring: { status?: string };
  }>('/workspaces/:id/join-requests', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    const joinRequestsList = await joinRequestService.list(
      request.params.id,
      request.query.status,
    );
    return reply.status(200).send({ joinRequests: joinRequestsList });
  });

  // PATCH /api/v1/workspaces/:id/join-requests/batch — batch approve, admin+
  // IMPORTANT: This route must be registered BEFORE the :requestId route
  app.patch<{
    Params: { id: string };
    Body: { requestIds: string[]; role: string };
  }>('/workspaces/:id/join-requests/batch', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    const { requestIds, role } = request.body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      throw badRequest('MISSING_FIELDS', 'requestIds array is required');
    }

    if (!role) {
      throw badRequest('MISSING_FIELDS', 'role is required');
    }

    if (!VALID_ASSIGNABLE_ROLES.has(role)) {
      throw badRequest('INVALID_ROLE', 'role must be one of: admin, editor, viewer');
    }

    const reviewerId = request.currentUser!.userId;
    const result = await joinRequestService.batchApprove(requestIds, reviewerId, role as MemberRole);
    return reply.status(200).send(result);
  });

  // PATCH /api/v1/workspaces/:id/join-requests/:requestId — approve/reject, admin+
  app.patch<{
    Params: { id: string; requestId: string };
    Body: { action: 'approve' | 'reject'; role?: string };
  }>('/workspaces/:id/join-requests/:requestId', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    const { action, role } = request.body;
    const reviewerId = request.currentUser!.userId;

    if (!action) {
      throw badRequest('MISSING_FIELDS', 'action is required');
    }

    if (action === 'approve') {
      if (!role) {
        throw badRequest('MISSING_FIELDS', 'role is required when approving');
      }
      if (!VALID_ASSIGNABLE_ROLES.has(role)) {
        throw badRequest('INVALID_ROLE', 'role must be one of: admin, editor, viewer');
      }
      await joinRequestService.approve(request.params.requestId, reviewerId, role as MemberRole);
    } else if (action === 'reject') {
      await joinRequestService.reject(request.params.requestId, reviewerId);
    } else {
      throw badRequest('INVALID_ACTION', 'action must be "approve" or "reject"');
    }

    return reply.status(200).send({ success: true });
  });
}
