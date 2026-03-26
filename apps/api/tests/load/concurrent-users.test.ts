/**
 * T126 -- Load Test: 50 Concurrent Users
 *
 * Creates 50 users each owning a workspace, then fires concurrent API calls
 * and asserts no errors and reasonable response times.
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace } from '../helpers/factory.js';

interface UserContext {
  userId: string;
  accessToken: string;
  workspaceId: string;
}

describe('Load: 50 concurrent users', () => {
  it('concurrent workspace list requests should all succeed', async () => {
    const app = getApp();
    const db = getDb();

    // Create 50 users, each with a workspace
    const contexts: UserContext[] = [];

    for (let i = 0; i < 50; i++) {
      const { user, accessToken } = await createUser(db, {
        email: `concurrent-${i}@test.com`,
      });
      const workspace = await createWorkspace(db, user.id, {
        name: `Concurrent WS ${i}`,
        slug: `concurrent-ws-${i}`,
      });
      contexts.push({
        userId: user.id,
        accessToken,
        workspaceId: workspace.id,
      });
    }

    // Fire all 50 requests concurrently
    const start = performance.now();

    const results = await Promise.all(
      contexts.map(async (ctx) => {
        const reqStart = performance.now();
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/workspaces',
          headers: { authorization: `Bearer ${ctx.accessToken}` },
        });
        const elapsed = performance.now() - reqStart;
        return { statusCode: res.statusCode, elapsed };
      }),
    );

    const totalElapsed = performance.now() - start;

    // All should succeed
    const failures = results.filter((r) => r.statusCode !== 200);
    expect(failures.length).toBe(0);

    // Response time analysis
    const times = results.map((r) => r.elapsed);
    times.sort((a, b) => a - b);

    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const p95Index = Math.ceil(0.95 * times.length) - 1;
    const p95 = times[p95Index]!;
    const max = times[times.length - 1]!;

    process.stdout.write(
      `\n  Concurrent users load test (workspace list):\n` +
      `    Users: 50\n` +
      `    Total wall-clock: ${totalElapsed.toFixed(1)}ms\n` +
      `    Avg per-request: ${avg.toFixed(1)}ms\n` +
      `    P95: ${p95.toFixed(1)}ms\n` +
      `    Max: ${max.toFixed(1)}ms\n`,
    );

    // P95 should be under 2 seconds even under concurrent load
    expect(p95).toBeLessThan(2000);
  }, 120_000);

  it('concurrent document creation should all succeed', async () => {
    const app = getApp();
    const db = getDb();

    // Create 50 users in a shared workspace
    const { user: owner, accessToken: ownerToken } = await createUser(db, {
      email: 'concurrent-owner@test.com',
    });
    const workspace = await createWorkspace(db, owner.id, {
      name: 'Concurrent Doc WS',
      slug: 'concurrent-doc-ws',
    });

    const userTokens: string[] = [ownerToken];

    // Create 49 more editors
    for (let i = 0; i < 49; i++) {
      const { user, accessToken } = await createUser(db, {
        email: `concurrent-editor-${i}@test.com`,
      });
      // Add as editor
      const { addMember } = await import('../helpers/factory.js');
      await addMember(db, workspace.id, user.id, 'editor');
      userTokens.push(accessToken);
    }

    // Fire 50 concurrent document creation requests
    const start = performance.now();

    const results = await Promise.all(
      userTokens.map(async (token, i) => {
        const reqStart = performance.now();
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/workspaces/${workspace.id}/documents`,
          headers: { authorization: `Bearer ${token}` },
          payload: { title: `Concurrent Doc ${i}` },
        });
        const elapsed = performance.now() - reqStart;
        return { statusCode: res.statusCode, elapsed };
      }),
    );

    const totalElapsed = performance.now() - start;

    // All should succeed (201)
    const failures = results.filter((r) => r.statusCode !== 201);
    expect(failures.length).toBe(0);

    const times = results.map((r) => r.elapsed);
    times.sort((a, b) => a - b);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const p95Index = Math.ceil(0.95 * times.length) - 1;
    const p95 = times[p95Index]!;

    process.stdout.write(
      `\n  Concurrent users load test (document creation):\n` +
      `    Users: 50\n` +
      `    Total wall-clock: ${totalElapsed.toFixed(1)}ms\n` +
      `    Avg per-request: ${avg.toFixed(1)}ms\n` +
      `    P95: ${p95.toFixed(1)}ms\n`,
    );

    expect(p95).toBeLessThan(2000);
  }, 120_000);
});
