import { beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, type Db } from '@markflow/db';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';

let db: Db;
let app: FastifyInstance;

const TEST_DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://markflow:markflow@localhost:5432/markflow_test';

beforeAll(async () => {
  db = createDb(TEST_DATABASE_URL);
  app = await buildApp();
  (app as unknown as { db: Db }).db = db;
});

beforeEach(async () => {
  // Clean all tables before each test (reverse FK order)
  await db.execute(sql`
    TRUNCATE document_tags, tags, document_relations, document_versions, documents, category_closure, categories, join_requests, invitations, refresh_tokens, workspace_members, workspaces, users CASCADE
  `);
});

afterAll(async () => {
  await app.close();
});

export function getDb() {
  return db;
}

export function getApp() {
  return app;
}
