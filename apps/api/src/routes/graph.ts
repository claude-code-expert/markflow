import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createGraphService } from '../services/graph-service.js';

interface GraphRoutesOptions {
  db: Db;
}

export async function graphRoutes(app: FastifyInstance, opts: GraphRoutesOptions) {
  const graphService = createGraphService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/workspaces/:wsId/graph
  app.get<{
    Params: { wsId: string };
  }>('/workspaces/:wsId/graph', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const graph = await graphService.getWorkspaceGraph(request.params.wsId);
    return reply.status(200).send(graph);
  });
}
