import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createDocumentService } from '../services/document-service.js';

interface VersionsRoutesOptions {
  db: Db;
}

export async function versionsRoutes(app: FastifyInstance, opts: VersionsRoutesOptions) {
  const documentService = createDocumentService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/workspaces/:wsId/documents/:docId/versions
  app.get<{
    Params: { wsId: string; docId: string };
  }>('/workspaces/:wsId/documents/:docId/versions', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const versions = await documentService.getVersions(
      request.params.docId,
      request.params.wsId,
    );
    return reply.status(200).send({ versions });
  });
}
