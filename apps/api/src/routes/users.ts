import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { users, eq } from '@markflow/db';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../utils/errors.js';

interface UsersRoutesOptions {
  db: Db;
}

export async function usersRoutes(app: FastifyInstance, opts: UsersRoutesOptions) {
  const { db } = opts;

  // All routes require auth
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/users/me
  app.get('/me', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    if (!request.currentUser) {
      throw unauthorized('Not authenticated');
    }

    const found = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, Number(request.currentUser.userId)))
      .limit(1);

    const user = found[0];
    if (!user) {
      throw unauthorized('User not found');
    }

    return reply.status(200).send({ user });
  });

  // PATCH /api/v1/users/me
  app.patch('/me', async (
    request: FastifyRequest<{
      Body: { name?: string; avatarUrl?: string };
    }>,
    reply: FastifyReply,
  ) => {
    if (!request.currentUser) {
      throw unauthorized('Not authenticated');
    }

    const { name, avatarUrl } = request.body;

    if (name === undefined && avatarUrl === undefined) {
      throw badRequest('MISSING_FIELDS', 'At least one field (name, avatarUrl) is required');
    }

    const updates: { name?: string; avatarUrl?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw badRequest('INVALID_NAME', 'Name must be a non-empty string');
      }
      updates.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl;
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, Number(request.currentUser.userId)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const user = updated[0];
    if (!user) {
      throw unauthorized('User not found');
    }

    return reply.status(200).send({ user });
  });

  // Avatar 업로드는 프론트엔드에서 R2 Worker로 직접 업로드 후
  // PATCH /users/me { avatarUrl } 로 URL을 저장한다.
  // PUT /me/avatar 엔드포인트는 v1.7.0에서 제거됨.
}
