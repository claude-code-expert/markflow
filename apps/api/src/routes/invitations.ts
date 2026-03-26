import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createInvitationService } from '../services/invitation-service.js';
import { badRequest } from '../utils/errors.js';

type InvitationRole = 'admin' | 'editor' | 'viewer';
const VALID_INVITATION_ROLES = new Set<string>(['admin', 'editor', 'viewer']);

interface InvitationsRoutesOptions {
  db: Db;
}

export async function invitationsRoutes(app: FastifyInstance, opts: InvitationsRoutesOptions) {
  const invitationService = createInvitationService(opts.db);

  // Decorate server with db for RBAC middleware
  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  // POST /api/v1/workspaces/:id/invitations — requires admin+
  app.post<{
    Params: { id: string };
    Body: { email: string; role: string };
  }>('/workspaces/:id/invitations', {
    preHandler: [authMiddleware, requireRole('admin')],
  }, async (request, reply) => {
    const { email, role } = request.body;

    if (!email || !role) {
      throw badRequest('MISSING_FIELDS', 'email and role are required');
    }

    if (!VALID_INVITATION_ROLES.has(role)) {
      throw badRequest('INVALID_ROLE', 'role must be one of: admin, editor, viewer');
    }

    const inviterId = request.currentUser!.userId;
    const invitation = await invitationService.create(
      request.params.id,
      inviterId,
      email,
      role as InvitationRole,
    );
    return reply.status(201).send({ invitation });
  });

  // GET /api/v1/invitations/:token — no auth needed
  app.get<{
    Params: { token: string };
  }>('/invitations/:token', async (request, reply) => {
    const invitation = await invitationService.getByToken(request.params.token);
    return reply.status(200).send({ invitation });
  });

  // POST /api/v1/invitations/:token/accept — auth required
  app.post<{
    Params: { token: string };
  }>('/invitations/:token/accept', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.currentUser!.userId;
    const result = await invitationService.accept(request.params.token, userId);
    return reply.status(200).send(result);
  });
}
