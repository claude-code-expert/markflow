/**
 * T102 -- Import: Markdown & ZIP
 *
 * User Story 5: Import/Export
 */
import { describe, it, expect } from 'vitest';
import archiver from 'archiver';
import { documents, categories } from '@markflow/db';
import { eq, and } from 'drizzle-orm';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace } from '../helpers/factory.js';

function createFormBoundary(): string {
  return '----FormBoundary' + Math.random().toString(36).slice(2);
}

function buildMultipartBody(
  boundary: string,
  fieldName: string,
  filename: string,
  content: Buffer,
  contentType: string,
): Buffer {
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    '',
    '',
  ].join('\r\n');

  const footer = `\r\n--${boundary}--\r\n`;

  return Buffer.concat([
    Buffer.from(header, 'utf-8'),
    content,
    Buffer.from(footer, 'utf-8'),
  ]);
}

async function createZipBuffer(files: Array<{ path: string; content: string }>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 1 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const file of files) {
      archive.append(file.content, { name: file.path });
    }

    void archive.finalize();
  });
}

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:wsId/import — .md
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:wsId/import — Markdown', () => {
  it('should import a .md file and create a document (200)', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Import MD WS', slug: 'import-md-ws' });

    const mdContent = '# Getting Started\n\nThis is a guide.';
    const boundary = createFormBoundary();
    const body = buildMultipartBody(
      boundary,
      'file',
      'getting-started.md',
      Buffer.from(mdContent, 'utf-8'),
      'text/markdown',
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/import`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(200);

    const result = res.json() as {
      imported: number;
      documents: Array<{ id: string; title: string; categoryId: string | null }>;
    };

    expect(result.imported).toBe(1);
    expect(result.documents.length).toBe(1);
    expect(result.documents[0]!.title).toBe('getting-started');

    // Verify DB: document created with correct content
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, result.documents[0]!.id));

    expect(dbDoc).toBeDefined();
    expect(dbDoc!.content).toBe(mdContent);
    expect(dbDoc!.workspaceId).toBe(ws.id);
    expect(dbDoc!.authorId).toBe(user.id);
  });

  it('should return 400 for unsupported file type', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Bad File WS', slug: 'bad-file-ws' });

    const boundary = createFormBoundary();
    const body = buildMultipartBody(
      boundary,
      'file',
      'data.json',
      Buffer.from('{"key": "value"}', 'utf-8'),
      'application/json',
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/import`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(400);

    const result = res.json() as { error: { code: string } };
    expect(result.error.code).toBe('INVALID_FILE_TYPE');
  });
});

// ─────────────────────────────────────────────
// POST /api/v1/workspaces/:wsId/import — .zip
// ─────────────────────────────────────────────
describe('POST /api/v1/workspaces/:wsId/import — ZIP', () => {
  it('should import a .zip file and create categories + documents', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Import ZIP WS', slug: 'import-zip-ws' });

    const zipBuffer = await createZipBuffer([
      { path: 'guides/getting-started.md', content: '# Getting Started' },
      { path: 'guides/advanced.md', content: '# Advanced Guide' },
      { path: 'readme.md', content: '# README' },
    ]);

    const boundary = createFormBoundary();
    const body = buildMultipartBody(
      boundary,
      'file',
      'knowledge-base.zip',
      zipBuffer,
      'application/zip',
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/import`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(200);

    const result = res.json() as {
      imported: number;
      documents: Array<{ id: string; title: string; categoryId: string | null }>;
    };

    expect(result.imported).toBe(3);
    expect(result.documents.length).toBe(3);

    // Verify: "guides" category was created
    const [guidesCategory] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.workspaceId, ws.id),
        eq(categories.name, 'guides'),
      ));

    expect(guidesCategory).toBeDefined();

    // Verify: docs in "guides" folder have the category set
    const guideDocs = result.documents.filter((d) => d.categoryId === guidesCategory!.id);
    expect(guideDocs.length).toBe(2);

    // Verify: root doc has no category
    const rootDoc = result.documents.find((d) => d.title === 'readme');
    expect(rootDoc).toBeDefined();
    expect(rootDoc!.categoryId).toBeNull();
  });
});
