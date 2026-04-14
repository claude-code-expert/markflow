/**
 * Category Context API — ancestors & descendants
 *
 * Phase 03, Plan 01: Category Graph REST endpoints
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember, createDocument } from '../helpers/factory.js';

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

// ─────────────────────────────────────────────
// Helpers for descendants
// ─────────────────────────────────────────────

interface DescendantTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  children: DescendantTreeNode[];
  documents: Array<{ id: number; title: string; updatedAt: string }>;
}

async function createDocInCategory(
  wsId: number,
  token: string,
  title: string,
  categoryId: number,
) {
  const app = getApp();
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${wsId}/documents`,
    headers: { authorization: `Bearer ${token}` },
    payload: { title, categoryId },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { document: { id: number; title: string } }).document;
}

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/categories/:id/descendants
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/categories/:id/descendants', () => {
  it('should return nested tree structure for 3-depth chain', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Descendant WS' });

    // Create 3-depth chain: Root > Mid > Leaf
    const root = await createCategory(ws.id, accessToken, 'Root');
    const mid = await createCategory(ws.id, accessToken, 'Mid', root.id);
    const leaf = await createCategory(ws.id, accessToken, 'Leaf', mid.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${root.id}/descendants`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { children: DescendantTreeNode[]; documents: unknown[] };
    // Root's children should contain Mid
    expect(body.children).toHaveLength(1);
    expect(body.children[0]!.id).toBe(mid.id);
    expect(body.children[0]!.name).toBe('Mid');
    // Mid's children should contain Leaf
    expect(body.children[0]!.children).toHaveLength(1);
    expect(body.children[0]!.children[0]!.id).toBe(leaf.id);
    expect(body.children[0]!.children[0]!.name).toBe('Leaf');
  });

  it('should include documents in each category node', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Docs Descendant WS' });

    const root = await createCategory(ws.id, accessToken, 'DocRoot');
    const child = await createCategory(ws.id, accessToken, 'DocChild', root.id);

    // Create documents in child category
    const doc1 = await createDocInCategory(ws.id, accessToken, 'Doc A', child.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${root.id}/descendants`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { children: DescendantTreeNode[]; documents: unknown[] };
    expect(body.children).toHaveLength(1);
    const childNode = body.children[0]!;
    expect(childNode.documents).toHaveLength(1);
    expect(childNode.documents[0]!.id).toBe(doc1.id);
    expect(childNode.documents[0]!.title).toBe('Doc A');
    expect(childNode.documents[0]!.updatedAt).toBeDefined();
  });

  it('should return empty children for leaf category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Leaf Descendant WS' });

    const leaf = await createCategory(ws.id, accessToken, 'LeafOnly');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${leaf.id}/descendants`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { children: DescendantTreeNode[]; documents: unknown[] };
    expect(body.children).toEqual([]);
    expect(body.documents).toEqual([]);
  });

  it('should exclude soft-deleted documents', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Deleted Docs WS' });

    const root = await createCategory(ws.id, accessToken, 'DelDocRoot');
    const child = await createCategory(ws.id, accessToken, 'DelDocChild', root.id);

    // Create 2 documents in child
    const doc1 = await createDocInCategory(ws.id, accessToken, 'Active Doc', child.id);
    const doc2 = await createDocInCategory(ws.id, accessToken, 'Deleted Doc', child.id);

    // Soft-delete doc2 (move to trash)
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc2.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${root.id}/descendants`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { children: DescendantTreeNode[]; documents: unknown[] };
    const childNode = body.children[0]!;
    expect(childNode.documents).toHaveLength(1);
    expect(childNode.documents[0]!.id).toBe(doc1.id);
  });

  it('should return 404 for category from different workspace (isolation)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'Desc WS One' });
    const ws2 = await createWorkspace(db, user.id, { name: 'Desc WS Two' });

    const cat = await createCategory(ws1.id, accessToken, 'WS1 Desc Category');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}/categories/${cat.id}/descendants`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
