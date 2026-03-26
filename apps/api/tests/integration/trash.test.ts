/**
 * T067 -- Trash Operations (Soft Delete, Restore, Permanent Delete)
 *
 * User Story 3: Document & Category Management
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { documents, documentVersions, categories } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

/**
 * Helper: create a workspace with a document inside it.
 * Returns { workspaceId, documentId, accessToken }.
 */
async function createWorkspaceWithDocument(options?: {
  categoryId?: string;
  title?: string;
  content?: string;
}) {
  const db = getDb();
  const app = getApp();

  const { user, accessToken } = await createUser(db);
  const ws = await createWorkspace(db, user.id, {
    name: `Trash WS ${Date.now()}`,
    slug: `trash-ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });

  const payload: Record<string, string | undefined> = {
    title: options?.title ?? 'Trashable Doc',
    content: options?.content ?? '# Content',
  };
  if (options?.categoryId) {
    payload.categoryId = options.categoryId;
  }

  const docRes = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${ws.id}/documents`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload,
  });

  expect(docRes.statusCode).toBe(201);
  const doc = docRes.json() as { id: string };

  return {
    workspaceId: ws.id,
    documentId: doc.id,
    userId: user.id,
    accessToken,
  };
}

// ─────────────────────────────────────────────
// DELETE /api/v1/workspaces/:wsId/documents/:id  (soft delete)
// ─────────────────────────────────────────────
describe('DELETE /api/v1/workspaces/:wsId/documents/:documentId (soft delete)', () => {
  it('should soft delete a document and return 204', async () => {
    const app = getApp();
    const db = getDb();

    const { workspaceId, documentId, accessToken } = await createWorkspaceWithDocument();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(204);

    // Verify DB: is_deleted = true, deletedAt set
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.isDeleted).toBe(true);
    expect(dbDoc!.deletedAt).not.toBeNull();
  });

  it('should return 404 when soft-deleting non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Del WS', slug: 'no-del-ws' });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 403 when viewer tries to soft-delete a document', async () => {
    const app = getApp();
    const db = getDb();

    const { workspaceId, documentId, accessToken: ownerToken } = await createWorkspaceWithDocument();

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, workspaceId, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(403);

    // Verify DB: still active
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(dbDoc!.isDeleted).toBe(false);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/trash
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/trash', () => {
  it('should list deleted documents', async () => {
    const app = getApp();
    const db = getDb();

    const { workspaceId, documentId, accessToken } = await createWorkspaceWithDocument();

    // Soft delete the document
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    // List trash
    const trashRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/trash`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(trashRes.statusCode).toBe(200);

    const body = trashRes.json() as {
      documents: Array<{
        id: string;
        title: string;
        deletedAt: string;
      }>;
    };

    expect(body.documents.length).toBeGreaterThanOrEqual(1);

    const trashed = body.documents.find((d) => d.id === documentId);
    expect(trashed).toBeDefined();
    expect(trashed!.title).toBe('Trashable Doc');
    expect(trashed!.deletedAt).toBeDefined();
  });

  it('should return empty list when no deleted documents', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Trash WS', slug: 'no-trash-ws' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/trash`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { documents: unknown[] };
    expect(body.documents).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:wsId/trash/:docId/restore
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:wsId/trash/:docId/restore', () => {
  it('should restore a soft-deleted document and return 200', async () => {
    const app = getApp();
    const db = getDb();

    const { workspaceId, documentId, accessToken } = await createWorkspaceWithDocument();

    // Soft delete
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Restore
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/trash/${documentId}/restore`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(restoreRes.statusCode).toBe(200);

    // Verify DB: is_deleted = false, deletedAt = null
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.isDeleted).toBe(false);
    expect(dbDoc!.deletedAt).toBeNull();

    // Verify: document appears in regular list again
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const listBody = listRes.json() as {
      documents: Array<{ id: string }>;
    };
    const restored = listBody.documents.find((d) => d.id === documentId);
    expect(restored).toBeDefined();
  });

  it('should restore to root (categoryId=null) when original category was deleted', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, {
      name: 'Restore Root WS',
      slug: `restore-root-${Date.now()}`,
    });

    // Create category
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Temporary' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { id: string };

    // Create document in category
    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Orphan After Restore', categoryId: cat.id },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { id: string };

    // Soft delete the document
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Delete the category (with handleDocuments=move so other docs move to root)
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/categories/${cat.id}?handleDocuments=move`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Restore the document — its original category no longer exists
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/trash/${doc.id}/restore`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(restoreRes.statusCode).toBe(200);

    // Verify DB: restored to root (categoryId = null)
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.id));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.isDeleted).toBe(false);
    expect(dbDoc!.categoryId).toBeNull();
  });

  it('should return 404 when restoring a non-existent or non-deleted document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, {
      name: 'No Restore WS',
      slug: `no-restore-${Date.now()}`,
    });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/trash/${fakeId}/restore`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/v1/workspaces/:wsId/trash/:docId  (permanent delete)
// ─────────────────────────────────────────────
describe('DELETE /api/v1/workspaces/:wsId/trash/:docId (permanent delete)', () => {
  it('should permanently delete a soft-deleted document and its versions', async () => {
    const app = getApp();
    const db = getDb();

    const { workspaceId, documentId, accessToken } = await createWorkspaceWithDocument({
      content: '# V1 content',
    });

    // Update content to create additional versions
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: '# V2 content' },
    });

    // Soft delete first
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Permanent delete
    const permDeleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/trash/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(permDeleteRes.statusCode).toBe(204);

    // Verify DB: document completely gone
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(dbDoc).toBeUndefined();

    // Verify DB: all versions gone
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId));
    expect(versions.length).toBe(0);
  });

  it('should return 404 when permanently deleting a non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, {
      name: 'No Perm Del WS',
      slug: `no-perm-del-${Date.now()}`,
    });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/trash/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when permanently deleting a non-deleted (active) document', async () => {
    const app = getApp();
    const db = getDb();

    const { workspaceId, documentId, accessToken } = await createWorkspaceWithDocument();

    // Try to permanently delete without soft-deleting first
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/trash/${documentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Should fail — document is not in trash
    expect(res.statusCode).toBe(404);

    // Verify DB: document still exists
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.isDeleted).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Soft-deleted doc not visible in regular list
// ─────────────────────────────────────────────
describe('Trash isolation', () => {
  it('should not show soft-deleted docs in regular document list', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, {
      name: 'Isolation WS',
      slug: `isolation-${Date.now()}`,
    });

    // Create two docs
    const activeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Active Document' },
    });
    expect(activeRes.statusCode).toBe(201);

    const trashableRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Trashable Document' },
    });
    expect(trashableRes.statusCode).toBe(201);
    const trashable = trashableRes.json() as { id: string };

    // Soft delete one
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/documents/${trashable.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Regular list should only show active doc
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(listRes.statusCode).toBe(200);

    const listBody = listRes.json() as {
      documents: Array<{ id: string; title: string }>;
      total: number;
    };
    expect(listBody.total).toBe(1);
    expect(listBody.documents[0]!.title).toBe('Active Document');

    // Trash list should only show deleted doc
    const trashRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/trash`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const trashBody = trashRes.json() as {
      documents: Array<{ id: string; title: string }>;
    };
    expect(trashBody.documents.length).toBe(1);
    expect(trashBody.documents[0]!.title).toBe('Trashable Document');
  });
});
