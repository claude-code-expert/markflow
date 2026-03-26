import {
  documents,
  documentVersions,
  categories,
  categoryClosure,
  eq,
  and,
  isNull,
  sql,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { Open } from 'unzipper';
import { generateSlug, ensureUniqueSlug } from '../utils/slug.js';
import { logger } from '../utils/logger.js';

export function createImportService(db: Db) {
  /**
   * Import a single markdown file as a new document.
   */
  async function importMarkdown(
    workspaceId: string,
    authorId: string,
    filename: string,
    content: string,
  ) {
    // Derive title from filename (strip .md extension)
    const title = filename.replace(/\.md$/i, '').trim() || 'Untitled';
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(db, workspaceId, baseSlug);

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId,
        authorId,
        title,
        slug,
        content,
        currentVersion: 1,
      })
      .returning();

    if (!document) {
      throw new Error('Failed to create document from import');
    }

    // Create initial version
    await db.insert(documentVersions).values({
      documentId: document.id,
      version: 1,
      content,
    });

    logger.info('Markdown imported', { documentId: document.id, filename });

    return document;
  }

  /**
   * Find or create a category under a given parent in the workspace.
   */
  async function findOrCreateCategory(
    workspaceId: string,
    name: string,
    parentId: string | null,
  ): Promise<string> {
    // Look for existing category
    const conditions = parentId
      ? and(
          eq(categories.workspaceId, workspaceId),
          eq(categories.parentId, parentId),
          eq(categories.name, name),
        )
      : and(
          eq(categories.workspaceId, workspaceId),
          isNull(categories.parentId),
          eq(categories.name, name),
        );

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(conditions)
      .limit(1);

    if (existing) {
      return existing.id;
    }

    // Create new category
    const [category] = await db
      .insert(categories)
      .values({
        workspaceId,
        name,
        parentId,
      })
      .returning();

    if (!category) {
      throw new Error('Failed to create category during import');
    }

    // Self-reference in closure table
    await db.insert(categoryClosure).values({
      ancestorId: category.id,
      descendantId: category.id,
      depth: 0,
    });

    // If has parent, copy ancestor rows
    if (parentId) {
      await db.execute(sql`
        INSERT INTO category_closure (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, ${category.id}, depth + 1
        FROM category_closure
        WHERE descendant_id = ${parentId}
      `);
    }

    return category.id;
  }

  /**
   * Import a ZIP file containing markdown files, possibly in folders.
   * Folder structure is preserved as categories.
   */
  async function importZip(
    workspaceId: string,
    authorId: string,
    buffer: Buffer,
  ) {
    const directory = await Open.buffer(buffer);
    const importedDocs: Array<{ id: string; title: string; categoryId: string | null }> = [];

    for (const entry of directory.files) {
      // Skip directories and non-md files
      if (entry.type === 'Directory') continue;
      if (!entry.path.toLowerCase().endsWith('.md')) continue;

      // Skip hidden files / macOS resource forks
      const pathParts = entry.path.split('/').filter((p) => p.length > 0);
      if (pathParts.some((p) => p.startsWith('.') || p.startsWith('__'))) continue;

      const fileContent = (await entry.buffer()).toString('utf-8');
      const fileName = pathParts[pathParts.length - 1]!;
      const folderParts = pathParts.slice(0, -1);

      // Create category hierarchy from folder structure
      let categoryId: string | null = null;
      for (const folderName of folderParts) {
        categoryId = await findOrCreateCategory(workspaceId, folderName, categoryId);
      }

      // Create document
      const title = fileName.replace(/\.md$/i, '').trim() || 'Untitled';
      const baseSlug = generateSlug(title);
      const slug = await ensureUniqueSlug(db, workspaceId, baseSlug);

      const [document] = await db
        .insert(documents)
        .values({
          workspaceId,
          authorId,
          title,
          slug,
          content: fileContent,
          categoryId,
          currentVersion: 1,
        })
        .returning();

      if (document) {
        await db.insert(documentVersions).values({
          documentId: document.id,
          version: 1,
          content: fileContent,
        });

        importedDocs.push({
          id: document.id,
          title: document.title,
          categoryId: document.categoryId,
        });
      }
    }

    logger.info('ZIP imported', { workspaceId, imported: importedDocs.length });

    return {
      imported: importedDocs.length,
      documents: importedDocs,
    };
  }

  return { importMarkdown, importZip };
}
