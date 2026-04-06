import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import {
  documents,
  categories,
  eq,
  and,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { notFound } from '../utils/errors.js';
import { escapeHtml } from '../utils/html.js';
import { logger } from '../utils/logger.js';

const markdownToHtml = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

export function createExportService(db: Db) {
  /**
   * Export a single document as markdown.
   */
  async function exportDocument(documentId: string, workspaceId: string) {
    const [doc] = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
      })
      .from(documents)
      .where(and(
        eq(documents.id, Number(documentId)),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    const filename = `${doc.title}.md`;

    logger.info('Document exported', { documentId, filename });

    return { filename, content: doc.content };
  }

  /**
   * Export a category (and all subcategories) as a ZIP archive.
   * Preserves folder structure.
   */
  async function exportCategory(categoryId: string, workspaceId: string) {
    const numCategoryId = Number(categoryId);
    const numWorkspaceId = Number(workspaceId);
    // Verify category exists
    const [category] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(
        eq(categories.id, numCategoryId),
        eq(categories.workspaceId, numWorkspaceId),
      ))
      .limit(1);

    if (!category) {
      throw notFound('Category not found');
    }

    // Get all categories in this workspace to traverse hierarchy
    const allCats = await db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(eq(categories.workspaceId, numWorkspaceId));

    // Collect the target category + all descendants via parentId traversal
    const categoryMap = new Map<number, { name: string; parentId: number | null }>();
    for (const cat of allCats) {
      categoryMap.set(cat.id, { name: cat.name, parentId: cat.parentId });
    }

    // Pre-build children lookup for O(N) traversal
    const childrenMap = new Map<number, number[]>();
    for (const cat of allCats) {
      if (cat.parentId != null) {
        const arr = childrenMap.get(cat.parentId) ?? [];
        arr.push(cat.id);
        childrenMap.set(cat.parentId, arr);
      }
    }

    const categoryIds: number[] = [];
    const queue = [numCategoryId];
    while (queue.length > 0) {
      const id = queue.pop()!;
      categoryIds.push(id);
      for (const childId of childrenMap.get(id) ?? []) {
        queue.push(childId);
      }
    }

    function buildPath(catId: number): string {
      const parts: string[] = [];
      let currentId: number | null = catId;

      while (currentId) {
        const cat = categoryMap.get(currentId);
        if (!cat) break;
        parts.unshift(cat.name);
        if (currentId === numCategoryId) break;
        currentId = cat.parentId;
      }

      return parts.join('/');
    }

    // Get all documents in these categories
    const docs = categoryIds.length > 0
      ? await db
          .select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            categoryId: documents.categoryId,
          })
          .from(documents)
          .where(and(
            eq(documents.workspaceId, numWorkspaceId),
            eq(documents.isDeleted, false),
            sql`${documents.categoryId} IN (${sql.join(categoryIds.map((id) => sql`${id}`), sql`, `)})`,
          ))
      : [];

    // Build ZIP — pipe through PassThrough to avoid backpressure issues
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const passthrough = new PassThrough();
      const chunks: Buffer[] = [];

      passthrough.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      passthrough.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(passthrough);

      // Add documents to archive
      for (const doc of docs) {
        const catPath = doc.categoryId ? buildPath(doc.categoryId) : '';
        const filePath = catPath ? `${catPath}/${doc.title}.md` : `${doc.title}.md`;
        archive.append(doc.content, { name: filePath });
      }

      void archive.finalize();
    });

    const filename = `${category.name}.zip`;

    logger.info('Category exported', { categoryId, filename, documentCount: docs.length });

    return { filename, buffer };
  }

  /**
   * Export a single document as rendered HTML.
   */
  async function exportDocumentHtml(documentId: string, workspaceId: string) {
    const [doc] = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
      })
      .from(documents)
      .where(and(
        eq(documents.id, Number(documentId)),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    const rendered = await markdownToHtml.process(doc.content);
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(doc.title)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1916; }
h1, h2, h3 { margin-top: 1.5em; }
code { background: #f1f0ec; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
pre { background: #f1f0ec; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #cbc9c0; padding-left: 16px; color: #57564f; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #e2e0d8; padding: 8px 12px; text-align: left; }
th { background: #f1f0ec; }
img { max-width: 100%; }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
${String(rendered)}
</body>
</html>`;

    const filename = `${doc.title}.html`;
    logger.info('Document exported as HTML', { documentId, filename });

    return { filename, content: html };
  }

  return { exportDocument, exportDocumentHtml, exportCategory };
}
