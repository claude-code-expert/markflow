import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createRelationService } from '../services/relation-service.js';
import { badRequest } from '../utils/errors.js';

interface RelationsRoutesOptions {
  db: Db;
}

export async function relationsRoutes(app: FastifyInstance, opts: RelationsRoutesOptions) {
  const relationService = createRelationService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // PUT /api/v1/workspaces/:wsId/documents/:docId/relations
  app.put<{
    Params: { wsId: string; docId: string };
    Body: {
      prev?: string;
      next?: string;
      related?: string[];
    };
  }>('/workspaces/:wsId/documents/:docId/relations', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { prev, next, related } = request.body ?? {};

    if (prev !== undefined && typeof prev !== 'string') {
      throw badRequest('INVALID_FIELDS', 'prev must be a string UUID');
    }
    if (next !== undefined && typeof next !== 'string') {
      throw badRequest('INVALID_FIELDS', 'next must be a string UUID');
    }
    if (related !== undefined && !Array.isArray(related)) {
      throw badRequest('INVALID_FIELDS', 'related must be an array of string UUIDs');
    }

    const result = await relationService.setRelations(
      request.params.docId,
      request.params.wsId,
      { prev, next, related },
    );

    return reply.status(200).send(result);
  });

  // GET /api/v1/workspaces/:wsId/documents/:docId/relations
  app.get<{
    Params: { wsId: string; docId: string };
  }>('/workspaces/:wsId/documents/:docId/relations', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const result = await relationService.getRelations(request.params.docId);
    return reply.status(200).send(result);
  });
}
