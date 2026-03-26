/**
 * T089 -- Circular Reference Prevention
 *
 * User Story 4: Document Relations & DAG Navigation
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace } from '../helpers/factory.js';

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

async function setRelations(
  app: ReturnType<typeof getApp>,
  wsId: string,
  docId: string,
  accessToken: string,
  payload: { prev?: string; next?: string; related?: string[] },
) {
  return app.inject({
    method: 'PUT',
    url: `/api/v1/workspaces/${wsId}/documents/${docId}/relations`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload,
  });
}

describe('Circular reference prevention', () => {
  it('should prevent A→B→C→A cycle via next chain', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Cycle WS', slug: 'cycle-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // A.next = B (OK)
    const res1 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res1.statusCode).toBe(200);

    // B.next = C (OK)
    const res2 = await setRelations(app, ws.id, docB.id, accessToken, { next: docC.id });
    expect(res2.statusCode).toBe(200);

    // C.next = A (CYCLE! should fail)
    const res3 = await setRelations(app, ws.id, docC.id, accessToken, { next: docA.id });
    expect(res3.statusCode).toBe(400);
    const body = res3.json() as { error: { code: string } };
    expect(body.error.code).toBe('CIRCULAR_REFERENCE');
  });

  it('should prevent direct A↔B cycle with prev/next', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Direct Cycle WS', slug: 'direct-cycle-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');

    // A.next = B (OK; creates bidirectional: A.next=B, B.prev=A)
    const res1 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res1.statusCode).toBe(200);

    // B.next = A (CYCLE! A already has next=B, B.prev=A, so B.next=A would create cycle)
    const res2 = await setRelations(app, ws.id, docB.id, accessToken, { next: docA.id });
    expect(res2.statusCode).toBe(400);
    const body = res2.json() as { error: { code: string } };
    expect(body.error.code).toBe('CIRCULAR_REFERENCE');
  });

  it('should prevent cycle via prev relation (A.prev = C when chain is A→B→C)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Prev Cycle WS', slug: 'prev-cycle-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // A.next = B
    const res1 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res1.statusCode).toBe(200);

    // B.next = C
    const res2 = await setRelations(app, ws.id, docB.id, accessToken, { next: docC.id });
    expect(res2.statusCode).toBe(200);

    // C.prev = A would mean A→C, but A already has A→B→C (A's next chain reaches C)
    // Actually: C.prev = A means A → C, and the existing chain is A→B→C
    // This would create: A → C (prev-bidirectional) AND A → B → C (existing)
    // Let's test: setting A.prev = C. That means C→A chain.
    // Existing: A→B→C. Adding C→A creates cycle.
    const res3 = await setRelations(app, ws.id, docA.id, accessToken, { prev: docC.id });
    expect(res3.statusCode).toBe(400);
    const body = res3.json() as { error: { code: string } };
    expect(body.error.code).toBe('CIRCULAR_REFERENCE');
  });

  it('should allow valid non-cyclic chain replacement', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Replace WS', slug: 'replace-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // A.next = B (OK)
    const res1 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res1.statusCode).toBe(200);

    // Replace: A.next = C (OK — B relation cleared)
    const res2 = await setRelations(app, ws.id, docA.id, accessToken, { next: docC.id });
    expect(res2.statusCode).toBe(200);

    // Verify A.next = C
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${docA.id}/relations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const body = getRes.json() as { next: { id: string } | null };
    expect(body.next?.id).toBe(docC.id);
  });

  it('should not flag related docs as circular (related is non-directional)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Related Cycle WS', slug: 'related-cycle-ws' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');

    // A.next = B (OK)
    const res1 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res1.statusCode).toBe(200);

    // B has related = [A] (OK — related is not part of the DAG prev/next chain)
    const res2 = await setRelations(app, ws.id, docB.id, accessToken, { related: [docA.id] });
    expect(res2.statusCode).toBe(200);
  });
});
