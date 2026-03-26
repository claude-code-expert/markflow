/**
 * T041 -- Workspace CRUD + Owner Transfer
 *
 * User Story 2: Workspace & Members
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { workspaces, workspaceMembers } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// POST /api/v1/workspaces
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces', () => {
  it('should create a workspace and return 201 with workspace data', async () => {
    const app = getApp();
    const db = getDb();
    const { user, accessToken } = await createUser(db);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'My Team',
        slug: 'my-team',
        isPublic: true,
      },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      id: string;
      name: string;
      slug: string;
      isPublic: boolean;
      ownerId: string;
    };

    expect(body.name).toBe('My Team');
    expect(body.slug).toBe('my-team');
    expect(body.isPublic).toBe(true);
    expect(body.ownerId).toBe(user.id);

    // Verify DB: workspace persisted
    const [dbWorkspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, body.id));
    expect(dbWorkspace).toBeDefined();
    expect(dbWorkspace!.name).toBe('My Team');

    // Verify DB: creator added as owner member
    const [ownerMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, body.id),
          eq(workspaceMembers.userId, user.id),
        ),
      );
    expect(ownerMember).toBeDefined();
    expect(ownerMember!.role).toBe('owner');
  });

  it('should return 409 SLUG_EXISTS when slug is already taken', async () => {
    const app = getApp();
    const db = getDb();
    const { accessToken } = await createUser(db);

    // First workspace
    await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'First', slug: 'dupe-slug', isPublic: true },
    });

    // Duplicate slug
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Second', slug: 'dupe-slug', isPublic: false },
    });

    expect(res.statusCode).toBe(409);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('SLUG_EXISTS');
  });

  it('should return 401 when no auth token is provided', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'No Auth', slug: 'no-auth', isPublic: true },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 400 when required fields are missing', async () => {
    const app = getApp();
    const db = getDb();
    const { accessToken } = await createUser(db);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces', () => {
  it('should return 200 with list of workspaces the user belongs to', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws1 = await createWorkspace(db, user.id, { name: 'WS 1', slug: 'ws-1' });
    const ws2 = await createWorkspace(db, user.id, { name: 'WS 2', slug: 'ws-2' });

    // Another user's workspace (should NOT appear)
    const { user: otherUser } = await createUser(db);
    await createWorkspace(db, otherUser.id, { name: 'Other WS', slug: 'other-ws' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as Array<{
      id: string;
      name: string;
      role: string;
    }>;

    expect(body.length).toBeGreaterThanOrEqual(2);

    const wsIds = body.map((w) => w.id);
    expect(wsIds).toContain(ws1.id);
    expect(wsIds).toContain(ws2.id);

    // Each workspace entry should include the user's role
    const ws1Entry = body.find((w) => w.id === ws1.id);
    expect(ws1Entry!.role).toBe('owner');
  });

  it('should include workspaces where user is a non-owner member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Shared', slug: 'shared' });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${editorToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as Array<{ id: string; role: string }>;
    const entry = body.find((w) => w.id === ws.id);
    expect(entry).toBeDefined();
    expect(entry!.role).toBe('editor');
  });

  it('should return 401 without auth', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces',
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:id
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:id', () => {
  it('should return 200 with workspace detail for a member', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Detail Test', slug: 'detail-test' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      id: string;
      name: string;
      slug: string;
      ownerId: string;
    };

    expect(body.id).toBe(ws.id);
    expect(body.name).toBe('Detail Test');
    expect(body.slug).toBe('detail-test');
    expect(body.ownerId).toBe(user.id);
  });

  it('should return 403 for a non-member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Private', slug: 'private' });

    const { accessToken: outsiderToken } = await createUser(db);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${outsiderToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 404 for non-existent workspace', async () => {
    const app = getApp();
    const db = getDb();
    const { accessToken } = await createUser(db);

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // 404 or 403 are both acceptable — depends on whether the API leaks existence info
    expect([403, 404]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/v1/workspaces/:id
// ─────────────────────────────────────────────
describe('PATCH /api/v1/workspaces/:id', () => {
  it('should return 200 and update workspace name/visibility for owner', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, {
      name: 'Old Name',
      slug: 'update-test',
      isPublic: true,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'New Name', isPublic: false },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { id: string; name: string; isPublic: boolean };
    expect(body.name).toBe('New Name');
    expect(body.isPublic).toBe(false);

    // Verify DB
    const [dbWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(dbWs!.name).toBe('New Name');
    expect(dbWs!.isPublic).toBe(false);
  });

  it('should return 403 when non-owner tries to update workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Owner Only', slug: 'owner-only' });

    const { user: admin, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Hacked Name' },
    });

    expect(res.statusCode).toBe(403);

    // Verify DB unchanged
    const [dbWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(dbWs!.name).toBe('Owner Only');
  });

  it('should return 403 when editor tries to update workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Locked', slug: 'locked' });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${editorToken}` },
      payload: { name: 'Should Not Change' },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/v1/workspaces/:id
// ─────────────────────────────────────────────
describe('DELETE /api/v1/workspaces/:id', () => {
  it('should delete workspace with correct name confirmation', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Delete Me', slug: 'delete-me' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmName: 'Delete Me' },
    });

    expect(res.statusCode).toBe(200);

    // Verify DB: workspace removed
    const [dbWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(dbWs).toBeUndefined();
  });

  it('should return 400 NAME_MISMATCH when confirmation name does not match', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Correct Name', slug: 'name-mismatch' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmName: 'Wrong Name' },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('NAME_MISMATCH');

    // Verify workspace still exists
    const [dbWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(dbWs).toBeDefined();
  });

  it('should return 400 CANNOT_DELETE_ROOT for root workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const rootWs = await createWorkspace(db, user.id, {
      name: 'Root WS',
      slug: 'root-ws',
      isRoot: true,
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${rootWs.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmName: 'Root WS' },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('CANNOT_DELETE_ROOT');
  });

  it('should return 403 when non-owner tries to delete workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Protected', slug: 'protected' });

    const { user: admin, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { confirmName: 'Protected' },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:id/transfer
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:id/transfer', () => {
  it('should transfer ownership to an admin member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Transfer WS', slug: 'transfer' });

    const { user: admin } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/transfer`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { newOwnerId: admin.id },
    });

    expect(res.statusCode).toBe(200);

    // Verify DB: ownership changed
    const [dbWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(dbWs!.ownerId).toBe(admin.id);

    // Verify DB: new owner's member role is 'owner'
    const [newOwnerMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, admin.id),
        ),
      );
    expect(newOwnerMember!.role).toBe('owner');

    // Verify DB: old owner's member role is demoted (e.g. admin)
    const [oldOwnerMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, owner.id),
        ),
      );
    expect(oldOwnerMember).toBeDefined();
    expect(oldOwnerMember!.role).not.toBe('owner');
  });

  it('should reject transfer if new owner is not an admin', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Transfer', slug: 'no-transfer' });

    const { user: editor } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/transfer`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { newOwnerId: editor.id },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBeDefined();

    // Verify DB unchanged
    const [dbWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(dbWs!.ownerId).toBe(owner.id);
  });

  it('should reject transfer from non-owner', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Unauth Transfer', slug: 'unauth-transfer' });

    const { user: admin, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/transfer`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { newOwnerId: admin.id },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────
// Owner departure blocked without transfer
// ─────────────────────────────────────────────
describe('Owner departure constraints', () => {
  it('should block owner from leaving workspace without transferring ownership first', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Cannot Leave', slug: 'cannot-leave' });

    // Owner tries to remove themselves
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/members/${owner.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    // Should be blocked (400 or 403)
    expect([400, 403]).toContain(res.statusCode);

    // Owner should still be a member
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, owner.id),
        ),
      );
    expect(member).toBeDefined();
    expect(member!.role).toBe('owner');
  });
});
