import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createEmbedTokenService } from '../services/embed-token-service.js';

interface EmbedTokenRoutesOptions {
  db: Db;
}

export async function embedTokenRoutes(app: FastifyInstance, opts: EmbedTokenRoutesOptions) {
  const tokenService = createEmbedTokenService(opts.db);

  // POST /workspaces/:id/embed-tokens — Admin+
  app.post<{
    Params: { id: string };
    Body: { label: string; scope: string; expiresAt: string };
  }>(
    '/workspaces/:id/embed-tokens',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request, reply) => {
      const { label, scope, expiresAt } = request.body;
      const userId = (request as FastifyRequest & { userId: string }).userId;
      const result = await tokenService.create(request.params.id, userId, label, scope, expiresAt);
      return reply.status(201).send(result);
    },
  );

  // GET /workspaces/:id/embed-tokens — Admin+
  app.get<{ Params: { id: string } }>(
    '/workspaces/:id/embed-tokens',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request) => {
      return tokenService.list(request.params.id);
    },
  );

  // DELETE /workspaces/:id/embed-tokens/:tokenId — Admin+
  app.delete<{ Params: { id: string; tokenId: string } }>(
    '/workspaces/:id/embed-tokens/:tokenId',
    { preHandler: [authMiddleware, requireRole('admin')] },
    async (request, reply) => {
      await tokenService.revoke(request.params.id, request.params.tokenId);
      return reply.status(204).send();
    },
  );
}
