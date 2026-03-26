/**
 * T109 -- Tags CRUD
 *
 * User Story 7: Tags
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// PUT /api/v1/workspaces/:wsId/documents/:docId/tags
// ─────────────────────────────────────────────
describe('PUT /api/v1/workspaces/:wsId/documents/:docId/tags', () => {
  it('should set tags on a document and return 200', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Tag WS', slug: 'tag-ws' });

    // Create document
    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Tagged Doc' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string } };

    // Set tags
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['react', 'typescript', 'frontend'] },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { tags: Array<{ id: string; name: string }> };
    expect(body.tags.length).toBe(3);

    const names = body.tags.map((t) => t.name).sort();
    expect(names).toEqual(['frontend', 'react', 'typescript']);
  });

  it('should replace existing tags when called again', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Replace Tag WS', slug: 'replace-tag-ws' });

    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Replace Tag Doc' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string } };

    // Set initial tags
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['old-tag-1', 'old-tag-2'] },
    });

    // Replace with new tags
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['new-tag-1'] },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { tags: Array<{ id: string; name: string }> };
    expect(body.tags.length).toBe(1);
    expect(body.tags[0]!.name).toBe('new-tag-1');
  });

  it('should return 400 TOO_MANY_TAGS when exceeding 30 tags', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Max Tag WS', slug: 'max-tag-ws' });

    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Max Tags Doc' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string } };

    // 31 tags
    const tooManyTags = Array.from({ length: 31 }, (_, i) => `tag-${i + 1}`);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: tooManyTags },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('TOO_MANY_TAGS');
  });

  it('should return 403 when viewer tries to set tags', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Tag WS', slug: 'rbac-tag-ws' });

    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Protected Tag Doc' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string } };

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { tags: ['denied'] },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should clear all tags when empty array is provided', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Clear Tag WS', slug: 'clear-tag-ws' });

    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Clear Tags Doc' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string } };

    // Set some tags
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['tag-a', 'tag-b'] },
    });

    // Clear all tags
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: [] },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { tags: Array<{ id: string; name: string }> };
    expect(body.tags.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/tags
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/tags', () => {
  it('should return workspace tags with document counts', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'List Tag WS', slug: 'list-tag-ws' });

    // Create two docs and tag them
    const doc1Res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Doc A' },
    });
    const doc1 = doc1Res.json() as { document: { id: string } };

    const doc2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Doc B' },
    });
    const doc2 = doc2Res.json() as { document: { id: string } };

    // Doc A: [shared-tag, unique-a]
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc1.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['shared-tag', 'unique-a'] },
    });

    // Doc B: [shared-tag, unique-b]
    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc2.document.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['shared-tag', 'unique-b'] },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/tags`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      tags: Array<{ id: string; name: string; documentCount: number }>;
    };

    expect(body.tags.length).toBe(3);

    const sharedTag = body.tags.find((t) => t.name === 'shared-tag');
    expect(sharedTag).toBeDefined();
    expect(sharedTag!.documentCount).toBe(2);

    const uniqueA = body.tags.find((t) => t.name === 'unique-a');
    expect(uniqueA).toBeDefined();
    expect(uniqueA!.documentCount).toBe(1);
  });

  it('should allow viewer to list workspace tags', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Viewer Tag WS', slug: 'viewer-tag-ws' });

    // Owner creates a doc and tags it
    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Owner Doc' },
    });
    const doc = docRes.json() as { document: { id: string } };

    await app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/tags`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { tags: ['visible-tag'] },
    });

    // Viewer lists tags
    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/tags`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { tags: Array<{ name: string }> };
    expect(body.tags.length).toBe(1);
    expect(body.tags[0]!.name).toBe('visible-tag');
  });
});
