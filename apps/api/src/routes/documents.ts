import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createDocumentService } from '../services/document-service.js';
import { createTrashService } from '../services/trash-service.js';
import { badRequest } from '../utils/errors.js';

interface DocumentsRoutesOptions {
  db: Db;
}

export async function documentsRoutes(app: FastifyInstance, opts: DocumentsRoutesOptions) {
  const documentService = createDocumentService(opts.db);
  const trashService = createTrashService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/workspaces/:wsId/documents
  app.post<{
    Params: { wsId: string };
    Body: { title: string; categoryId?: string };
  }>('/workspaces/:wsId/documents', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { title, categoryId } = request.body;

    if (!title || title.trim().length === 0) {
      throw badRequest('MISSING_FIELDS', 'title is required');
    }

    if (title.length > 300) {
      throw badRequest('INVALID_FIELDS', 'title must be 300 characters or less');
    }

    const userId = request.currentUser!.userId;
    const document = await documentService.create(
      request.params.wsId,
      userId,
      title.trim(),
      categoryId,
    );

    return reply.status(201).send({ document });
  });

  // GET /api/v1/workspaces/:wsId/documents
  app.get<{
    Params: { wsId: string };
    Querystring: {
      categoryId?: string;
      sort?: 'title' | 'updatedAt' | 'createdAt';
      order?: 'asc' | 'desc';
      q?: string;
      page?: string;
      limit?: string;
    };
  }>('/workspaces/:wsId/documents', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const { categoryId, sort, order, q, page, limit } = request.query;

    const result = await documentService.list(request.params.wsId, {
      categoryId,
      sort,
      order,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return reply.status(200).send(result);
  });

  // GET /api/v1/workspaces/:wsId/documents/:id
  app.get<{
    Params: { wsId: string; id: string };
  }>('/workspaces/:wsId/documents/:id', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const document = await documentService.getById(
      request.params.id,
      request.params.wsId,
    );

    return reply.status(200).send({ document });
  });

  // PATCH /api/v1/workspaces/:wsId/documents/:id
  app.patch<{
    Params: { wsId: string; id: string };
    Body: { content?: string; title?: string };
  }>('/workspaces/:wsId/documents/:id', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { content, title } = request.body;

    if (content === undefined && title === undefined) {
      throw badRequest('MISSING_FIELDS', 'At least one field (content, title) is required');
    }

    if (title !== undefined && title.length > 300) {
      throw badRequest('INVALID_FIELDS', 'title must be 300 characters or less');
    }

    const document = await documentService.update(
      request.params.id,
      request.params.wsId,
      { content, title },
    );

    return reply.status(200).send({ document });
  });

  // DELETE /api/v1/workspaces/:wsId/documents/:id
  app.delete<{
    Params: { wsId: string; id: string };
  }>('/workspaces/:wsId/documents/:id', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    await trashService.softDelete(request.params.id, request.params.wsId);
    return reply.status(204).send();
  });
}
