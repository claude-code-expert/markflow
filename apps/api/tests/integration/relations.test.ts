/**
 * T088 -- Document Relations (PUT/GET)
 *
 * User Story 4: Document Relations & DAG Navigation
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// Helper to create a document quickly
async function createDocument(
  app: ReturnType<typeof getApp>,
  wsId: string,
  accessToken: string,
  title: string,
) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${wsId}/documents`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { title },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { document: { id: string; title: string } }).document;
}

// ─────────────────────────────────────────────
// PUT /api/v1/workspaces/:wsId/documents/:docId/relations
// ─────────────────────────────────────────────
describe('PUT /api/v1/workspaces/:wsId/documents/:docId/relations', () => {
  it('should set prev/next/related relations and return 200', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Rel WS', slug: 'rel-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');
    const docD = await createDocument(app, ws.id, accessToken, 'Doc D');

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        prev: docB.id,
        next: docC.id,
        related: [docD.id],
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      prev: { id: string; title: string } | null;
      next: { id: string; title: string } | null;
      related: Array<{ id: string; title: string }>;
    };

    expect(body.prev?.id).toBe(docB.id);
    expect(body.prev?.title).toBe('Doc B');
    expect(body.next?.id).toBe(docC.id);
    expect(body.next?.title).toBe('Doc C');
    expect(body.related).toHaveLength(1);
    expect(body.related[0]?.id).toBe(docD.id);
  });

  it('should create bidirectional prev/next relations', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Bidi WS', slug: 'bidi-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');

    // Set A.next = B
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docB.id },
    });

    // Verify B.prev = A (bidirectional)
    const bRelRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${docB.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(bRelRes.statusCode).toBe(200);
    const bRels = bRelRes.json() as {
      prev: { id: string } | null;
      next: { id: string } | null;
    };

    expect(bRels.prev?.id).toBe(docA.id);
  });

  it('should enforce max 20 related documents limit', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Max Rel WS', slug: 'max-rel-ws' });

    const mainDoc = await createDocument(app, ws.id, accessToken, 'Main Doc');

    // Create 21 documents for related
    const relatedIds: string[] = [];
    for (let i = 1; i <= 21; i++) {
      const doc = await createDocument(app, ws.id, accessToken, `Related ${i}`);
      relatedIds.push(doc.id);
    }

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${mainDoc.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { related: relatedIds },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('TOO_MANY_RELATED_DOCS');
  });

  it('should clear previous relations when updating', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Clear WS', slug: 'clear-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // Set A related to B
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { related: [docB.id] },
    });

    // Update A related to C only
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { related: [docC.id] },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = res.json() as {
      related: Array<{ id: string }>;
    };

    expect(body.related).toHaveLength(1);
    expect(body.related[0]?.id).toBe(docC.id);
  });

  it('should return 403 when viewer tries to set relations', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Rel WS', slug: 'rbac-rel-ws' });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const docA = await createDocument(app, ws.id, ownerToken, 'Doc A');
    const docB = await createDocument(app, ws.id, ownerToken, 'Doc B');

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { next: docB.id },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 404 for target document not in workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'WS1', slug: 'ws1-rel' });
    const ws2 = await createWorkspace(db, user.id, { name: 'WS2', slug: 'ws2-rel' });

    const docA = await createDocument(app, ws1.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws2.id, accessToken, 'Doc B');

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws1.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docB.id },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should reject self-reference', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Self Rel WS', slug: 'self-rel-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docA.id },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('SELF_REFERENCE');
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/documents/:docId/relations
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/documents/:docId/relations', () => {
  it('should return empty relations for a document with no relations', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Empty Rel WS', slug: 'empty-rel-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      prev: null;
      next: null;
      related: Array<unknown>;
    };

    expect(body.prev).toBeNull();
    expect(body.next).toBeNull();
    expect(body.related).toHaveLength(0);
  });

  it('should allow viewer to read relations', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'View Rel WS', slug: 'view-rel-ws' });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const docA = await createDocument(app, ws.id, ownerToken, 'Doc A');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);
  });
});
