import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createImportService } from '../services/import-service.js';
import { createExportService } from '../services/export-service.js';
import { badRequest } from '../utils/errors.js';

interface ImportExportRoutesOptions {
  db: Db;
}

export async function importExportRoutes(app: FastifyInstance, opts: ImportExportRoutesOptions) {
  const importService = createImportService(opts.db);
  const exportService = createExportService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/workspaces/:wsId/import
  app.post<{
    Params: { wsId: string };
  }>('/workspaces/:wsId/import', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const file = await request.file();

    if (!file) {
      throw badRequest('MISSING_FILE', 'A file must be uploaded');
    }

    const filename = file.filename;
    const buffer = await file.toBuffer();

    const isMd = filename.toLowerCase().endsWith('.md');
    const isZip = filename.toLowerCase().endsWith('.zip');

    if (!isMd && !isZip) {
      throw badRequest('INVALID_FILE_TYPE', 'Only .md and .zip files are supported');
    }

    const userId = request.currentUser!.userId;
    const workspaceId = request.params.wsId;

    if (isMd) {
      const content = buffer.toString('utf-8');
      const document = await importService.importMarkdown(
        workspaceId,
        userId,
        filename,
        content,
      );
      return reply.status(200).send({
        imported: 1,
        documents: [{
          id: document.id,
          title: document.title,
          categoryId: document.categoryId,
        }],
      });
    }

    // ZIP import
    const result = await importService.importZip(workspaceId, userId, buffer);
    return reply.status(200).send(result);
  });

  // GET /api/v1/workspaces/:wsId/documents/:docId/export
  app.get<{
    Params: { wsId: string; docId: string };
    Querystring: { format?: string };
  }>('/workspaces/:wsId/documents/:docId/export', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const { filename, content } = await exportService.exportDocument(
      request.params.docId,
      request.params.wsId,
    );

    return reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      .send(content);
  });

  // GET /api/v1/workspaces/:wsId/categories/:catId/export
  app.get<{
    Params: { wsId: string; catId: string };
    Querystring: { format?: string };
  }>('/workspaces/:wsId/categories/:catId/export', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const { filename, buffer } = await exportService.exportCategory(
      request.params.catId,
      request.params.wsId,
    );

    return reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      .send(buffer);
  });
}
