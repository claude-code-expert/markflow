import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

function parseOrigins(raw: string): string | string[] {
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (origins.length === 1) {
    return origins[0]!;
  }
  return origins;
}

/**
 * Registers @fastify/cors with origin(s) from CORS_ORIGIN env var.
 * Supports comma-separated multiple origins.
 */
export async function registerCors(app: FastifyInstance): Promise<void> {
  const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const origin = parseOrigins(rawOrigin);

  await app.register(cors, {
    origin,
    credentials: true,
  });
}
