import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

describe('Embed Tokens API', () => {
  describe('POST /api/v1/workspaces/:id/embed-tokens', () => {
    it('creates a token and returns the raw token only once', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          label: 'Blog embed',
          scope: 'read',
          expiresAt: '2026-12-31T23:59:59Z',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.label).toBe('Blog embed');
      expect(body.token).toMatch(/^mf_gt_/);
      expect(body.scope).toBe('read');
      expect(body.expiresAt).toBeDefined();
    });

    it('denies Editor from creating tokens', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner } = await createUser(db);
      const { user: editor, accessToken: editorToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);
      await addMember(db, ws.id, editor.id, 'editor');

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${editorToken}` },
        payload: {
          label: 'Should fail',
          scope: 'read',
          expiresAt: '2026-12-31T23:59:59Z',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('validates required fields', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/workspaces/:id/embed-tokens', () => {
    it('lists tokens with masked preview', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      // Create a token first
      await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          label: 'List test',
          scope: 'read_write',
          expiresAt: '2026-12-31T23:59:59Z',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.tokens).toHaveLength(1);
      expect(body.tokens[0].tokenPreview).toMatch(/\.\.\./);
      expect(body.tokens[0].token).toBeUndefined();
      expect(body.tokens[0].isActive).toBe(true);
    });
  });

  describe('DELETE /api/v1/workspaces/:id/embed-tokens/:tokenId', () => {
    it('revokes an active token', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          label: 'Revoke test',
          scope: 'read',
          expiresAt: '2026-12-31T23:59:59Z',
        },
      });
      const tokenId = createRes.json().id;

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens/${tokenId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(deleteRes.statusCode).toBe(204);

      // Verify token is no longer active
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ws.id}/embed-tokens`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const tokens = listRes.json().tokens;
      const revoked = tokens.find((t: { id: string }) => t.id === tokenId);
      expect(revoked?.isActive).toBe(false);
    });
  });
});
