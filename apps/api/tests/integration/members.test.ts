/**
 * T042 -- Member Management
 *
 * User Story 2: Workspace & Members -- member list, role change, removal
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { workspaceMembers } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:id/members
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:id/members', () => {
  it('should return 200 with list of workspace members', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Team', slug: 'team-members' });

    const { user: admin } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const { user: editor } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const { user: viewer } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as Array<{
      userId: string;
      role: string;
      name?: string;
      email?: string;
    }>;

    expect(body.length).toBe(4); // owner + admin + editor + viewer

    const roles = body.map((m) => m.role).sort();
    expect(roles).toEqual(['admin', 'editor', 'owner', 'viewer']);

    // Verify owner is in the list
    const ownerEntry = body.find((m) => m.userId === owner.id);
    expect(ownerEntry).toBeDefined();
    expect(ownerEntry!.role).toBe('owner');
  });

  it('should return 403 for a non-member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Secret', slug: 'secret-members' });

    const { accessToken: outsiderToken } = await createUser(db);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/members`,
      headers: { authorization: `Bearer ${outsiderToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 401 without auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Auth', slug: 'noauth-members' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/members`,
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/v1/workspaces/:id/members/:userId
// ─────────────────────────────────────────────
describe('PATCH /api/v1/workspaces/:id/members/:userId', () => {
  it('should allow owner to change a member role', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Role Change', slug: 'role-change' });

    const { user: editor } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/members/${editor.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { role: 'admin' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { userId: string; role: string };
    expect(body.role).toBe('admin');

    // Verify DB
    const [dbMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, editor.id),
        ),
      );
    expect(dbMember!.role).toBe('admin');
  });

  it('should allow admin to change a non-admin/non-owner member role', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Admin Promotes', slug: 'admin-promotes' });

    const { user: admin, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const { user: viewer } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/members/${viewer.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'editor' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { userId: string; role: string };
    expect(body.role).toBe('editor');
  });

  it('should return 400 CANNOT_CHANGE_OWNER_ROLE when trying to change owner role', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Owner Role', slug: 'owner-role' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/members/${owner.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { role: 'admin' },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('CANNOT_CHANGE_OWNER_ROLE');

    // Verify DB unchanged
    const [dbMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, owner.id),
        ),
      );
    expect(dbMember!.role).toBe('owner');
  });

  it('should return 403 when editor tries to change roles', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Editor Denied', slug: 'editor-denied' });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const { user: viewer } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/members/${viewer.id}`,
      headers: { authorization: `Bearer ${editorToken}` },
      payload: { role: 'editor' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 400 for invalid role value', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Invalid Role', slug: 'invalid-role' });

    const { user: member } = await createUser(db);
    await addMember(db, ws.id, member.id, 'editor');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/members/${member.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { role: 'superadmin' },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/v1/workspaces/:id/members/:userId
// ─────────────────────────────────────────────
describe('DELETE /api/v1/workspaces/:id/members/:userId', () => {
  it('should allow owner to remove a member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Remove', slug: 'remove-member' });

    const { user: editor } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/members/${editor.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);

    // Verify DB: member removed
    const [dbMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, editor.id),
        ),
      );
    expect(dbMember).toBeUndefined();
  });

  it('should allow a member to remove themselves (self-leave)', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Self Leave', slug: 'self-leave' });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/members/${editor.id}`,
      headers: { authorization: `Bearer ${editorToken}` },
    });

    expect(res.statusCode).toBe(200);

    // Verify DB: member removed
    const [dbMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, editor.id),
        ),
      );
    expect(dbMember).toBeUndefined();
  });

  it('should block owner from removing themselves', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Owner Stay', slug: 'owner-stay' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/members/${owner.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect([400, 403]).toContain(res.statusCode);

    // Verify DB: owner still member
    const [dbMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, owner.id),
        ),
      );
    expect(dbMember).toBeDefined();
    expect(dbMember!.role).toBe('owner');
  });

  it('should return 403 when editor tries to remove another member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Editor Remove', slug: 'editor-remove' });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const { user: viewer } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/members/${viewer.id}`,
      headers: { authorization: `Bearer ${editorToken}` },
    });

    expect(res.statusCode).toBe(403);

    // Verify viewer still exists
    const [dbMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, viewer.id),
        ),
      );
    expect(dbMember).toBeDefined();
  });

  it('should return 404 when removing a non-existent member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Member', slug: 'no-member' });

    const fakeUserId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}/members/${fakeUserId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect([404, 400]).toContain(res.statusCode);
  });
});
