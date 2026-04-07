import { beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, type Db } from '@markflow/db';
import { buildApp } from '../../src/index.js';
import { resetCounter } from './factory.js';
import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let db: Db;
let app: FastifyInstance;

function resolveTestDatabaseUrl(): string {
  // 1. 환경변수에 TEST_DATABASE_URL이 있으면 사용
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  // 2. .env.local에서 DATABASE_URL을 읽어 _test suffix 추가
  try {
    const envPath = resolve(import.meta.dirname ?? '.', '../../../../.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = /^DATABASE_URL=(.+)$/.exec(line.trim());
      if (match?.[1]) {
        const url = new URL(match[1]);
        const dbName = url.pathname.slice(1);
        if (!dbName.endsWith('_test')) {
          url.pathname = `/${dbName}_test`;
        }
        return url.toString();
      }
    }
  } catch {
    // fall through
  }

  throw new Error(
    'TEST_DATABASE_URL을 결정할 수 없습니다.\n' +
    'TEST_DATABASE_URL 환경변수를 설정하거나, .env.local에 DATABASE_URL이 있어야 합니다.',
  );
}

const TEST_DATABASE_URL = resolveTestDatabaseUrl();

// 개발 DB 보호: _test로 끝나지 않으면 차단
const testDbName = new URL(TEST_DATABASE_URL).pathname.slice(1);
if (!testDbName.endsWith('_test')) {
  throw new Error(
    `테스트 DB 이름이 '_test'로 끝나지 않습니다: ${testDbName}\n` +
    '개발 DB 데이터 손실 방지를 위해 테스트 전용 DB를 사용하세요.',
  );
}

beforeAll(async () => {
  db = createDb(TEST_DATABASE_URL);
  // buildApp()이 사용하는 DATABASE_URL도 테스트 DB로 덮어쓰기
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  app = await buildApp();
  (app as unknown as { db: Db }).db = db;
});

beforeEach(async () => {
  resetCounter();
  // Clean all tables before each test (reverse FK order)
  await db.execute(sql`
    TRUNCATE comments, embed_tokens, document_tags, tags, document_relations, document_versions, documents, category_closure, categories, join_requests, invitations, refresh_tokens, workspace_members, workspaces, users CASCADE
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
