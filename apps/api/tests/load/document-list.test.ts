/**
 * T125 -- Load Test: Document List Performance
 *
 * Creates 1,000 documents in a workspace and measures the paginated
 * list query response time. Asserts p95 < 500ms.
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace } from '../helpers/factory.js';
import { documents } from '@markflow/db';

describe('Load: 1,000 document workspace list', () => {
  it('paginated list should respond within 500ms (p95)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db, { email: 'load-list@test.com' });
    const workspace = await createWorkspace(db, user.id, { name: 'Load WS', slug: 'load-ws-list' });

    // Bulk insert 1,000 documents
    const docValues = Array.from({ length: 1000 }, (_, i) => ({
      workspaceId: workspace.id,
      authorId: user.id,
      title: `Load Test Document ${i + 1}`,
      slug: `load-test-document-${i + 1}`,
      content: `Content for document ${i + 1}. `.repeat(10),
      currentVersion: 1,
      isDeleted: false,
    }));

    // Insert in batches of 100 to avoid query size limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < docValues.length; i += BATCH_SIZE) {
      const batch = docValues.slice(i, i + BATCH_SIZE);
      await db.insert(documents).values(batch);
    }

    // Measure response times over multiple requests
    const responseTimes: number[] = [];
    const ITERATIONS = 20;

    for (let i = 0; i < ITERATIONS; i++) {
      const page = (i % 5) + 1; // Vary pages 1-5
      const start = performance.now();

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${workspace.id}/documents?page=${page}&limit=20`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      const elapsed = performance.now() - start;
      responseTimes.push(elapsed);

      expect(res.statusCode).toBe(200);

      const body = res.json() as { documents: unknown[]; total: number };
      expect(body.total).toBe(1000);
      expect(body.documents.length).toBeLessThanOrEqual(20);
    }

    // Calculate p95
    responseTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(0.95 * responseTimes.length) - 1;
    const p95 = responseTimes[p95Index]!;

    // Log for visibility
    const avg = responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;
    const min = responseTimes[0]!;
    const max = responseTimes[responseTimes.length - 1]!;

    // eslint-disable-next-line no-console
    process.stdout.write(
      `\n  Document list load test results:\n` +
      `    Iterations: ${ITERATIONS}\n` +
      `    Min: ${min.toFixed(1)}ms\n` +
      `    Avg: ${avg.toFixed(1)}ms\n` +
      `    P95: ${p95.toFixed(1)}ms\n` +
      `    Max: ${max.toFixed(1)}ms\n`,
    );

    expect(p95).toBeLessThan(500);
  }, 120_000); // Extended timeout: 2 minutes
});
