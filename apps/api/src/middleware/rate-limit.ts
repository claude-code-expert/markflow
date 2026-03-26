import type { FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import { rateLimited } from '../utils/errors.js';

const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_SECONDS = 15 * 60; // 15 minutes

export function createRateLimiter(redis: Redis) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip;
    const key = `rate_limit:auth:${ip}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, AUTH_RATE_WINDOW_SECONDS);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, AUTH_RATE_LIMIT - current);
    const resetAt = Math.floor(Date.now() / 1000) + Math.max(0, ttl);

    reply.header('X-RateLimit-Limit', AUTH_RATE_LIMIT);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', resetAt);

    if (current > AUTH_RATE_LIMIT) {
      const error = rateLimited();
      return reply.status(error.statusCode).send(error.toJSON());
    }
  };
}
