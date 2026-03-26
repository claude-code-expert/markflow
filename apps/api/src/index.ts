import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Redis from 'ioredis';
import { createDb } from '@markflow/db';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { registerCors } from './plugins/cors.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { startCleanupInterval } from './jobs/cleanup-trash.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { workspacesRoutes } from './routes/workspaces.js';
import { invitationsRoutes } from './routes/invitations.js';
import { joinRequestsRoutes } from './routes/join-requests.js';
import { categoriesRoutes } from './routes/categories.js';
import { documentsRoutes } from './routes/documents.js';
import { trashRoutes } from './routes/trash.js';
import { versionsRoutes } from './routes/versions.js';
import { relationsRoutes } from './routes/relations.js';
import { graphRoutes } from './routes/graph.js';
import { tagsRoutes } from './routes/tags.js';
import { importExportRoutes } from './routes/import-export.js';

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PORT ?? 4000);

export async function buildApp() {
  const app = Fastify({
    logger: false,
  });

  // --- CORS ---
  await registerCors(app);

  // --- CSRF ---
  app.addHook('preHandler', csrfMiddleware);

  // --- Plugins ---
  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB global limit
    },
  });

  // --- DB ---
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const db = createDb(databaseUrl);

  // --- Redis ---
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }
  const redis = new Redis(redisUrl);

  // --- Error handler ---
  app.setErrorHandler((rawError, _request, reply) => {
    if (rawError instanceof AppError) {
      return reply.status(rawError.statusCode).send(rawError.toJSON());
    }

    const err = rawError as Error & { validation?: unknown; statusCode?: number };

    if (err.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
        },
      });
    }

    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
    });

    return reply.status(err.statusCode ?? 500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // --- Health ---
  app.get('/health', async () => ({ status: 'ok' }));

  // --- Routes ---
  await app.register(authRoutes, { prefix: '/api/v1/auth', db, redis });
  await app.register(usersRoutes, { prefix: '/api/v1/users', db });
  await app.register(workspacesRoutes, { prefix: '/api/v1', db });
  await app.register(invitationsRoutes, { prefix: '/api/v1', db });
  await app.register(joinRequestsRoutes, { prefix: '/api/v1', db });
  await app.register(categoriesRoutes, { prefix: '/api/v1', db });
  await app.register(documentsRoutes, { prefix: '/api/v1', db });
  await app.register(trashRoutes, { prefix: '/api/v1', db });
  await app.register(versionsRoutes, { prefix: '/api/v1', db });
  await app.register(relationsRoutes, { prefix: '/api/v1', db });
  await app.register(graphRoutes, { prefix: '/api/v1', db });
  await app.register(tagsRoutes, { prefix: '/api/v1', db });
  await app.register(importExportRoutes, { prefix: '/api/v1', db });

  // --- Scheduled Jobs ---
  const cleanupIntervalHandle = startCleanupInterval(db);

  // --- Graceful shutdown ---
  app.addHook('onClose', async () => {
    clearInterval(cleanupIntervalHandle);
    logger.info('Cleanup job interval cleared');
    await redis.quit();
    logger.info('Redis connection closed');
  });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ host: HOST, port: PORT });
    logger.info(`API server listening on ${HOST}:${PORT}`);
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
