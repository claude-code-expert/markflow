import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { unauthorized } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Upload token routes.
 *
 * Provides an endpoint for authenticated users to retrieve
 * the R2 Worker upload secret (Bearer token).
 *
 * Environment variable mapping:
 * - API server: R2_UPLOAD_SECRET (process.env)
 * - Worker: API_SECRET (Cloudflare Workers Secret)
 * - Both must be set to the same value in production.
 */
export async function uploadTokenRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/upload-token
  // Returns the R2 Worker upload token for authenticated users.
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser) {
      throw unauthorized('Not authenticated');
    }

    const uploadSecret = process.env['R2_UPLOAD_SECRET'];
    if (!uploadSecret) {
      // R2_UPLOAD_SECRET not configured — upload works without auth (D-05 backward compat)
      logger.warn('R2_UPLOAD_SECRET not configured — upload token endpoint returns empty token');
      return reply.status(200).send({ token: null });
    }

    return reply.status(200).send({ token: uploadSecret });
  });
}
