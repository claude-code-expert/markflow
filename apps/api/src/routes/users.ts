import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/multipart';
import { users, eq } from '@markflow/db';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../utils/errors.js';

interface UsersRoutesOptions {
  db: Db;
}

const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

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
      .where(eq(users.id, request.currentUser.userId))
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
      .where(eq(users.id, request.currentUser.userId))
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

  // PUT /api/v1/users/me/avatar
  app.put('/me/avatar', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    if (!request.currentUser) {
      throw unauthorized('Not authenticated');
    }

    const file = await request.file();

    if (!file) {
      throw badRequest('MISSING_FILE', 'An image file is required');
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw badRequest('INVALID_FILE_TYPE', 'Only JPG and PNG images are allowed');
    }

    // Consume file buffer to check size
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_AVATAR_SIZE) {
      throw badRequest('FILE_TOO_LARGE', 'Avatar image must be under 2MB');
    }

    // Phase 1: generate a placeholder URL — actual upload to R2 comes later
    const avatarUrl = `/avatars/${request.currentUser.userId}/${file.filename}`;

    const updated = await db
      .update(users)
      .set({
        avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.currentUser.userId))
      .returning({
        avatarUrl: users.avatarUrl,
      });

    const row = updated[0];
    if (!row) {
      throw unauthorized('User not found');
    }

    return reply.status(200).send({ avatarUrl: row.avatarUrl });
  });
}
