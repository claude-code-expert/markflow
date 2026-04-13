/**
 * DAG Context API -- Document Relations Context
 *
 * GET /api/v1/workspaces/:wsId/graph/documents/:id/context
 * Returns incoming/outgoing relations with related document metadata.
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';
import type { FastifyInstance } from 'fastify';

// Helper to create a document quickly
async function createDoc(
  app: FastifyInstance,
  wsId: number,
  accessToken: string,
  title: string,
  categoryId?: number,
) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${wsId}/documents`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: categoryId != null ? { title, categoryId } : { title },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { document: { id: number; title: string } }).document;
}

// Helper to set relations on a document
async function setRelations(
  app: FastifyInstance,
  wsId: number,
  docId: number,
  accessToken: string,
  payload: { prev?: string; next?: string; related?: string[] },
) {
  const res = await app.inject({
    method: 'PUT',
    url: `/api/v1/workspaces/${wsId}/documents/${docId}/relations`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload,
  });
  expect(res.statusCode).toBe(200);
}

// Helper to set tags on a document
async function setTags(
  app: FastifyInstance,
  wsId: number,
  docId: number,
  accessToken: string,
  tagNames: string[],
) {
  const res = await app.inject({
    method: 'PUT',
    url: `/api/v1/workspaces/${wsId}/documents/${docId}/tags`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { tags: tagNames },
  });
  expect(res.statusCode).toBe(200);
}

// Helper to create a category
async function createCategory(
  app: FastifyInstance,
  wsId: number,
  accessToken: string,
  name: string,
) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${wsId}/categories`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { name },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { category: { id: number; name: string } }).category;
}

interface ContextRelation {
  type: string;
  document: {
    id: number;
    title: string;
    categoryId: number | null;
    categoryName: string | null;
    tags: string[];
  };
}

interface DagContextResponse {
  incoming: ContextRelation[];
  outgoing: ContextRelation[];
}

describe('GET /api/v1/workspaces/:wsId/graph/documents/:id/context', () => {
  it('should return outgoing and incoming relations for a document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'DAG Context WS' });

    const docA = await createDoc(app, ws.id, accessToken, 'Doc A');
    const docB = await createDoc(app, ws.id, accessToken, 'Doc B');
    const docC = await createDoc(app, ws.id, accessToken, 'Doc C');
    const docD = await createDoc(app, ws.id, accessToken, 'Doc D');

    // A → B (next), A → C (related)
    await setRelations(app, ws.id, docA.id, accessToken, {
      next: String(docB.id),
      related: [String(docC.id)],
    });

    // D → A (related)
    await setRelations(app, ws.id, docD.id, accessToken, {
      related: [String(docA.id)],
    });

    // Get A's DAG context
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/${docA.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as DagContextResponse;

    // Outgoing: A→B (next), A→C (related)
    expect(body.outgoing).toHaveLength(2);
    const outgoingTypes = body.outgoing.map((r) => ({ id: r.document.id, type: r.type }));
    expect(outgoingTypes).toContainEqual({ id: docB.id, type: 'next' });
    expect(outgoingTypes).toContainEqual({ id: docC.id, type: 'related' });

    // Incoming: D→A (related), also B→A (prev, bidirectional from A.next=B)
    expect(body.incoming.length).toBeGreaterThanOrEqual(2);
    const incomingTypes = body.incoming.map((r) => ({ id: r.document.id, type: r.type }));
    expect(incomingTypes).toContainEqual({ id: docD.id, type: 'related' });
    expect(incomingTypes).toContainEqual({ id: docB.id, type: 'prev' });
  });

  it('should include title, categoryId, categoryName, and tags for each related document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Meta WS' });

    // Create a category
    const cat = await createCategory(app, ws.id, accessToken, 'Engineering');

    // Create docs: B in category, C uncategorized
    const docA = await createDoc(app, ws.id, accessToken, 'Doc A');
    const docB = await createDoc(app, ws.id, accessToken, 'Doc B', cat.id);
    const docC = await createDoc(app, ws.id, accessToken, 'Doc C');

    // Set tags on B and C
    await setTags(app, ws.id, docB.id, accessToken, ['react', 'typescript']);
    await setTags(app, ws.id, docC.id, accessToken, ['python']);

    // A → B (next), A → C (related)
    await setRelations(app, ws.id, docA.id, accessToken, {
      next: String(docB.id),
      related: [String(docC.id)],
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/${docA.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as DagContextResponse;

    // Check doc B in outgoing
    const relB = body.outgoing.find((r) => r.document.id === docB.id);
    expect(relB).toBeDefined();
    expect(relB!.document.title).toBe('Doc B');
    expect(relB!.document.categoryId).toBe(cat.id);
    expect(relB!.document.categoryName).toBe('Engineering');
    expect(relB!.document.tags.sort()).toEqual(['react', 'typescript']);

    // Check doc C in outgoing (uncategorized)
    const relC = body.outgoing.find((r) => r.document.id === docC.id);
    expect(relC).toBeDefined();
    expect(relC!.document.title).toBe('Doc C');
    expect(relC!.document.categoryId).toBeNull();
    expect(relC!.document.categoryName).toBeNull();
    expect(relC!.document.tags).toEqual(['python']);
  });

  it('should exclude soft-deleted documents from context', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Deleted WS' });

    const docA = await createDoc(app, ws.id, accessToken, 'Doc A');
    const docB = await createDoc(app, ws.id, accessToken, 'Doc B');
    const docC = await createDoc(app, ws.id, accessToken, 'Doc C');

    // A → B (next), A → C (related)
    await setRelations(app, ws.id, docA.id, accessToken, {
      next: String(docB.id),
      related: [String(docC.id)],
    });

    // Soft-delete docB
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${docB.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/${docA.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as DagContextResponse;

    // B should be excluded from outgoing (soft-deleted)
    const hasB = body.outgoing.some((r) => r.document.id === docB.id);
    expect(hasB).toBe(false);

    // C should still be present
    const hasC = body.outgoing.some((r) => r.document.id === docC.id);
    expect(hasC).toBe(true);
  });

  it('should return 404 for a document in another workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'WS1' });
    const ws2 = await createWorkspace(db, user.id, { name: 'WS2' });

    const docInWs2 = await createDoc(app, ws2.id, accessToken, 'WS2 Doc');

    // Try to get context for WS2 doc via WS1 endpoint
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws1.id}/graph/documents/${docInWs2.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return empty arrays for a document with no relations', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Empty Rel WS' });

    const doc = await createDoc(app, ws.id, accessToken, 'Lonely Doc');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/${doc.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as DagContextResponse;

    expect(body.incoming).toEqual([]);
    expect(body.outgoing).toEqual([]);
  });

  it('should return 404 for non-existent document ID', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Not Found WS' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/999999/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should show related relation as directional (A related B appears in A outgoing B and B incoming A)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Bidir WS' });

    const docA = await createDoc(app, ws.id, accessToken, 'Doc A');
    const docB = await createDoc(app, ws.id, accessToken, 'Doc B');

    // A sets B as related
    await setRelations(app, ws.id, docA.id, accessToken, {
      related: [String(docB.id)],
    });

    // Check A's context: B should be in outgoing as related
    const resA = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/${docA.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(resA.statusCode).toBe(200);
    const bodyA = resA.json() as DagContextResponse;
    expect(bodyA.outgoing).toHaveLength(1);
    expect(bodyA.outgoing[0]!.document.id).toBe(docB.id);
    expect(bodyA.outgoing[0]!.type).toBe('related');

    // Check B's context: A should be in incoming as related
    const resB = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph/documents/${docB.id}/context`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(resB.statusCode).toBe(200);
    const bodyB = resB.json() as DagContextResponse;
    expect(bodyB.incoming).toHaveLength(1);
    expect(bodyB.incoming[0]!.document.id).toBe(docA.id);
    expect(bodyB.incoming[0]!.type).toBe('related');
  });
});
