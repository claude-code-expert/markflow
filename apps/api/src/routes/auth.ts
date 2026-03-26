import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import type { Db } from '@markflow/db';
import { createAuthService } from '../services/auth-service.js';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { badRequest } from '../utils/errors.js';

interface AuthRoutesOptions {
  db: Db;
  redis: Redis;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    secure: IS_PRODUCTION,
  };
}

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions) {
  const authService = createAuthService(opts.db);
  const loginRateLimiter = createRateLimiter(opts.redis);

  // POST /api/v1/auth/register
  app.post<{ Body: { email: string; password: string; name: string } }>(
    '/register',
    async (request, reply) => {
      const { email, password, name } = request.body;

      if (!email || !password || !name) {
        throw badRequest('MISSING_FIELDS', 'email, password, and name are required');
      }

      const result = await authService.register(email, password, name);
      return reply.status(201).send(result);
    },
  );

  // GET /api/v1/auth/verify-email?token=xxx
  app.get<{ Querystring: { token?: string } }>(
    '/verify-email',
    async (request, reply) => {
      const { token } = request.query;

      if (!token) {
        throw badRequest('MISSING_TOKEN', 'Verification token is required');
      }

      const result = await authService.verifyEmail(token);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/auth/login
  app.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await loginRateLimiter(request, reply);

      const body = request.body as { email: string; password: string; rememberMe?: boolean };
      const { email, password, rememberMe } = body;

      if (!email || !password) {
        throw badRequest('MISSING_FIELDS', 'email and password are required');
      }

      const result = await authService.login(email, password, rememberMe ?? false);

      reply.setCookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

      return reply.status(200).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    },
  );

  // POST /api/v1/auth/refresh
  app.post(
    '/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const refreshToken = request.cookies['refreshToken'];

      if (!refreshToken) {
        throw badRequest('MISSING_TOKEN', 'Refresh token cookie is required');
      }

      const result = await authService.refresh(refreshToken);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/auth/logout
  app.post(
    '/logout',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const refreshToken = request.cookies['refreshToken'];

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      reply.clearCookie('refreshToken', getRefreshTokenCookieOptions());

      return reply.status(204).send();
    },
  );
}
