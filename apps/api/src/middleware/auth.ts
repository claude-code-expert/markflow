import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      userId: string;
      email: string;
    };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    const error = unauthorized('Missing or invalid authorization header');
    return reply.status(error.statusCode).send(error.toJSON());
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    request.currentUser = { userId: payload.userId, email: payload.email };
  } catch {
    const error = unauthorized('Invalid or expired token');
    return reply.status(error.statusCode).send(error.toJSON());
  }
}
