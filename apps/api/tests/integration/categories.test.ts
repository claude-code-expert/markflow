/**
 * T065 -- Category CRUD + Hierarchy
 *
 * User Story 3: Document & Category Management
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { categories, categoryClosure, documents } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:wsId/categories
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:wsId/categories', () => {
  it('should create a root category and return 201', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Cat WS' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Requirements' },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      category: {
        id: number;
        name: string;
        parentId: number | null;
        workspaceId: number;
      };
    };

    expect(body.category.name).toBe('Requirements');
    expect(body.category.parentId).toBeNull();
    expect(body.category.workspaceId).toBe(ws.id);

    // Verify DB: category persisted
    const [dbCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, body.category.id));
    expect(dbCat).toBeDefined();
    expect(dbCat!.name).toBe('Requirements');
    expect(dbCat!.workspaceId).toBe(ws.id);

    // Verify DB: self-referencing closure entry exists (depth=0)
    const [selfClosure] = await db
      .select()
      .from(categoryClosure)
      .where(
        and(
          eq(categoryClosure.ancestorId, body.category.id),
          eq(categoryClosure.descendantId, body.category.id),
        ),
      );
    expect(selfClosure).toBeDefined();
    expect(selfClosure!.depth).toBe(0);
  });

  it('should create a child category with parentId and return 201', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Nested WS' });

    // Create parent category
    const parentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Design' },
    });

    expect(parentRes.statusCode).toBe(201);
    const parent = parentRes.json() as { category: { id: number } };

    // Create child category
    const childRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'UI Components', parentId: parent.category.id },
    });

    expect(childRes.statusCode).toBe(201);

    const child = childRes.json() as {
      category: { id: number; name: string; parentId: number | null };
    };

    expect(child.category.name).toBe('UI Components');
    expect(child.category.parentId).toBe(parent.category.id);

    // Verify DB: closure entries for parent-child relationship
    const closureEntries = await db
      .select()
      .from(categoryClosure)
      .where(eq(categoryClosure.descendantId, child.category.id));

    // Should have: self (depth=0) + parent->child (depth=1)
    expect(closureEntries.length).toBe(2);

    const parentClosure = closureEntries.find(
      (e) => e.ancestorId === parent.category.id && e.descendantId === child.category.id,
    );
    expect(parentClosure).toBeDefined();
    expect(parentClosure!.depth).toBe(1);
  });

  it('should return 409 DUPLICATE_NAME for duplicate name under same parent', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Dup WS' });

    // Create first category
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Architecture' },
    });
    expect(first.statusCode).toBe(201);

    // Attempt duplicate under same parent (root)
    const duplicate = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Architecture' },
    });

    expect(duplicate.statusCode).toBe(409);

    const body = duplicate.json() as { error: { code: string } };
    expect(body.error.code).toBe('DUPLICATE_NAME');
  });

  it('should allow same name under different parents', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Diff Parent WS' });

    // Create two parent categories
    const parentARes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Parent A' },
    });
    expect(parentARes.statusCode).toBe(201);
    const parentA = parentARes.json() as { category: { id: number } };

    const parentBRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Parent B' },
    });
    expect(parentBRes.statusCode).toBe(201);
    const parentB = parentBRes.json() as { category: { id: number } };

    // Create child with same name under different parents
    const childA = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Overview', parentId: parentA.category.id },
    });
    expect(childA.statusCode).toBe(201);

    const childB = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Overview', parentId: parentB.category.id },
    });
    expect(childB.statusCode).toBe(201);
  });

  it('should return 403 when viewer tries to create a category', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Cat WS' });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { name: 'Forbidden Category' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 401 when no auth token is provided', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Auth WS' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      payload: { name: 'No Auth Category' },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/categories
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/categories', () => {
  it('should return 200 with all categories including hierarchy info', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'List WS' });

    // Create root categories
    const rootRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Root Category' },
    });
    expect(rootRes.statusCode).toBe(201);
    const root = rootRes.json() as { category: { id: number } };

    // Create child category
    const childRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Child Category', parentId: root.category.id },
    });
    expect(childRes.statusCode).toBe(201);

    // List all categories
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(listRes.statusCode).toBe(200);

    const body = listRes.json() as {
      categories: Array<{
        id: number;
        name: string;
        parentId: number | null;
        children?: Array<{ id: number; name: string }>;
      }>;
    };

    expect(body.categories).toBeDefined();
    expect(body.categories.length).toBeGreaterThanOrEqual(1);

    // Root category should be present
    const rootCat = body.categories.find((c) => c.id === root.category.id);
    expect(rootCat).toBeDefined();
    expect(rootCat!.name).toBe('Root Category');
    expect(rootCat!.parentId).toBeNull();
  });

  it('should return empty array for workspace with no categories', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Empty WS' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { categories: unknown[] };
    expect(body.categories).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/v1/workspaces/:wsId/categories/:id
// ─────────────────────────────────────────────
describe('PATCH /api/v1/workspaces/:wsId/categories/:categoryId', () => {
  it('should rename a category and return 200', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Rename WS' });

    // Create category
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Old Name' },
    });
    expect(createRes.statusCode).toBe(201);
    const cat = createRes.json() as { category: { id: number } };

    // Rename
    const renameRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/categories/${cat.category.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'New Name' },
    });

    expect(renameRes.statusCode).toBe(200);

    const body = renameRes.json() as { category: { id: number; name: string } };
    expect(body.category.id).toBe(cat.category.id);
    expect(body.category.name).toBe('New Name');

    // Verify DB
    const [dbCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, cat.category.id));
    expect(dbCat!.name).toBe('New Name');
  });

  it('should return 409 DUPLICATE_NAME when renaming to duplicate name under same parent', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Dup Rename WS' });

    // Create two root categories
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Alpha' },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Beta' },
    });
    expect(second.statusCode).toBe(201);
    const secondCat = second.json() as { category: { id: number } };

    // Try to rename Beta to Alpha
    const renameRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/categories/${secondCat.category.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Alpha' },
    });

    expect(renameRes.statusCode).toBe(409);

    const body = renameRes.json() as { error: { code: string } };
    expect(body.error.code).toBe('DUPLICATE_NAME');
  });

  it('should return 404 for non-existent category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Not Found WS' });

    const fakeId = 999999;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/categories/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Ghost' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/v1/workspaces/:wsId/categories/:id
// ─────────────────────────────────────────────
describe('DELETE /api/v1/workspaces/:wsId/categories/:categoryId', () => {
  it('should delete an empty category and return 204', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Delete Cat WS' });

    // Create category
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'To Be Deleted' },
    });
    expect(createRes.statusCode).toBe(201);
    const cat = createRes.json() as { category: { id: number } };

    // Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/categories/${cat.category.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmName: 'To Be Deleted' },
    });

    expect(deleteRes.statusCode).toBe(204);

    // Verify DB: category removed
    const [dbCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, cat.category.id));
    expect(dbCat).toBeUndefined();

    // Verify DB: closure entries removed
    const closureEntries = await db
      .select()
      .from(categoryClosure)
      .where(eq(categoryClosure.descendantId, cat.category.id));
    expect(closureEntries.length).toBe(0);
  });

  it('should return 400 HAS_SUBCATEGORIES when deleting a folder with subcategories (no handleDocuments)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'SubCat WS' });

    // Create parent
    const parentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Parent With Child' },
    });
    expect(parentRes.statusCode).toBe(201);
    const parent = parentRes.json() as { category: { id: number } };

    // Create child
    const childRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Child', parentId: parent.category.id },
    });
    expect(childRes.statusCode).toBe(201);

    // Attempt to delete parent
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/categories/${parent.category.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmName: 'Parent With Child' },
    });

    expect(deleteRes.statusCode).toBe(400);

    const body = deleteRes.json() as { error: { code: string } };
    expect(body.error.code).toBe('HAS_SUBCATEGORIES');

    // Verify parent still exists
    const [dbParent] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, parent.category.id));
    expect(dbParent).toBeDefined();
  });

  it('should move child documents to root (categoryId=null) when category is deleted with handleDocuments=move', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Move Docs WS' });

    // Create category
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Category With Docs' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { category: { id: number } };

    // Create a document in this category
    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Orphan Doc', categoryId: cat.category.id },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: number; categoryId: number } };
    expect(doc.document.categoryId).toBe(cat.category.id);

    // Delete category with handleDocuments=move
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/categories/${cat.category.id}?handleDocuments=move`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmName: 'Category With Docs' },
    });

    expect(deleteRes.statusCode).toBe(204);

    // Verify DB: document's categoryId is now null (moved to root)
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.document.id));
    expect(dbDoc).toBeDefined();
    expect(dbDoc!.categoryId).toBeNull();
  });

  it('should return 403 when viewer tries to delete a category', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'RBAC Del WS' });

    // Create category as owner
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Protected' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { category: { id: number } };

    // Viewer tries to delete
    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/categories/${cat.category.id}`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { confirmName: 'Protected' },
    });

    expect(res.statusCode).toBe(403);

    // Verify category still exists
    const [dbCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, cat.category.id));
    expect(dbCat).toBeDefined();
  });
});
