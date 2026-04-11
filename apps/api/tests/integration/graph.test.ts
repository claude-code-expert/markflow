/**
 * T090 -- Workspace Graph API
 *
 * User Story 4: Document Relations & DAG Navigation
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// Helper to create a document quickly — returns id as string for use in relation payloads
async function createDocument(
  app: ReturnType<typeof getApp>,
  wsId: number,
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
  const doc = (res.json() as { document: { id: number; title: string } }).document;
  // Convert numeric id to string for use in relation API payloads
  return { id: String(doc.id), title: doc.title };
}

interface GraphNode {
  id: number;
  title: string;
  categoryId: number | null;
}

interface GraphEdge {
  source: number;
  target: number;
  type: string;
}

interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

describe('GET /api/v1/workspaces/:wsId/graph', () => {
  it('should return nodes and edges for workspace graph', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Graph WS' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // Set relations: A → B → C (set deeper links first to avoid bidirectional cleanup)
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docB.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docC.id },
    });

    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docB.id, related: [docC.id] },
    });

    // Get graph
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as GraphResponse;

    // Verify nodes
    expect(body.nodes).toHaveLength(3);
    const nodeIds = body.nodes.map((n) => String(n.id));
    expect(nodeIds).toContain(docA.id);
    expect(nodeIds).toContain(docB.id);
    expect(nodeIds).toContain(docC.id);

    // Verify nodes have titles
    const nodeA = body.nodes.find((n) => String(n.id) === docA.id);
    expect(nodeA?.title).toBe('Doc A');

    // Verify edges exist
    expect(body.edges.length).toBeGreaterThan(0);

    // Check for A.next = B edge
    const aToB = body.edges.find(
      (e) => String(e.source) === docA.id && String(e.target) === docB.id && e.type === 'next',
    );
    expect(aToB).toBeDefined();

    // Check for related edge A → C
    const aToC = body.edges.find(
      (e) => String(e.source) === docA.id && String(e.target) === docC.id && e.type === 'related',
    );
    expect(aToC).toBeDefined();
  });

  it('should return empty graph for workspace with no documents', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Empty Graph WS' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as GraphResponse;
    expect(body.nodes).toHaveLength(0);
    expect(body.edges).toHaveLength(0);
  });

  it('should not include deleted documents in graph', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Del Graph WS' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');

    // Set relation
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docB.id },
    });

    // Soft-delete docB
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${docB.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Get graph
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as GraphResponse;

    // Should only have docA
    expect(body.nodes).toHaveLength(1);
    expect(String(body.nodes[0]?.id)).toBe(docA.id);

    // No edges involving deleted doc
    const edgesWithB = body.edges.filter(
      (e) => String(e.source) === docB.id || String(e.target) === docB.id,
    );
    expect(edgesWithB).toHaveLength(0);
  });

  it('should not leak documents across workspaces', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'Graph WS1' });
    const ws2 = await createWorkspace(db, user.id, { name: 'Graph WS2' });

    await createDocument(app, ws1.id, accessToken, 'WS1 Doc');
    await createDocument(app, ws2.id, accessToken, 'WS2 Doc');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws1.id}/graph`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as GraphResponse;
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0]?.title).toBe('WS1 Doc');
  });

  it('should allow viewer to access graph', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Viewer Graph WS' });

    await createDocument(app, ws.id, ownerToken, 'Doc A');

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('should not include cross-workspace relations in graph edges', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'Isolation WS1' });
    const ws2 = await createWorkspace(db, user.id, { name: 'Isolation WS2' });

    // Create docs in WS1
    const docA = await createDocument(app, ws1.id, accessToken, 'WS1 Doc A');
    const docB = await createDocument(app, ws1.id, accessToken, 'WS1 Doc B');

    // Create docs in WS2 and set up relations there
    const docC = await createDocument(app, ws2.id, accessToken, 'WS2 Doc C');
    const docD = await createDocument(app, ws2.id, accessToken, 'WS2 Doc D');

    // Set relation in WS1: A → B
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws1.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docB.id },
    });

    // Set relation in WS2: C → D
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws2.id}/documents/${docC.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { next: docD.id },
    });

    // Query WS1 graph — should only see WS1 edges
    const res1 = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws1.id}/graph`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res1.statusCode).toBe(200);
    const body1 = res1.json() as GraphResponse;

    // WS1 should only have 2 nodes (A and B)
    expect(body1.nodes).toHaveLength(2);
    const nodeIds1 = body1.nodes.map((n) => String(n.id));
    expect(nodeIds1).toContain(docA.id);
    expect(nodeIds1).toContain(docB.id);
    expect(nodeIds1).not.toContain(docC.id);
    expect(nodeIds1).not.toContain(docD.id);

    // WS1 edges should only contain A→B, not C→D
    const ws2Edges = body1.edges.filter(
      (e) =>
        String(e.source) === docC.id ||
        String(e.target) === docC.id ||
        String(e.source) === docD.id ||
        String(e.target) === docD.id,
    );
    expect(ws2Edges).toHaveLength(0);

    // Verify A→B edge exists
    const aToBEdge = body1.edges.find(
      (e) => String(e.source) === docA.id && String(e.target) === docB.id && e.type === 'next',
    );
    expect(aToBEdge).toBeDefined();

    // Query WS2 graph — should only see WS2 edges
    const res2 = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}/graph`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = res2.json() as GraphResponse;

    expect(body2.nodes).toHaveLength(2);
    const nodeIds2 = body2.nodes.map((n) => String(n.id));
    expect(nodeIds2).toContain(docC.id);
    expect(nodeIds2).toContain(docD.id);
    expect(nodeIds2).not.toContain(docA.id);
  });

  it('should return 401 without auth token', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Auth Graph WS' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/graph`,
    });

    expect(res.statusCode).toBe(401);
  });
});
