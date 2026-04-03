import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createDocumentService } from '../services/document-service.js';
import { badRequest } from '../utils/errors.js';

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

  // POST /api/v1/workspaces/:wsId/documents/:docId/restore-version
  app.post<{
    Params: { wsId: string; docId: string };
    Body: { versionNum: number };
  }>('/workspaces/:wsId/documents/:docId/restore-version', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { versionNum } = request.body;

    if (versionNum === undefined || typeof versionNum !== 'number' || !Number.isInteger(versionNum) || versionNum < 1) {
      throw badRequest('INVALID_FIELDS', 'versionNum must be a positive integer');
    }

    const result = await documentService.restoreVersion(
      request.params.docId,
      request.params.wsId,
      versionNum,
      request.currentUser!.userId,
    );

    return reply.status(200).send(result);
  });
}
