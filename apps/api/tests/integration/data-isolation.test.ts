/**
 * T060 -- Data Isolation
 *
 * User Story 6: RBAC -- Workspace data isolation tests
 *
 * Ensures that users cannot access data from workspaces they do not belong to,
 * even if they are authenticated.
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember, createJoinRequest } from '../helpers/factory.js';

describe('Workspace data isolation', () => {
  // ─── Setup: Two isolated workspaces ───

  it('User A cannot access workspace 2 detail', async () => {
    const app = getApp();
    const db = getDb();

    // User A owns workspace 1
    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    // User B owns workspace 2
    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    // User A tries to access workspace 2
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User B cannot access workspace 1 detail', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA } = await createUser(db);
    const ws1 = await createWorkspace(db, userA.id, { name: 'WS A' });

    const { accessToken: tokenB } = await createUser(db);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws1.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot list members of workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}/members`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot update workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws2.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Hacked' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot delete workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws2.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { confirmName: 'WS B' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot invite members to workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws2.id}/invitations`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        email: 'infiltrator@example.com',
        role: 'editor',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot view join requests of workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B', isPublic: true });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}/join-requests`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot change member roles in workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const { user: memberInWs2 } = await createUser(db);
    await addMember(db, ws2.id, memberInWs2.id, 'editor');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws2.id}/members/${memberInWs2.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { role: 'admin' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot remove members from workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const { user: memberInWs2 } = await createUser(db);
    await addMember(db, ws2.id, memberInWs2.id, 'viewer');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws2.id}/members/${memberInWs2.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot approve/reject join requests in workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B', isPublic: true });

    const { user: requester } = await createUser(db);
    const joinReq = await createJoinRequest(db, ws2.id, requester.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ws2.id}/join-requests/${joinReq.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { status: 'approved', assignedRole: 'editor' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('User A cannot transfer ownership of workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    await createWorkspace(db, userA.id, { name: 'WS A' });

    const { user: userB } = await createUser(db);
    const ws2 = await createWorkspace(db, userB.id, { name: 'WS B' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws2.id}/transfer`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { newOwnerId: String(userA.id) },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────
// Cross-workspace member isolation
// ─────────────────────────────────────────────
describe('Cross-workspace member isolation', () => {
  it('workspace list only shows workspaces the user is a member of', async () => {
    const app = getApp();
    const db = getDb();

    const { user: userA, accessToken: tokenA } = await createUser(db);
    const wsA = await createWorkspace(db, userA.id, { name: 'Only A' });

    const { user: userB, accessToken: tokenB } = await createUser(db);
    const wsB = await createWorkspace(db, userB.id, { name: 'Only B' });

    // Shared workspace
    const wsShared = await createWorkspace(db, userA.id, { name: 'Shared' });
    await addMember(db, wsShared.id, userB.id, 'editor');

    // User A's workspace list
    const resA = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(resA.statusCode).toBe(200);
    const bodyA = resA.json() as { workspaces: Array<{ id: number }> };
    const idsA = bodyA.workspaces.map((w) => w.id);

    expect(idsA).toContain(wsA.id);
    expect(idsA).toContain(wsShared.id);
    expect(idsA).not.toContain(wsB.id); // User A should NOT see User B's workspace

    // User B's workspace list
    const resB = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(resB.statusCode).toBe(200);
    const bodyB = resB.json() as { workspaces: Array<{ id: number }> };
    const idsB = bodyB.workspaces.map((w) => w.id);

    expect(idsB).toContain(wsB.id);
    expect(idsB).toContain(wsShared.id);
    expect(idsB).not.toContain(wsA.id); // User B should NOT see User A's workspace
  });

  it('admin of workspace 1 has no privileges in workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: ownerA } = await createUser(db);
    const ws1 = await createWorkspace(db, ownerA.id, { name: 'WS 1' });

    const { user: adminOfWs1, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws1.id, adminOfWs1.id, 'admin');

    const { user: ownerB } = await createUser(db);
    const ws2 = await createWorkspace(db, ownerB.id, { name: 'WS 2' });

    // Admin of WS1 tries to access WS2 detail
    const resDetail = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resDetail.statusCode).toBe(403);

    // Admin of WS1 tries to list WS2 members
    const resMembers = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws2.id}/members`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(resMembers.statusCode).toBe(403);

    // Admin of WS1 tries to invite to WS2
    const resInvite = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws2.id}/invitations`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        email: 'cross-invite@example.com',
        role: 'viewer',
      },
    });
    expect(resInvite.statusCode).toBe(403);
  });

  it('owner of workspace 1 has no privileges in workspace 2', async () => {
    const app = getApp();
    const db = getDb();

    const { user: ownerA, accessToken: ownerAToken } = await createUser(db);
    await createWorkspace(db, ownerA.id, { name: 'Owner A WS' });

    const { user: ownerB } = await createUser(db);
    const wsB = await createWorkspace(db, ownerB.id, { name: 'Owner B WS' });

    // Owner A tries admin-level actions on workspace B
    const resUpdate = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${wsB.id}`,
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: { name: 'Hijacked' },
    });
    expect(resUpdate.statusCode).toBe(403);

    const resDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${wsB.id}`,
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: { confirmName: 'Owner B WS' },
    });
    expect(resDelete.statusCode).toBe(403);

    const resTransfer = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${wsB.id}/transfer`,
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: { newOwnerId: String(ownerA.id) },
    });
    expect(resTransfer.statusCode).toBe(403);
  });
});
