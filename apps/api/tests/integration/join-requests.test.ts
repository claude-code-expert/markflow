/**
 * T044 -- Join Requests
 *
 * User Story 2: Workspace & Members -- join request create, list, approve/reject, batch
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { joinRequests, workspaceMembers } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import {
  createUser,
  createWorkspace,
  addMember,
  createJoinRequest,
} from '../helpers/factory.js';

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:id/join-requests
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:id/join-requests', () => {
  it('should create a join request for a public workspace and return 201', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Public WS',
      slug: 'public-join',
      isPublic: true,
    });

    const { user: requester, accessToken: requesterToken } = await createUser(db);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: { message: 'I want to join!' },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      id: string;
      workspaceId: string;
      userId: string;
      status: string;
      message: string;
    };

    expect(body.workspaceId).toBe(ws.id);
    expect(body.userId).toBe(requester.id);
    expect(body.status).toBe('pending');
    expect(body.message).toBe('I want to join!');

    // Verify DB
    const [dbRequest] = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.id, body.id));
    expect(dbRequest).toBeDefined();
    expect(dbRequest!.status).toBe('pending');
  });

  it('should return 400 WORKSPACE_NOT_PUBLIC for private workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Private WS',
      slug: 'private-join',
      isPublic: false,
    });

    const { accessToken: requesterToken } = await createUser(db);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: { message: 'Please let me in' },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('WORKSPACE_NOT_PUBLIC');
  });

  it('should return 409 when user is already a member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Already In',
      slug: 'already-in',
      isPublic: true,
    });

    const { user: existingMember, accessToken: memberToken } = await createUser(db);
    await addMember(db, ws.id, existingMember.id, 'viewer');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { message: 'I am already here' },
    });

    expect(res.statusCode).toBe(409);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBeDefined();
  });

  it('should return 401 without auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'No Auth Join',
      slug: 'no-auth-join',
      isPublic: true,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      payload: { message: 'No auth' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 409 when user already has a pending join request', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Dupe Request',
      slug: 'dupe-request',
      isPublic: true,
    });

    const { user: requester, accessToken: requesterToken } = await createUser(db);

    // First request
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: { message: 'First' },
    });

    // Duplicate request
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: { message: 'Second' },
    });

    expect(res.statusCode).toBe(409);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:id/join-requests
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:id/join-requests', () => {
  it('should return 200 with list of join requests for admin', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'List Requests',
      slug: 'list-requests',
      isPublic: true,
    });

    const { user: admin, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    // Create some join requests via factory
    const { user: req1 } = await createUser(db);
    await createJoinRequest(db, ws.id, req1.id, { message: 'Request 1' });

    const { user: req2 } = await createUser(db);
    await createJoinRequest(db, ws.id, req2.id, { message: 'Request 2' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as Array<{
      id: string;
      userId: string;
      status: string;
      message: string;
    }>;

    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body.every((r) => r.status === 'pending')).toBe(true);
  });

  it('should return 200 with list for owner', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Owner List',
      slug: 'owner-list-req',
      isPublic: true,
    });

    const { user: requester } = await createUser(db);
    await createJoinRequest(db, ws.id, requester.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as Array<{ id: string }>;
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('should return 403 when editor tries to list join requests', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Editor Denied',
      slug: 'editor-denied-jr',
      isPublic: true,
    });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${editorToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 403 when viewer tries to list join requests', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Viewer Denied',
      slug: 'viewer-denied-jr',
      isPublic: true,
    });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/join-requests`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/v1/workspaces/:id/join-requests/:requestId
// ─────────────────────────────────────────────
describe('PATCH /api/v1/workspaces/:id/join-requests/:requestId', () => {
  it('should approve a join request and add user as member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Approve WS',
      slug: 'approve-jr',
      isPublic: true,
    });

    const { user: requester } = await createUser(db);
    const joinReq = await createJoinRequest(db, ws.id, requester.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/${joinReq.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'approved', assignedRole: 'editor' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { id: string; status: string };
    expect(body.status).toBe('approved');

    // Verify DB: join request updated
    const [dbRequest] = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.id, joinReq.id));
    expect(dbRequest!.status).toBe('approved');
    expect(dbRequest!.assignedRole).toBe('editor');

    // Verify DB: user added as member
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, requester.id),
        ),
      );
    expect(member).toBeDefined();
    expect(member!.role).toBe('editor');
  });

  it('should reject a join request without adding member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Reject WS',
      slug: 'reject-jr',
      isPublic: true,
    });

    const { user: requester } = await createUser(db);
    const joinReq = await createJoinRequest(db, ws.id, requester.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/${joinReq.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'rejected' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { id: string; status: string };
    expect(body.status).toBe('rejected');

    // Verify DB: user NOT added as member
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, requester.id),
        ),
      );
    expect(member).toBeUndefined();
  });

  it('should return 403 when editor tries to review a join request', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Editor Review',
      slug: 'editor-review-jr',
      isPublic: true,
    });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const { user: requester } = await createUser(db);
    const joinReq = await createJoinRequest(db, ws.id, requester.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/${joinReq.id}`,
      headers: { authorization: `Bearer ${editorToken}` },
      payload: { status: 'approved', assignedRole: 'viewer' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 404 for non-existent join request', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'No Request',
      slug: 'no-request-jr',
      isPublic: true,
    });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/${fakeId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'approved', assignedRole: 'editor' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/v1/workspaces/:id/join-requests/batch
// ─────────────────────────────────────────────
describe('PATCH /api/v1/workspaces/:id/join-requests/batch', () => {
  it('should batch approve multiple join requests', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Batch WS',
      slug: 'batch-jr',
      isPublic: true,
    });

    const { user: req1 } = await createUser(db);
    const jr1 = await createJoinRequest(db, ws.id, req1.id);

    const { user: req2 } = await createUser(db);
    const jr2 = await createJoinRequest(db, ws.id, req2.id);

    const { user: req3 } = await createUser(db);
    const jr3 = await createJoinRequest(db, ws.id, req3.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/batch`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        requestIds: [jr1.id, jr2.id, jr3.id],
        status: 'approved',
        assignedRole: 'viewer',
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { processed: number };
    expect(body.processed).toBe(3);

    // Verify DB: all requests approved
    for (const jr of [jr1, jr2, jr3]) {
      const [dbRequest] = await db
        .select()
        .from(joinRequests)
        .where(eq(joinRequests.id, jr.id));
      expect(dbRequest!.status).toBe('approved');
    }

    // Verify DB: all users added as members
    for (const user of [req1, req2, req3]) {
      const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, ws.id),
            eq(workspaceMembers.userId, user.id),
          ),
        );
      expect(member).toBeDefined();
      expect(member!.role).toBe('viewer');
    }
  });

  it('should batch reject multiple join requests', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Batch Reject',
      slug: 'batch-reject-jr',
      isPublic: true,
    });

    const { user: req1 } = await createUser(db);
    const jr1 = await createJoinRequest(db, ws.id, req1.id);

    const { user: req2 } = await createUser(db);
    const jr2 = await createJoinRequest(db, ws.id, req2.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/batch`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        requestIds: [jr1.id, jr2.id],
        status: 'rejected',
      },
    });

    expect(res.statusCode).toBe(200);

    // Verify DB: no members added
    for (const user of [req1, req2]) {
      const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, ws.id),
            eq(workspaceMembers.userId, user.id),
          ),
        );
      expect(member).toBeUndefined();
    }
  });

  it('should return 403 when editor tries batch operation', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, {
      name: 'Batch Denied',
      slug: 'batch-denied-jr',
      isPublic: true,
    });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const { user: requester } = await createUser(db);
    const jr = await createJoinRequest(db, ws.id, requester.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws.id}/join-requests/batch`,
      headers: { authorization: `Bearer ${editorToken}` },
      payload: {
        requestIds: [jr.id],
        status: 'approved',
        assignedRole: 'viewer',
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
