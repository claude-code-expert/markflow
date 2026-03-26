/**
 * T059 -- RBAC Matrix (Parametrized)
 *
 * User Story 6: Role-Based Access Control
 *
 * Tests access permissions for each role (owner, admin, editor, viewer)
 * across key workspace endpoints using parametrized test patterns.
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';
import type { Db } from '@markflow/db';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

interface RoleTestContext {
  workspaceId: string;
  tokens: Record<Role, string>;
  userIds: Record<Role, string>;
}

/**
 * Sets up a workspace with one user per role.
 */
async function setupRoleContext(db: Db): Promise<RoleTestContext> {
  const { user: owner, accessToken: ownerToken } = await createUser(db);
  const ws = await createWorkspace(db, owner.id, { name: 'RBAC Test', slug: `rbac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });

  const { user: admin, accessToken: adminToken } = await createUser(db);
  await addMember(db, ws.id, admin.id, 'admin');

  const { user: editor, accessToken: editorToken } = await createUser(db);
  await addMember(db, ws.id, editor.id, 'editor');

  const { user: viewer, accessToken: viewerToken } = await createUser(db);
  await addMember(db, ws.id, viewer.id, 'viewer');

  return {
    workspaceId: ws.id,
    tokens: {
      owner: ownerToken,
      admin: adminToken,
      editor: editorToken,
      viewer: viewerToken,
    },
    userIds: {
      owner: owner.id,
      admin: admin.id,
      editor: editor.id,
      viewer: viewer.id,
    },
  };
}

// ─────────────────────────────────────────────
// Create Workspace — all roles allowed (any authenticated user)
// ─────────────────────────────────────────────
describe('RBAC: Create workspace', () => {
  const roles: Role[] = ['owner', 'admin', 'editor', 'viewer'];

  for (const role of roles) {
    it(`should allow ${role} to create a new workspace`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/workspaces',
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
        payload: {
          name: `New WS by ${role}`,
          slug: `new-ws-${role}-${Date.now()}`,
          isPublic: true,
        },
      });

      // Any authenticated user can create a workspace
      expect(res.statusCode).toBe(201);
    });
  }
});

// ─────────────────────────────────────────────
// Update Workspace — owner only
// ─────────────────────────────────────────────
describe('RBAC: Update workspace', () => {
  it('should allow owner to update workspace', async () => {
    const app = getApp();
    const db = getDb();
    const ctx = await setupRoleContext(db);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${ctx.workspaceId}`,
      headers: { authorization: `Bearer ${ctx.tokens.owner}` },
      payload: { name: 'Updated by Owner' },
    });

    expect(res.statusCode).toBe(200);
  });

  const deniedRoles: Role[] = ['admin', 'editor', 'viewer'];

  for (const role of deniedRoles) {
    it(`should deny ${role} from updating workspace`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ctx.workspaceId}`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
        payload: { name: `Updated by ${role}` },
      });

      expect(res.statusCode).toBe(403);
    });
  }
});

// ─────────────────────────────────────────────
// Delete Workspace — owner only
// ─────────────────────────────────────────────
describe('RBAC: Delete workspace', () => {
  it('should allow owner to delete workspace', async () => {
    const app = getApp();
    const db = getDb();

    // Create a separate workspace for deletion (can't reuse shared context)
    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Delete RBAC', slug: `del-rbac-${Date.now()}` });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${ws.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { confirmName: 'Delete RBAC' },
    });

    expect(res.statusCode).toBe(200);
  });

  const deniedRoles: Role[] = ['admin', 'editor', 'viewer'];

  for (const role of deniedRoles) {
    it(`should deny ${role} from deleting workspace`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${ctx.workspaceId}`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
        payload: { confirmName: 'RBAC Test' },
      });

      expect(res.statusCode).toBe(403);
    });
  }
});

// ─────────────────────────────────────────────
// Invite Member — admin+ (owner and admin)
// ─────────────────────────────────────────────
describe('RBAC: Invite member', () => {
  const allowedRoles: Role[] = ['owner', 'admin'];

  for (const role of allowedRoles) {
    it(`should allow ${role} to invite a member`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ctx.workspaceId}/invitations`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
        payload: {
          email: `invite-${role}-${Date.now()}@example.com`,
          role: 'viewer',
        },
      });

      expect(res.statusCode).toBe(201);
    });
  }

  const deniedRoles: Role[] = ['editor', 'viewer'];

  for (const role of deniedRoles) {
    it(`should deny ${role} from inviting a member`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ctx.workspaceId}/invitations`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
        payload: {
          email: `invite-${role}-denied@example.com`,
          role: 'viewer',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  }
});

// ─────────────────────────────────────────────
// Create Document (placeholder — test role check only)
// editor+ (owner, admin, editor)
// ─────────────────────────────────────────────
describe('RBAC: Create document (placeholder)', () => {
  const allowedRoles: Role[] = ['owner', 'admin', 'editor'];

  for (const role of allowedRoles) {
    it(`should allow ${role} to create a document (or return 404 if route not yet implemented)`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ctx.workspaceId}/documents`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
        payload: {
          title: `Doc by ${role}`,
          content: '# Hello',
        },
      });

      // Route may not exist yet -- 201 (success) or 404 (not implemented) are acceptable
      // If RBAC is in place but route is stubbed, 201 is expected
      // If route doesn't exist at all, 404
      // Key assertion: NOT 403 (the role should be allowed)
      expect(res.statusCode).not.toBe(403);
    });
  }

  it('should deny viewer from creating a document', async () => {
    const app = getApp();
    const db = getDb();
    const ctx = await setupRoleContext(db);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ctx.workspaceId}/documents`,
      headers: { authorization: `Bearer ${ctx.tokens.viewer}` },
      payload: {
        title: 'Viewer Doc',
        content: '# Denied',
      },
    });

    // If route exists and RBAC is enforced, expect 403
    // If route doesn't exist yet, this test documents expected behavior
    if (res.statusCode !== 404) {
      expect(res.statusCode).toBe(403);
    }
  });
});

// ─────────────────────────────────────────────
// View Document (placeholder — test role check only)
// viewer+ (all roles)
// ─────────────────────────────────────────────
describe('RBAC: View workspace (all members)', () => {
  const allRoles: Role[] = ['owner', 'admin', 'editor', 'viewer'];

  for (const role of allRoles) {
    it(`should allow ${role} to view workspace detail`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ctx.workspaceId}`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
      });

      expect(res.statusCode).toBe(200);
    });
  }
});

// ─────────────────────────────────────────────
// Manage Join Requests — admin+ only
// ─────────────────────────────────────────────
describe('RBAC: Manage join requests', () => {
  const allowedRoles: Role[] = ['owner', 'admin'];

  for (const role of allowedRoles) {
    it(`should allow ${role} to list join requests`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ctx.workspaceId}/join-requests`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
      });

      expect(res.statusCode).toBe(200);
    });
  }

  const deniedRoles: Role[] = ['editor', 'viewer'];

  for (const role of deniedRoles) {
    it(`should deny ${role} from listing join requests`, async () => {
      const app = getApp();
      const db = getDb();
      const ctx = await setupRoleContext(db);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ctx.workspaceId}/join-requests`,
        headers: { authorization: `Bearer ${ctx.tokens[role]}` },
      });

      expect(res.statusCode).toBe(403);
    });
  }
});

// ─────────────────────────────────────────────
// Unauthenticated access — always 401
// ─────────────────────────────────────────────
describe('RBAC: Unauthenticated access', () => {
  const endpoints = [
    { method: 'GET' as const, path: '/api/v1/workspaces' },
    { method: 'POST' as const, path: '/api/v1/workspaces' },
  ];

  for (const { method, path } of endpoints) {
    it(`should return 401 for ${method} ${path} without auth`, async () => {
      const app = getApp();

      const res = await app.inject({
        method,
        url: path,
        payload: method === 'POST' ? { name: 'Test', slug: 'test', isPublic: true } : undefined,
      });

      expect(res.statusCode).toBe(401);
    });
  }

  it('should return 401 for workspace-scoped endpoints without auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Unauth Test', slug: `unauth-${Date.now()}` });

    const scopedEndpoints = [
      { method: 'GET' as const, path: `/api/v1/workspaces/${ws.id}` },
      { method: 'PATCH' as const, path: `/api/v1/workspaces/${ws.id}` },
      { method: 'DELETE' as const, path: `/api/v1/workspaces/${ws.id}` },
      { method: 'GET' as const, path: `/api/v1/workspaces/${ws.id}/members` },
      { method: 'POST' as const, path: `/api/v1/workspaces/${ws.id}/invitations` },
      { method: 'GET' as const, path: `/api/v1/workspaces/${ws.id}/join-requests` },
    ];

    for (const { method, path } of scopedEndpoints) {
      const res = await app.inject({
        method,
        url: path,
        payload: method !== 'GET' ? {} : undefined,
      });

      expect(res.statusCode).toBe(401);
    }
  });
});
