import {
  documents,
  documentVersions,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { generateSlug, ensureUniqueSlug } from '../utils/slug.js';
import { logger } from '../utils/logger.js';

const htmlToMarkdown = unified()
  .use(rehypeParse)
  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, {
    bullet: '-',
    emphasis: '*',
    strong: '*',
    fences: true,
    listItemIndent: 'one',
    rule: '-',
  });

export function createImportService(db: Db) {
  async function importMarkdown(
    workspaceId: string,
    authorId: string,
    filename: string,
    content: string,
    categoryId?: string | null,
  ) {
    const title = filename.replace(/\.md$/i, '').trim() || 'Untitled';
    const numWorkspaceId = Number(workspaceId);
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(db, numWorkspaceId, baseSlug);

    const [document] = await db
      .insert(documents)
      .values({
        workspaceId: numWorkspaceId,
        authorId: Number(authorId),
        title,
        slug,
        content,
        categoryId: categoryId ? Number(categoryId) : null,
        currentVersion: 1,
      })
      .returning();

    if (!document) {
      throw new Error('Failed to create document from import');
    }

    await db.insert(documentVersions).values({
      documentId: document.id,
      version: 1,
      content,
    });

    logger.info('Markdown imported', { documentId: document.id, filename, categoryId });

    return document;
  }

  async function importHtml(
    workspaceId: string,
    authorId: string,
    filename: string,
    htmlContent: string,
    categoryId?: string | null,
  ) {
    // <body> 태그 내용만 추출, 없으면 전체 사용
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let bodyHtml = bodyMatch?.[1] ?? htmlContent;

    // export에서 추가된 제목 <h1>은 제거 (title로 이미 사용됨)
    bodyHtml = bodyHtml.replace(/<h1[^>]*>[\s\S]*?<\/h1>\s*/, '');

    const result = await htmlToMarkdown.process(bodyHtml);
    const markdown = String(result).trim();
    const title = filename.replace(/\.html?$/i, '').trim() || 'Untitled';

    return importMarkdown(workspaceId, authorId, `${title}.md`, markdown, categoryId);
  }

  return { importMarkdown, importHtml };
}
