/**
 * T089 -- Circular Reference Prevention
 *
 * User Story 4: Document Relations & DAG Navigation
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace } from '../helpers/factory.js';

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
  return { id: String(doc.id), title: doc.title };
}

async function setRelations(
  app: ReturnType<typeof getApp>,
  wsId: number,
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
    const ws = await createWorkspace(db, user.id, { name: 'Cycle WS' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // Build chain A→B→C: set deeper links first to avoid bidirectional cleanup
    // B.next = C (creates B→C, C.prev=B)
    const res1 = await setRelations(app, ws.id, docB.id, accessToken, { next: docC.id });
    expect(res1.statusCode).toBe(200);

    // A.next = B (creates A→B, B.prev=A; B→C remains intact)
    const res2 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res2.statusCode).toBe(200);

    // C.next = A (CYCLE! chain is A→B→C, adding C→A creates cycle)
    const res3 = await setRelations(app, ws.id, docC.id, accessToken, { next: docA.id });
    expect(res3.statusCode).toBe(400);
    const body = res3.json() as { error: { code: string } };
    expect(body.error.code).toBe('CIRCULAR_REFERENCE');
  });

  it('should prevent direct A↔B cycle with prev/next', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Direct Cycle WS' });

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
    const ws = await createWorkspace(db, user.id, { name: 'Prev Cycle WS' });

    const docA = await createDocument(app, ws.id, accessToken, 'Doc A');
    const docB = await createDocument(app, ws.id, accessToken, 'Doc B');
    const docC = await createDocument(app, ws.id, accessToken, 'Doc C');

    // Build chain A→B→C by setting B's relations in one call, then A.next=B
    // First: B.next = C (creates B→C, C.prev=B)
    const res1 = await setRelations(app, ws.id, docB.id, accessToken, { next: docC.id });
    expect(res1.statusCode).toBe(200);

    // Then: A.next = B (creates A→B, B.prev=A, and importantly does NOT clear B→C)
    // Note: setRelations(A, {next: B}) clears A's relations and bidirectional to A,
    // then inserts A.next=B and B.prev=A. B.next=C remains intact.
    const res2 = await setRelations(app, ws.id, docA.id, accessToken, { next: docB.id });
    expect(res2.statusCode).toBe(200);

    // Now chain is: A→B→C (A.next=B, B.prev=A, B.next=C, C.prev=B)
    // Setting A.prev = C means C→A (bidirectional). This creates cycle: C→A→B→C
    const res3 = await setRelations(app, ws.id, docA.id, accessToken, { prev: docC.id });
    expect(res3.statusCode).toBe(400);
    const body = res3.json() as { error: { code: string } };
    expect(body.error.code).toBe('CIRCULAR_REFERENCE');
  });

  it('should allow valid non-cyclic chain replacement', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Replace WS' });

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
    const body = getRes.json() as { next: { id: number } | null };
    expect(String(body.next?.id)).toBe(docC.id);
  });

  it('should not flag related docs as circular (related is non-directional)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Related Cycle WS' });

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
