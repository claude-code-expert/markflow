import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Db } from '@markflow/db';
import { createAuthService } from '../services/auth-service.js';
import { authMiddleware } from '../middleware/auth.js';
import { badRequest } from '../utils/errors.js';

interface AuthRoutesOptions {
  db: Db;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function authRateLimit(max = 10) {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow: '15 minutes',
        keyGenerator: (request: FastifyRequest) => request.ip,
      },
    },
  };
}

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

  // POST /api/v1/auth/register
  app.post<{ Body: { email: string; password: string; name: string } }>(
    '/register',
    authRateLimit(),
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

  // POST /api/v1/auth/resend-verification
  app.post<{ Body: { email: string } }>(
    '/resend-verification',
    authRateLimit(),
    async (request, reply) => {
      const { email } = request.body;
      if (!email) {
        throw badRequest('MISSING_FIELDS', 'email is required');
      }
      const result = await authService.resendVerification(email);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/auth/login
  app.post(
    '/login',
    authRateLimit(),
    async (request: FastifyRequest, reply: FastifyReply) => {
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

  // POST /api/v1/auth/forgot-password
  app.post<{ Body: { email: string } }>(
    '/forgot-password',
    authRateLimit(5),
    async (request, reply) => {
      const { email } = request.body;
      if (!email) {
        throw badRequest('MISSING_FIELDS', 'email is required');
      }
      const result = await authService.forgotPassword(email);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/auth/reset-password
  app.post<{ Body: { token: string; password: string } }>(
    '/reset-password',
    async (request, reply) => {
      const { token, password } = request.body;
      if (!token || !password) {
        throw badRequest('MISSING_FIELDS', 'token and password are required');
      }
      const result = await authService.resetPassword(token, password);
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
