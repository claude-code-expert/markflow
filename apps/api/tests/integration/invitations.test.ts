/**
 * T043 -- Invitations
 *
 * User Story 2: Workspace & Members -- invitation create, view, accept
 */
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { invitations, workspaceMembers } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember, createInvitation } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:id/invitations
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:id/invitations', () => {
  it('should create an invitation and return 201 with token', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Invite WS', slug: 'invite-ws' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/invitations`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        email: 'invitee@example.com',
        role: 'editor',
      },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as {
      id: string;
      token: string;
      email: string;
      role: string;
      workspaceId: string;
      expiresAt: string;
    };

    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
    expect(body.email).toBe('invitee@example.com');
    expect(body.role).toBe('editor');
    expect(body.workspaceId).toBe(ws.id);
    expect(body.expiresAt).toBeDefined();

    // Verify DB: invitation persisted
    const [dbInvitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, body.id));
    expect(dbInvitation).toBeDefined();
    expect(dbInvitation!.status).toBe('pending');
    expect(dbInvitation!.email).toBe('invitee@example.com');
  });

  it('should allow admin to create invitations', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Admin Invite', slug: 'admin-invite' });

    const { user: admin, accessToken: adminToken } = await createUser(db);
    await addMember(db, ws.id, admin.id, 'admin');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/invitations`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        email: 'admin-invitee@example.com',
        role: 'viewer',
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it('should return 403 when editor tries to create invitation', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Editor Invite', slug: 'no-editor-invite' });

    const { user: editor, accessToken: editorToken } = await createUser(db);
    await addMember(db, ws.id, editor.id, 'editor');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/invitations`,
      headers: { authorization: `Bearer ${editorToken}` },
      payload: {
        email: 'blocked@example.com',
        role: 'viewer',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 403 when viewer tries to create invitation', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Viewer Invite', slug: 'no-viewer-invite' });

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/invitations`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: {
        email: 'blocked-viewer@example.com',
        role: 'viewer',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should return 401 without auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Auth Invite', slug: 'no-auth-invite' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/invitations`,
      payload: {
        email: 'noauth@example.com',
        role: 'editor',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/invitations/:token
// ─────────────────────────────────────────────
describe('GET /api/v1/invitations/:token', () => {
  it('should return invitation details without requiring auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Token View', slug: 'token-view' });

    const invitation = await createInvitation(db, ws.id, owner.id, {
      email: 'viewer-target@example.com',
      role: 'viewer',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/invitations/${invitation.token}`,
      // No auth header — public endpoint
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      workspaceName: string;
      email: string;
      role: string;
      inviterName?: string;
      expiresAt: string;
    };

    expect(body.workspaceName).toBeDefined();
    expect(body.email).toBe('viewer-target@example.com');
    expect(body.role).toBe('viewer');
    expect(body.expiresAt).toBeDefined();
  });

  it('should return 404 for non-existent token', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/non-existent-token-abc123',
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 410 for expired invitation', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Expired', slug: 'expired-invite' });

    const expiredInvitation = await createInvitation(db, ws.id, owner.id, {
      email: 'expired@example.com',
      expiresAt: new Date(Date.now() - 1000), // already expired
      status: 'expired',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/invitations/${expiredInvitation.token}`,
    });

    expect(res.statusCode).toBe(410);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// POST /api/v1/invitations/:token/accept
// ─────────────────────────────────────────────
describe('POST /api/v1/invitations/:token/accept', () => {
  it('should accept invitation and add user as member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Accept WS', slug: 'accept-ws' });

    const { user: invitee, accessToken: inviteeToken } = await createUser(db, {
      email: 'accept-me@example.com',
    });

    const invitation = await createInvitation(db, ws.id, owner.id, {
      email: 'accept-me@example.com',
      role: 'editor',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${invitation.token}/accept`,
      headers: { authorization: `Bearer ${inviteeToken}` },
    });

    expect(res.statusCode).toBe(200);

    // Verify DB: user added as member with correct role
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, invitee.id),
        ),
      );
    expect(member).toBeDefined();
    expect(member!.role).toBe('editor');

    // Verify DB: invitation status updated
    const [dbInvitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitation.id));
    expect(dbInvitation!.status).toBe('accepted');
  });

  it('should return 410 for expired invitation', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Expired Accept', slug: 'expired-accept' });

    const { accessToken: inviteeToken } = await createUser(db, {
      email: 'expired-accept@example.com',
    });

    const expiredInvitation = await createInvitation(db, ws.id, owner.id, {
      email: 'expired-accept@example.com',
      expiresAt: new Date(Date.now() - 1000),
      status: 'expired',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${expiredInvitation.token}/accept`,
      headers: { authorization: `Bearer ${inviteeToken}` },
    });

    expect(res.statusCode).toBe(410);
  });

  it('should return 409 when user is already a member', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Already Member', slug: 'already-member' });

    const { user: existingMember, accessToken: memberToken } = await createUser(db, {
      email: 'already@example.com',
    });
    await addMember(db, ws.id, existingMember.id, 'viewer');

    const invitation = await createInvitation(db, ws.id, owner.id, {
      email: 'already@example.com',
      role: 'editor',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${invitation.token}/accept`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(res.statusCode).toBe(409);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBeDefined();
  });

  it('should return 401 without auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'No Auth Accept', slug: 'no-auth-accept' });

    const invitation = await createInvitation(db, ws.id, owner.id, {
      email: 'noauth-accept@example.com',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${invitation.token}/accept`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent token', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/non-existent-token-xyz/accept',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
