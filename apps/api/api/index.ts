import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/index.js';

type FastifyApp = Awaited<ReturnType<typeof buildApp>>;
let app: FastifyApp | undefined;

async function getApp(): Promise<FastifyApp> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fastify = await getApp();

  const response = await fastify.inject({
    method: req.method as string,
    url: req.url as string,
    headers: req.headers as Record<string, string>,
    payload: req.body as string,
  });

  res.status(response.statusCode);
  const headers = response.headers as Record<string, string | string[]>;
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }
  res.send(response.body);
}
