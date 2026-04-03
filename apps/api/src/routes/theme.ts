import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createThemeService } from '../services/theme-service.js';

interface ThemeRoutesOptions {
  db: Db;
}

export async function themeRoutes(app: FastifyInstance, opts: ThemeRoutesOptions) {
  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }
  const themeService = createThemeService(opts.db);

  // GET /workspaces/:id/theme — Viewer+
  app.get<{ Params: { id: string } }>(
    '/workspaces/:id/theme',
    { preHandler: [authMiddleware, requireRole('viewer')] },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      return themeService.getTheme(request.params.id);
    },
  );

  // PATCH /workspaces/:id/theme — Admin+
  app.patch<{ Params: { id: string }; Body: { preset: string; css: string } }>(
    '/workspaces/:id/theme',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { preset: string; css: string } }>) => {
      const { preset, css } = request.body;
      return themeService.updateTheme(request.params.id, preset, css);
    },
  );
}
