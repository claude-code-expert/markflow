import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createWorkspaceService } from '../services/workspace-service.js';
import { createMemberService } from '../services/member-service.js';
import { badRequest } from '../utils/errors.js';

type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
const VALID_MEMBER_ROLES = new Set<string>(['admin', 'editor', 'viewer']);

interface WorkspacesRoutesOptions {
  db: Db;
}

export async function workspacesRoutes(app: FastifyInstance, opts: WorkspacesRoutesOptions) {
  const workspaceService = createWorkspaceService(opts.db);
  const memberService = createMemberService(opts.db);

  // Decorate server with db for RBAC middleware
  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  // All routes require auth
  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/workspaces
  app.post<{
    Body: { name: string; slug: string };
  }>('/workspaces', async (request, reply) => {
    const { name, slug } = request.body;

    if (!name || !slug) {
      throw badRequest('MISSING_FIELDS', 'name and slug are required');
    }

    const userId = request.currentUser!.userId;
    const workspace = await workspaceService.create(userId, name, slug);
    return reply.status(201).send({ workspace });
  });

  // GET /api/v1/workspaces
  app.get('/workspaces', async (request, reply) => {
    const userId = request.currentUser!.userId;
    const workspacesList = await workspaceService.listForUser(userId);
    return reply.status(200).send({ workspaces: workspacesList });
  });

  // GET /api/v1/workspaces/:id
  app.get<{
    Params: { id: string };
  }>('/workspaces/:id', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const workspace = await workspaceService.getById(request.params.id);
    return reply.status(200).send({ workspace });
  });

  // PATCH /api/v1/workspaces/:id
  app.patch<{
    Params: { id: string };
    Body: { name?: string; isPublic?: boolean };
  }>('/workspaces/:id', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const { name, isPublic } = request.body;

    if (name === undefined && isPublic === undefined) {
      throw badRequest('MISSING_FIELDS', 'At least one field (name, isPublic) is required');
    }

    const workspace = await workspaceService.update(request.params.id, { name, isPublic });
    return reply.status(200).send({ workspace });
  });

  // DELETE /api/v1/workspaces/:id
  app.delete<{
    Params: { id: string };
    Body: { confirmName: string };
  }>('/workspaces/:id', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const { confirmName } = request.body;

    if (!confirmName) {
      throw badRequest('MISSING_FIELDS', 'confirmName is required');
    }

    await workspaceService.remove(request.params.id, confirmName);
    return reply.status(204).send();
  });

  // POST /api/v1/workspaces/:id/transfer
  app.post<{
    Params: { id: string };
    Body: { newOwnerId: string };
  }>('/workspaces/:id/transfer', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const { newOwnerId } = request.body;

    if (!newOwnerId) {
      throw badRequest('MISSING_FIELDS', 'newOwnerId is required');
    }

    const currentOwnerId = request.currentUser!.userId;
    await workspaceService.transferOwnership(request.params.id, currentOwnerId, newOwnerId);
    return reply.status(200).send({ transferred: true });
  });

  // GET /api/v1/workspaces/:id/members
  app.get<{
    Params: { id: string };
  }>('/workspaces/:id/members', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const members = await memberService.list(request.params.id);
    return reply.status(200).send({ members });
  });

  // PATCH /api/v1/workspaces/:id/members/:userId
  app.patch<{
    Params: { id: string; userId: string };
    Body: { role: string };
  }>('/workspaces/:id/members/:userId', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    const { role } = request.body;

    if (!role) {
      throw badRequest('MISSING_FIELDS', 'role is required');
    }

    if (!VALID_MEMBER_ROLES.has(role)) {
      throw badRequest('INVALID_ROLE', 'role must be one of: admin, editor, viewer');
    }

    const member = await memberService.updateRole(request.params.id, request.params.userId, role as MemberRole);
    return reply.status(200).send({ member });
  });

  // DELETE /api/v1/workspaces/:id/members/:userId
  app.delete<{
    Params: { id: string; userId: string };
  }>('/workspaces/:id/members/:userId', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    const requesterId = request.currentUser!.userId;
    await memberService.remove(request.params.id, request.params.userId, requesterId);
    return reply.status(204).send();
  });
}
