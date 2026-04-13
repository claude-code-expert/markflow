/**
 * Category Context API — ancestors & descendants
 *
 * Phase 03, Plan 01: Category Graph REST endpoints
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

interface AncestorResponse {
  id: number;
  name: string;
  parentId: number | null;
  depth: number;
  createdAt: string;
}

async function createCategory(
  wsId: number,
  token: string,
  name: string,
  parentId?: number,
) {
  const app = getApp();
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${wsId}/categories`,
    headers: { authorization: `Bearer ${token}` },
    payload: parentId ? { name, parentId } : { name },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { category: { id: number; name: string } }).category;
}

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/categories/:id/ancestors
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/categories/:id/ancestors', () => {
  it('should return ancestors in root-to-leaf order for 3-depth chain', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Ancestor WS' });

    // Create 3-depth chain: Root > Mid > Leaf
    const root = await createCategory(ws.id, accessToken, 'Root');
    const mid = await createCategory(ws.id, accessToken, 'Mid', root.id);
    const leaf = await createCategory(ws.id, accessToken, 'Leaf', mid.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${leaf.id}/ancestors`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { ancestors: AncestorResponse[] };
    expect(body.ancestors).toHaveLength(2);
    // Root first, then Mid (root-to-leaf order)
    expect(body.ancestors[0]!.id).toBe(root.id);
    expect(body.ancestors[0]!.name).toBe('Root');
    expect(body.ancestors[1]!.id).toBe(mid.id);
    expect(body.ancestors[1]!.name).toBe('Mid');
  });

  it('should include id, name, parentId, depth, createdAt in each ancestor', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Fields WS' });

    const root = await createCategory(ws.id, accessToken, 'FieldRoot');
    const child = await createCategory(ws.id, accessToken, 'FieldChild', root.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${child.id}/ancestors`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { ancestors: AncestorResponse[] };
    expect(body.ancestors).toHaveLength(1);

    const ancestor = body.ancestors[0]!;
    expect(ancestor.id).toBe(root.id);
    expect(ancestor.name).toBe('FieldRoot');
    expect(ancestor.parentId).toBeNull();
    expect(typeof ancestor.depth).toBe('number');
    expect(ancestor.createdAt).toBeDefined();
  });

  it('should return empty array for root category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Root Ancestor WS' });

    const root = await createCategory(ws.id, accessToken, 'Standalone');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${root.id}/ancestors`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { ancestors: AncestorResponse[] };
    expect(body.ancestors).toEqual([]);
  });

  it('should return 404 for non-existent category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'NotFound WS' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/999999/ancestors`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for category from different workspace (isolation)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'WS One' });
    const ws2 = await createWorkspace(db, user.id, { name: 'WS Two' });

    const cat = await createCategory(ws1.id, accessToken, 'WS1 Category');

    // Try to access ws1's category via ws2
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}/categories/${cat.id}/ancestors`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
