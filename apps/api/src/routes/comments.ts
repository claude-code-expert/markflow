import type { FastifyInstance } from 'fastify';
import type { Db } from '@markflow/db';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createCommentService } from '../services/comment-service.js';
import { badRequest } from '../utils/errors.js';

interface CommentsRoutesOptions {
  db: Db;
}

export async function commentsRoutes(app: FastifyInstance, opts: CommentsRoutesOptions) {
  const commentService = createCommentService(opts.db);

  if (!app.hasDecorator('db')) {
    app.decorate('db', opts.db);
  }

  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/workspaces/:wsId/documents/:docId/comments
  app.get<{
    Params: { wsId: string; docId: string };
  }>('/workspaces/:wsId/documents/:docId/comments', {
    preHandler: requireRole('viewer'),
  }, async (request, reply) => {
    const result = await commentService.list(
      request.params.docId,
      request.params.wsId,
    );
    return reply.status(200).send({ comments: result });
  });

  // POST /api/v1/workspaces/:wsId/documents/:docId/comments
  app.post<{
    Params: { wsId: string; docId: string };
    Body: { content: string; parentId?: number };
  }>('/workspaces/:wsId/documents/:docId/comments', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { content, parentId } = request.body;

    if (!content || content.trim().length === 0) {
      throw badRequest('MISSING_FIELDS', 'content is required');
    }

    if (content.length > 5000) {
      throw badRequest('INVALID_FIELDS', 'content must be 5000 characters or less');
    }

    const comment = await commentService.create(
      request.params.docId,
      request.params.wsId,
      request.currentUser!.userId,
      content.trim(),
      parentId,
    );

    return reply.status(201).send({ comment });
  });

  // PATCH /api/v1/workspaces/:wsId/documents/:docId/comments/:commentId
  app.patch<{
    Params: { wsId: string; docId: string; commentId: string };
    Body: { content?: string; resolved?: boolean };
  }>('/workspaces/:wsId/documents/:docId/comments/:commentId', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    const { content, resolved } = request.body;
    const { commentId, wsId } = request.params;
    const userId = request.currentUser!.userId;

    // content 수정
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw badRequest('MISSING_FIELDS', 'content must be a non-empty string');
      }

      if (content.length > 5000) {
        throw badRequest('INVALID_FIELDS', 'content must be 5000 characters or less');
      }

      const updated = await commentService.update(commentId, wsId, userId, content.trim());
      return reply.status(200).send({ comment: updated });
    }

    // resolved 토글
    if (resolved !== undefined) {
      const updated = await commentService.toggleResolved(commentId, wsId, userId);
      return reply.status(200).send({ comment: updated });
    }

    throw badRequest('MISSING_FIELDS', 'At least one field (content, resolved) is required');
  });

  // DELETE /api/v1/workspaces/:wsId/documents/:docId/comments/:commentId
  app.delete<{
    Params: { wsId: string; docId: string; commentId: string };
  }>('/workspaces/:wsId/documents/:docId/comments/:commentId', {
    preHandler: requireRole('editor'),
  }, async (request, reply) => {
    await commentService.remove(
      request.params.commentId,
      request.params.wsId,
      request.currentUser!.userId,
    );
    return reply.status(204).send();
  });
}
