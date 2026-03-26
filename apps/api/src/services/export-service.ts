import archiver from 'archiver';
import {
  documents,
  categories,
  categoryClosure,
  eq,
  and,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function createExportService(db: Db) {
  /**
   * Export a single document as markdown.
   */
  async function exportDocument(documentId: string, workspaceId: string) {
    const [doc] = await db
      .select({
        id: documents.id,
        title: documents.title,
        slug: documents.slug,
        content: documents.content,
      })
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, workspaceId),
        eq(documents.isDeleted, false),
      ))
      .limit(1);

    if (!doc) {
      throw notFound('Document not found');
    }

    const filename = `${doc.slug}.md`;

    logger.info('Document exported', { documentId, filename });

    return { filename, content: doc.content };
  }

  /**
   * Export a category (and all subcategories) as a ZIP archive.
   * Preserves folder structure.
   */
  async function exportCategory(categoryId: string, workspaceId: string) {
    // Verify category exists
    const [category] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId),
      ))
      .limit(1);

    if (!category) {
      throw notFound('Category not found');
    }

    // Get all descendant category IDs via closure table
    const descendants = await db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
      })
      .from(categoryClosure)
      .innerJoin(categories, eq(categories.id, categoryClosure.descendantId))
      .where(eq(categoryClosure.ancestorId, categoryId));

    // Build a map of category ID -> full path
    const categoryMap = new Map<string, { name: string; parentId: string | null }>();
    for (const desc of descendants) {
      categoryMap.set(desc.id, { name: desc.name, parentId: desc.parentId });
    }

    function buildPath(catId: string): string {
      const parts: string[] = [];
      let currentId: string | null = catId;

      while (currentId) {
        const cat = categoryMap.get(currentId);
        if (!cat) break;
        parts.unshift(cat.name);
        // Stop traversal at the root category being exported
        if (currentId === categoryId) break;
        currentId = cat.parentId;
      }

      return parts.join('/');
    }

    // Get all documents in these categories
    const categoryIds = descendants.map((d) => d.id);

    const docs = categoryIds.length > 0
      ? await db
          .select({
            id: documents.id,
            title: documents.title,
            slug: documents.slug,
            content: documents.content,
            categoryId: documents.categoryId,
          })
          .from(documents)
          .where(and(
            eq(documents.workspaceId, workspaceId),
            eq(documents.isDeleted, false),
            sql`${documents.categoryId} IN (${sql.join(categoryIds.map((id) => sql`${id}`), sql`, `)})`,
          ))
      : [];

    // Build ZIP
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      // Add documents to archive
      for (const doc of docs) {
        const catPath = doc.categoryId ? buildPath(doc.categoryId) : '';
        const filePath = catPath ? `${catPath}/${doc.slug}.md` : `${doc.slug}.md`;
        archive.append(doc.content, { name: filePath });
      }

      void archive.finalize();
    });

    const filename = `${category.name}.zip`;

    logger.info('Category exported', { categoryId, filename, documentCount: docs.length });

    return { filename, buffer };
  }

  return { exportDocument, exportCategory };
}
