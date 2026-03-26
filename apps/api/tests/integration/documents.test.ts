/**
 * T066 -- Document CRUD + Auto-save + Versioning
 *
 * User Story 3: Document & Category Management
 */
import { describe, it, expect } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { documents, documentVersions, categories } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:wsId/documents
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:wsId/documents', () => {
  it('should create a document with auto-generated slug and return 201', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Doc WS', slug: 'doc-ws' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'Getting Started Guide',
        content: '# Getting Started\n\nWelcome!',
      },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      id: string;
      title: string;
      slug: string;
      content: string;
      categoryId: string | null;
      currentVersion: number;
      authorId: string;
    };

    expect(body.title).toBe('Getting Started Guide');
    expect(body.slug).toBeTruthy();
    expect(body.slug.length).toBeGreaterThan(0);
    expect(body.content).toBe('# Getting Started\n\nWelcome!');
    expect(body.categoryId).toBeNull();
    expect(body.currentVersion).toBe(1);
    expect(body.authorId).toBe(user.id);

    // Verify DB: document persisted
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, body.id));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.title).toBe('Getting Started Guide');
    expect(dbDoc!.slug).toBe(body.slug);
    expect(dbDoc!.isDeleted).toBe(false);

    // Verify DB: initial version (v1) created
    const [v1] = await db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, body.id),
          eq(documentVersions.version, 1),
        ),
      );
    expect(v1).toBeDefined();
    expect(v1!.content).toBe('# Getting Started\n\nWelcome!');
  });

  it('should create a document in a specific category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Cat Doc WS', slug: 'cat-doc-ws' });

    // Create category first
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Architecture' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { id: string };

    // Create document in category
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'System Architecture',
        categoryId: cat.id,
        content: '# Architecture Overview',
      },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      id: string;
      categoryId: string | null;
    };
    expect(body.categoryId).toBe(cat.id);
  });

  it('should create a document with empty content by default', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Empty Doc WS', slug: 'empty-doc-ws' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Blank Document' },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as { content: string; currentVersion: number };
    expect(body.content).toBe('');
    expect(body.currentVersion).toBe(1);
  });

  it('should return 403 when viewer tries to create a document', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Doc WS', slug: 'rbac-doc-ws' });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { title: 'Forbidden Doc', content: '# Denied' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 401 without auth token', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Auth Doc WS', slug: 'no-auth-doc-ws' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      payload: { title: 'No Auth Doc' },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/documents
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/documents', () => {
  it('should return 200 with paginated document list', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'List Doc WS', slug: 'list-doc-ws' });

    // Create multiple documents
    for (let i = 1; i <= 3; i++) {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/documents`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { title: `Document ${i}`, content: `Content ${i}` },
      });
      expect(createRes.statusCode).toBe(201);
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      documents: Array<{
        id: string;
        title: string;
        slug: string;
        currentVersion: number;
        updatedAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    };

    expect(body.documents.length).toBe(3);
    expect(body.total).toBe(3);
    expect(body.page).toBeDefined();
    expect(body.limit).toBeDefined();
  });

  it('should filter documents by categoryId', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Filter WS', slug: 'filter-doc-ws' });

    // Create a category
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Specs' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { id: string };

    // Create docs: 2 in category, 1 in root
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Spec A', categoryId: cat.id },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Spec B', categoryId: cat.id },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Root Doc' },
    });

    // Filter by category
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents?categoryId=${cat.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      documents: Array<{ title: string; categoryId: string }>;
      total: number;
    };

    expect(body.documents.length).toBe(2);
    expect(body.total).toBe(2);
    for (const doc of body.documents) {
      expect(doc.categoryId).toBe(cat.id);
    }
  });

  it('should support pagination with page and limit', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Paginate WS', slug: 'paginate-doc-ws' });

    // Create 5 documents
    for (let i = 1; i <= 5; i++) {
      await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/documents`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { title: `Page Doc ${i}` },
      });
    }

    // Fetch page 1 with limit 2
    const page1Res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents?page=1&limit=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(page1Res.statusCode).toBe(200);

    const page1 = page1Res.json() as {
      documents: Array<{ title: string }>;
      total: number;
      page: number;
      limit: number;
    };

    expect(page1.documents.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);

    // Fetch page 3 (should have 1 document)
    const page3Res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents?page=3&limit=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(page3Res.statusCode).toBe(200);

    const page3 = page3Res.json() as {
      documents: Array<{ title: string }>;
      total: number;
    };

    expect(page3.documents.length).toBe(1);
    expect(page3.total).toBe(5);
  });

  it('should support sorting', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Sort WS', slug: 'sort-doc-ws' });

    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Bravo' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Alpha' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Charlie' },
    });

    // Sort by title ascending
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents?sort=title&order=asc`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      documents: Array<{ title: string }>;
    };

    expect(body.documents[0]!.title).toBe('Alpha');
    expect(body.documents[1]!.title).toBe('Bravo');
    expect(body.documents[2]!.title).toBe('Charlie');
  });

  it('should search documents with q parameter', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Search WS', slug: 'search-doc-ws' });

    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'React Component Guide', content: '# React components' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Vue Integration', content: '# Vue setup' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'React Hooks Deep Dive', content: '# React hooks' },
    });

    // Search for "React"
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents?q=React`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      documents: Array<{ title: string }>;
      total: number;
    };

    expect(body.total).toBeGreaterThanOrEqual(2);
    for (const doc of body.documents) {
      expect(doc.title.toLowerCase()).toContain('react');
    }
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/documents/:id
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/documents/:documentId', () => {
  it('should return 200 with document detail including content', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Detail WS', slug: 'detail-doc-ws' });

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Detailed Doc', content: '# Hello World' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { id: string };

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      id: string;
      title: string;
      slug: string;
      content: string;
      categoryId: string | null;
      authorId: string;
      currentVersion: number;
      createdAt: string;
      updatedAt: string;
    };

    expect(body.id).toBe(doc.id);
    expect(body.title).toBe('Detailed Doc');
    expect(body.content).toBe('# Hello World');
    expect(body.currentVersion).toBe(1);
    expect(body.authorId).toBe(user.id);
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should return 404 for non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Doc WS', slug: 'no-doc-ws' });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should allow viewer to read a document', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Viewer Read WS', slug: 'viewer-read-ws' });

    // Create doc as owner
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Public Doc', content: 'Readable by all members' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { id: string };

    // Viewer reads doc
    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { title: string };
    expect(body.title).toBe('Public Doc');
  });
});

// ─────────────────────────────────────────────
// PATCH /api/v1/workspaces/:wsId/documents/:id
// ─────────────────────────────────────────────
describe('PATCH /api/v1/workspaces/:wsId/documents/:documentId', () => {
  it('should update content and create a new version', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Update WS', slug: 'update-doc-ws' });

    // Create doc
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Versioned Doc', content: '# Version 1' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { id: string; currentVersion: number };
    expect(doc.currentVersion).toBe(1);

    // Update content
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: '# Version 2\n\nUpdated content' },
    });

    expect(updateRes.statusCode).toBe(200);

    const body = updateRes.json() as {
      id: string;
      currentVersion: number;
      updatedAt: string;
    };

    expect(body.currentVersion).toBe(2);

    // Verify DB: new version created
    const [v2] = await db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, doc.id),
          eq(documentVersions.version, 2),
        ),
      );
    expect(v2).toBeDefined();
    expect(v2!.content).toBe('# Version 2\n\nUpdated content');

    // Verify DB: document content updated
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.id));
    expect(dbDoc!.content).toBe('# Version 2\n\nUpdated content');
    expect(dbDoc!.currentVersion).toBe(2);
  });

  it('should update title only without creating a new version', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Title Only WS', slug: 'title-only-ws' });

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Old Title', content: '# Content' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { id: string; currentVersion: number };
    expect(doc.currentVersion).toBe(1);

    // Update title only
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'New Title' },
    });

    expect(updateRes.statusCode).toBe(200);

    const body = updateRes.json() as {
      currentVersion: number;
    };

    // Version should NOT increment for title-only changes
    expect(body.currentVersion).toBe(1);

    // Verify DB: title changed, version unchanged
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.id));
    expect(dbDoc!.title).toBe('New Title');
    expect(dbDoc!.currentVersion).toBe(1);

    // Verify DB: no v2 created
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, doc.id));
    expect(versions.length).toBe(1);
  });

  it('should enforce FIFO: keep only 20 most recent versions after 25 content updates', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'FIFO WS', slug: 'fifo-ws' });

    // Create doc (version 1)
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'FIFO Doc', content: 'v1' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { id: string };

    // Update content 24 more times (total 25 versions)
    for (let i = 2; i <= 25; i++) {
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: `v${i}` },
      });
      expect(updateRes.statusCode).toBe(200);
    }

    // Verify DB: document is at version 25
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.id));
    expect(dbDoc!.currentVersion).toBe(25);

    // Verify DB: only 20 versions are stored (FIFO pruning)
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, doc.id));
    expect(versions.length).toBe(20);

    // Verify the oldest kept version is v6 (v1-v5 pruned)
    const versionNumbers = versions.map((v) => v.version).sort((a, b) => a - b);
    expect(versionNumbers[0]).toBe(6);
    expect(versionNumbers[versionNumbers.length - 1]).toBe(25);
  });

  it('should return 403 when viewer tries to update a document', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Update WS', slug: 'rbac-update-ws' });

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Protected Doc', content: '# Protected' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { id: string };

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { content: '# Hacked' },
    });

    expect(res.statusCode).toBe(403);

    // Verify DB: content unchanged
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.id));
    expect(dbDoc!.content).toBe('# Protected');
  });

  it('should return 404 for non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Update WS', slug: 'no-update-ws' });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'ghost' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────
// Soft-deleted doc not visible in regular list
// ─────────────────────────────────────────────
describe('Document visibility', () => {
  it('should not include soft-deleted documents in regular list', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Visibility WS', slug: 'visibility-ws' });

    // Create 2 docs
    const doc1Res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Active Doc' },
    });
    expect(doc1Res.statusCode).toBe(201);

    const doc2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Deleted Doc' },
    });
    expect(doc2Res.statusCode).toBe(201);
    const doc2 = doc2Res.json() as { id: string };

    // Soft delete the second doc
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc2.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    // List documents — only active ones should appear
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(listRes.statusCode).toBe(200);

    const body = listRes.json() as {
      documents: Array<{ id: string; title: string }>;
      total: number;
    };

    expect(body.total).toBe(1);
    expect(body.documents[0]!.title).toBe('Active Doc');

    const deletedDoc = body.documents.find((d) => d.id === doc2.id);
    expect(deletedDoc).toBeUndefined();
  });
});
