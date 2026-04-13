import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createCategoryService } from '../services/category-service.js';
import { badRequest } from '../utils/errors.js';

interface CategoriesRoutesOptions {
  db: Db;
}

export async function categoriesRoutes(app: FastifyInstance, opts: CategoriesRoutesOptions) {
  const categoryService = createCategoryService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/workspaces/:wsId/categories
  app.post<{
    Params: { wsId: string };
    Body: { name: string; parentId?: string };
  }>('/workspaces/:wsId/categories', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { name, parentId } = request.body;

    if (!name || name.trim().length === 0) {
      throw badRequest('MISSING_FIELDS', 'name is required');
    }

    if (name.length > 100) {
      throw badRequest('INVALID_FIELDS', 'name must be 100 characters or less');
    }

    const category = await categoryService.create(
      request.params.wsId,
      name.trim(),
      parentId,
    );

    return reply.status(201).send({ category });
  });

  // GET /api/v1/workspaces/:wsId/categories
  app.get<{
    Params: { wsId: string };
  }>('/workspaces/:wsId/categories', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const categoriesList = await categoryService.list(request.params.wsId);
    return reply.status(200).send({ categories: categoriesList });
  });

  // GET /api/v1/workspaces/:wsId/categories/tree
  // 카테고리 트리 + 소속 문서를 한 번에 반환
  app.get<{
    Params: { wsId: string };
  }>('/workspaces/:wsId/categories/tree', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const result = await categoryService.tree(request.params.wsId);
    return reply.status(200).send(result);
  });

  // PATCH /api/v1/workspaces/:wsId/categories/:id
  app.patch<{
    Params: { wsId: string; id: string };
    Body: { name: string };
  }>('/workspaces/:wsId/categories/:id', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { name } = request.body;

    if (!name || name.trim().length === 0) {
      throw badRequest('MISSING_FIELDS', 'name is required');
    }

    if (name.length > 100) {
      throw badRequest('INVALID_FIELDS', 'name must be 100 characters or less');
    }

    const category = await categoryService.rename(
      request.params.id,
      request.params.wsId,
      name.trim(),
    );

    return reply.status(200).send({ category });
  });

  // PUT /api/v1/workspaces/:wsId/categories/reorder
  app.put<{
    Params: { wsId: string };
    Body: { orderedIds: number[] };
  }>('/workspaces/:wsId/categories/reorder', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { orderedIds } = request.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw badRequest('MISSING_FIELDS', 'orderedIds array is required');
    }

    await categoryService.reorder(request.params.wsId, orderedIds);

    return reply.status(200).send({ ok: true });
  });

  // GET /api/v1/workspaces/:wsId/categories/:id/ancestors
  app.get<{
    Params: { wsId: string; id: string };
  }>('/workspaces/:wsId/categories/:id/ancestors', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const result = await categoryService.ancestors(
      request.params.id,
      request.params.wsId,
    );
    return reply.status(200).send({ ancestors: result });
  });

  // DELETE /api/v1/workspaces/:wsId/categories/:id
  app.delete<{
    Params: { wsId: string; id: string };
    Body: { confirmName: string };
  }>('/workspaces/:wsId/categories/:id', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { confirmName } = request.body;

    if (!confirmName) {
      throw badRequest('MISSING_FIELDS', 'confirmName is required');
    }

    await categoryService.remove(request.params.id, request.params.wsId);

    return reply.status(204).send();
  });
}
