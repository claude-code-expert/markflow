/**
 * T066 -- Document CRUD + Auto-save + Versioning
 *
 * User Story 3: Document & Category Management
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { documents, documentVersions } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:wsId/documents
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:wsId/documents', () => {
  it('should create a document and return 201', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Doc WS' });

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
      document: {
        id: number;
        title: string;
        content: string;
        categoryId: number | null;
        currentVersion: number;
        authorId: number;
      };
    };

    expect(body.document.title).toBe('Getting Started Guide');
    expect(body.document.content).toBe('# Getting Started\n\nWelcome!');
    expect(body.document.categoryId).toBeNull();
    expect(body.document.currentVersion).toBe(1);
    expect(body.document.authorId).toBe(user.id);

    // Verify DB: document persisted
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, body.document.id));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.title).toBe('Getting Started Guide');
    expect(dbDoc!.slug).toBe(body.document.slug);
    expect(dbDoc!.isDeleted).toBe(false);

    // Verify DB: initial version (v1) created
    const [v1] = await db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, body.document.id),
          eq(documentVersions.version, 1),
        ),
      );
    expect(v1).toBeDefined();
    // Initial version has empty content (content is set via PATCH)
    expect(v1!.content).toBe('');
  });

  it('should create a document in a specific category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Cat Doc WS' });

    // Create category first
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Architecture' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { category: { id: number } };

    // Create document in category
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'System Architecture',
        categoryId: String(cat.category.id),
      },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      document: { id: number; categoryId: number | null };
    };
    expect(body.document.categoryId).toBe(cat.category.id);
  });

  it('should create a document with empty content by default', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Empty Doc WS' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Blank Document' },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as { document: { content: string; currentVersion: number } };
    // Documents are created with empty content; content is set via PATCH
    expect(body.document.content).toBe('');
    expect(body.document.currentVersion).toBe(1);
  });

  it('should return 403 when viewer tries to create a document', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Doc WS' });

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
    const ws = await createWorkspace(db, user.id, { name: 'No Auth Doc WS' });

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
    const ws = await createWorkspace(db, user.id, { name: 'List Doc WS' });

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
        id: number;
        title: string;
        slug: string;
        currentVersion: number;
        updatedAt: string;
      }>;
      total: number;
      page: number;
    };

    expect(body.documents.length).toBe(3);
    expect(body.total).toBe(3);
    expect(body.page).toBeDefined();
  });

  it('should filter documents by categoryId', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Filter WS' });

    // Create a category
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Specs' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { category: { id: number } };

    // Create docs: 2 in category, 1 in root
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Spec A', categoryId: String(cat.category.id) },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Spec B', categoryId: String(cat.category.id) },
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
      url: `/api/v1/workspaces/${ws.id}/documents?categoryId=${cat.category.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      documents: Array<{ title: string; categoryId: number }>;
      total: number;
    };

    expect(body.documents.length).toBe(2);
    expect(body.total).toBe(2);
    for (const doc of body.documents) {
      expect(doc.categoryId).toBe(cat.category.id);
    }
  });

  it('should support pagination with page and limit', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Paginate WS' });

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
    };

    expect(page1.documents.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.page).toBe(1);

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
    const ws = await createWorkspace(db, user.id, { name: 'Sort WS' });

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
    const ws = await createWorkspace(db, user.id, { name: 'Search WS' });

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
    const ws = await createWorkspace(db, user.id, { name: 'Detail WS' });

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Detailed Doc' },
    });
    expect(createRes.statusCode).toBe(201);
    const createBody = createRes.json() as { document: { id: number } };
    const docId = createBody.document.id;

    // Set content via PATCH (POST create doesn't accept content)
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: '# Hello World' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      document: {
        id: number;
        title: string;
        slug: string;
        content: string;
        categoryId: number | null;
        authorId: number;
        currentVersion: number;
        createdAt: string;
        updatedAt: string;
      };
    };

    expect(body.document.id).toBe(docId);
    expect(body.document.title).toBe('Detailed Doc');
    expect(body.document.content).toBe('# Hello World');
    expect(body.document.currentVersion).toBe(2);
    expect(body.document.authorId).toBe(user.id);
    expect(body.document.createdAt).toBeDefined();
    expect(body.document.updatedAt).toBeDefined();
  });

  it('should return 404 for non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Doc WS' });

    const fakeId = 999999;

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
    const ws = await createWorkspace(db, owner.id, { name: 'Viewer Read WS' });

    // Create doc as owner
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Public Doc' },
    });
    expect(createRes.statusCode).toBe(201);
    const doc = createRes.json() as { document: { id: number } };

    // Viewer reads doc
    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { document: { title: string } };
    expect(body.document.title).toBe('Public Doc');
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
    const ws = await createWorkspace(db, user.id, { name: 'Update WS' });

    // Create doc
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Versioned Doc' },
    });
    expect(createRes.statusCode).toBe(201);
    const createBody = createRes.json() as { document: { id: number; currentVersion: number } };
    expect(createBody.document.currentVersion).toBe(1);
    const docId = createBody.document.id;

    // Set initial content via PATCH (creates version 2)
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: '# Version 1' },
    });

    // Update content again
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: '# Version 2\n\nUpdated content' },
    });

    expect(updateRes.statusCode).toBe(200);

    const body = updateRes.json() as {
      document: {
        id: number;
        currentVersion: number;
        updatedAt: string;
      };
    };

    expect(body.document.currentVersion).toBe(3);

    // Verify DB: new version created
    const [v3] = await db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, docId),
          eq(documentVersions.version, 3),
        ),
      );
    expect(v3).toBeDefined();
    expect(v3!.content).toBe('# Version 2\n\nUpdated content');

    // Verify DB: document content updated
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));
    expect(dbDoc!.content).toBe('# Version 2\n\nUpdated content');
    expect(dbDoc!.currentVersion).toBe(3);
  });

  it('should update title only without creating a new version', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Title Only WS' });

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Old Title' },
    });
    expect(createRes.statusCode).toBe(201);
    const createBody = createRes.json() as { document: { id: number; currentVersion: number } };
    expect(createBody.document.currentVersion).toBe(1);
    const docId = createBody.document.id;

    // Update title only
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'New Title' },
    });

    expect(updateRes.statusCode).toBe(200);

    const body = updateRes.json() as {
      document: { currentVersion: number };
    };

    // Version should NOT increment for title-only changes
    expect(body.document.currentVersion).toBe(1);

    // Verify DB: title changed, version unchanged
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));
    expect(dbDoc!.title).toBe('New Title');
    expect(dbDoc!.currentVersion).toBe(1);

    // Verify DB: no v2 created
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, docId));
    expect(versions.length).toBe(1);
  });

  it('should enforce FIFO: keep only 20 most recent versions after 25 content updates', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'FIFO WS' });

    // Create doc (version 1, empty content)
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'FIFO Doc' },
    });
    expect(createRes.statusCode).toBe(201);
    const createBody = createRes.json() as { document: { id: number } };
    const docId = createBody.document.id;

    // Update content 24 more times (total 25 versions: v1 from create + v2..v25 from patches)
    for (let i = 2; i <= 25; i++) {
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: `v${i}` },
      });
      expect(updateRes.statusCode).toBe(200);
    }

    // Verify DB: document is at version 25
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));
    expect(dbDoc!.currentVersion).toBe(25);

    // Verify DB: only 20 versions are stored (FIFO pruning)
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, docId));
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
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Update WS' });

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Protected Doc' },
    });
    expect(createRes.statusCode).toBe(201);
    const createBody = createRes.json() as { document: { id: number } };
    const docId = createBody.document.id;

    // Set content as owner first
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { content: '# Protected' },
    });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/documents/${docId}`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { content: '# Hacked' },
    });

    expect(res.statusCode).toBe(403);

    // Verify DB: content unchanged
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));
    expect(dbDoc!.content).toBe('# Protected');
  });

  it('should return 404 for non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Update WS' });

    const fakeId = 999999;

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
    const ws = await createWorkspace(db, user.id, { name: 'Visibility WS' });

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
    const doc2 = doc2Res.json() as { document: { id: number } };

    // Soft delete the second doc
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc2.document.id}`,
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
      documents: Array<{ id: number; title: string }>;
      total: number;
    };

    expect(body.total).toBe(1);
    expect(body.documents[0]!.title).toBe('Active Doc');

    const deletedDoc = body.documents.find((d) => d.id === doc2.document.id);
    expect(deletedDoc).toBeUndefined();
  });
});
