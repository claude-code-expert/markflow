import type { FastifyRequest, FastifyReply } from 'fastify';
import { forbidden } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let cachedOrigins: Set<string> | null = null;

function getAllowedOrigins(): Set<string> {
  if (cachedOrigins) return cachedOrigins;
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  cachedOrigins = new Set(origins);
  return cachedOrigins;
}

/**
 * CSRF protection middleware.
 *
 * For state-changing methods (POST, PUT, PATCH, DELETE):
 * - If an Origin header is present, it must match one of the allowed CORS origins.
 * - If no Origin header is present, the request is allowed only if it has no cookies
 *   (i.e., it relies solely on Bearer token auth, which is not CSRF-vulnerable).
 *
 * SameSite=Strict is already enforced on the refresh token cookie,
 * providing the primary CSRF defense. This middleware adds defense-in-depth.
 */
export async function csrfMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const method = request.method.toUpperCase();

  // Skip safe methods
  if (!STATE_CHANGING_METHODS.has(method)) {
    return;
  }

  const origin = request.headers.origin;

  // If Origin header is present, validate it
  if (origin) {
    const allowedOrigins = getAllowedOrigins();

    if (!allowedOrigins.has(origin)) {
      logger.warn('CSRF: Origin mismatch', {
        origin,
        method,
        url: request.url,
        ip: request.ip,
      });
      const error = forbidden('Origin not allowed');
      return reply.status(error.statusCode).send(error.toJSON());
    }
    // Origin matches -- request is legitimate
    return;
  }

  // No Origin header: allow only if request uses Bearer token auth (not cookie-based).
  // Requests with cookies but no Origin may be cross-origin form submissions (CSRF).
  const hasCookies = request.headers.cookie !== undefined && request.headers.cookie.length > 0;
  const hasBearer = request.headers.authorization?.startsWith('Bearer ') ?? false;

  if (hasCookies && !hasBearer) {
    logger.warn('CSRF: Cookie-based request without Origin header', {
      method,
      url: request.url,
      ip: request.ip,
    });
    const error = forbidden('Missing Origin header');
    return reply.status(error.statusCode).send(error.toJSON());
  }

  // Bearer-only requests (or requests with no auth at all) are not CSRF-vulnerable
}
