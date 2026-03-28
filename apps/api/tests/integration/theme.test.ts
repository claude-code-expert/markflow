import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

describe('Theme API', () => {
  describe('GET /api/v1/workspaces/:id/theme', () => {
    it('returns default theme for new workspace', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.preset).toBe('default');
      expect(body.css).toBe('');
    });

    it('allows Viewer to read theme', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner } = await createUser(db);
      const { user: viewer, accessToken: viewerToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);
      await addMember(db, ws.id, viewer.id, 'viewer');

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /api/v1/workspaces/:id/theme', () => {
    it('updates theme preset and CSS for Admin', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          preset: 'github',
          css: '--mf-font-body: -apple-system, sans-serif;',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.preset).toBe('github');
      expect(body.css).toContain('--mf-font-body');
    });

    it('rejects invalid preset name', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { preset: 'invalid-preset', css: '' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects CSS with non --mf-* properties', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          preset: 'default',
          css: 'background-image: url("javascript:alert(1)"); --mf-font-body: serif;',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('INVALID_CSS');
      expect(body.error.details.rejected).toContain('background-image');
    });

    it('rejects CSS exceeding 10000 characters', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);

      const longCss = '--mf-font-body: ' + 'a'.repeat(10000) + ';';

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { preset: 'default', css: longCss },
      });

      expect(res.statusCode).toBe(400);
    });

    it('denies Editor from updating theme', async () => {
      const app = getApp();
      const db = getDb();

      const { user: owner } = await createUser(db);
      const { user: editor, accessToken: editorToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);
      await addMember(db, ws.id, editor.id, 'editor');

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${ws.id}/theme`,
        headers: { authorization: `Bearer ${editorToken}` },
        payload: { preset: 'dark', css: '' },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
