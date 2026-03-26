/**
 * T103 -- Export: Document & Category
 *
 * User Story 5: Import/Export
 */
import { describe, it, expect } from 'vitest';
import { Open } from 'unzipper';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember } from '../helpers/factory.js';

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/documents/:docId/export
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/documents/:docId/export', () => {
  it('should export a document as .md file', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Export MD WS', slug: 'export-md-ws' });

    // Create a document with content
    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'API Guide', content: '# API Guide\n\nWelcome to the API docs.' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string; slug: string } };

    // Export it
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/export?format=md`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.headers['content-disposition']).toContain('.md');
    expect(res.body).toBe('# API Guide\n\nWelcome to the API docs.');
  });

  it('should return 404 for non-existent document', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Export WS', slug: 'no-export-ws' });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${fakeId}/export?format=md`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should allow viewer to export a document', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db);
    const ws = await createWorkspace(db, owner.id, { name: 'Viewer Export WS', slug: 'viewer-export-ws' });

    const docRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Exportable Doc', content: '# Content' },
    });
    expect(docRes.statusCode).toBe(201);
    const doc = docRes.json() as { document: { id: string } };

    const { user: viewer, accessToken: viewerToken } = await createUser(db);
    await addMember(db, ws.id, viewer.id, 'viewer');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.document.id}/export?format=md`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('# Content');
  });
});

// ─────────────────────────────────────────────
// GET /api/v1/workspaces/:wsId/categories/:catId/export
// ─────────────────────────────────────────────
describe('GET /api/v1/workspaces/:wsId/categories/:catId/export', () => {
  it('should export a category as .zip file containing markdown files', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Export ZIP WS', slug: 'export-zip-ws' });

    // Create category
    const catRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/categories`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Guides' },
    });
    expect(catRes.statusCode).toBe(201);
    const cat = catRes.json() as { category: { id: string } };

    // Create docs in category
    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'Setup Guide',
        content: '# Setup\n\nFollow these steps.',
        categoryId: cat.category.id,
      },
    });

    await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'Deploy Guide',
        content: '# Deploy\n\nDeploy instructions.',
        categoryId: cat.category.id,
      },
    });

    // Export category
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${cat.category.id}/export?format=zip`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('.zip');

    // Verify ZIP contents
    const zipBuffer = Buffer.from(res.rawPayload);
    const directory = await Open.buffer(zipBuffer);

    const filePaths = directory.files
      .filter((f) => f.type !== 'Directory')
      .map((f) => f.path);

    expect(filePaths.length).toBe(2);

    // All files should be .md
    for (const path of filePaths) {
      expect(path.endsWith('.md')).toBe(true);
    }
  });

  it('should return 404 for non-existent category', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'No Cat Export WS', slug: 'no-cat-export-ws' });

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/categories/${fakeId}/export?format=zip`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
