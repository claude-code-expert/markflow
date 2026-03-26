import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createTrashService } from '../services/trash-service.js';

interface TrashRoutesOptions {
  db: Db;
}

export async function trashRoutes(app: FastifyInstance, opts: TrashRoutesOptions) {
  const trashService = createTrashService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/workspaces/:wsId/trash
  app.get<{
    Params: { wsId: string };
  }>('/workspaces/:wsId/trash', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const trashList = await trashService.list(request.params.wsId);
    return reply.status(200).send({ documents: trashList });
  });

  // POST /api/v1/workspaces/:wsId/trash/:docId/restore
  app.post<{
    Params: { wsId: string; docId: string };
  }>('/workspaces/:wsId/trash/:docId/restore', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const document = await trashService.restore(
      request.params.docId,
      request.params.wsId,
    );
    return reply.status(200).send({ document });
  });

  // DELETE /api/v1/workspaces/:wsId/trash/:docId
  app.delete<{
    Params: { wsId: string; docId: string };
  }>('/workspaces/:wsId/trash/:docId', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    await trashService.permanentDelete(
      request.params.docId,
      request.params.wsId,
    );
    return reply.status(204).send();
  });
}
