import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { InjectOptions } from 'light-my-request';
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

  const opts: InjectOptions = {
    method: req.method as InjectOptions['method'],
    url: req.url ?? '/',
    headers: req.headers as Record<string, string>,
    payload: req.body as string,
  };

  const response = await fastify.inject(opts);

  res.status(response.statusCode);
  for (const [key, value] of Object.entries(response.headers)) {
    if (value !== undefined) {
      res.setHeader(key, value as string);
    }
  }
  res.send(response.body);
}
