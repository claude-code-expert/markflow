import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createTagService } from '../services/tag-service.js';
import { badRequest } from '../utils/errors.js';

interface TagsRoutesOptions {
  db: Db;
}

export async function tagsRoutes(app: FastifyInstance, opts: TagsRoutesOptions) {
  const tagService = createTagService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // PUT /api/v1/workspaces/:wsId/documents/:docId/tags
  app.put<{
    Params: { wsId: string; docId: string };
    Body: { tags: string[] };
  }>('/workspaces/:wsId/documents/:docId/tags', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { tags: tagNames } = request.body;

    if (!Array.isArray(tagNames)) {
      throw badRequest('INVALID_FIELDS', 'tags must be an array of strings');
    }

    for (const name of tagNames) {
      if (typeof name !== 'string') {
        throw badRequest('INVALID_FIELDS', 'Each tag must be a string');
      }
      if (name.trim().length === 0) {
        throw badRequest('INVALID_FIELDS', 'Tag names cannot be empty');
      }
      if (name.length > 50) {
        throw badRequest('INVALID_FIELDS', 'Tag names must be 50 characters or less');
      }
    }

    const result = await tagService.setDocumentTags(
      request.params.docId,
      request.params.wsId,
      tagNames,
    );

    return reply.status(200).send({ tags: result });
  });

  // GET /api/v1/workspaces/:wsId/tags
  app.get<{
    Params: { wsId: string };
  }>('/workspaces/:wsId/tags', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const result = await tagService.listWorkspaceTags(request.params.wsId);
    return reply.status(200).send({ tags: result });
  });
}
