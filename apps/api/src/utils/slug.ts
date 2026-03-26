import { eq, and, documents } from '@markflow/db';
import type { Db } from '@markflow/db';

/**
 * Convert a title string to a URL-safe slug.
 * Strips non-ASCII (including Korean), lowercases, replaces spaces/special chars with hyphens,
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')        // strip combining marks
    .replace(/[^\x00-\x7F]/g, '')           // strip non-ASCII (Korean, etc.)
    .replace(/[^a-z0-9\s-]/g, '')           // remove remaining special chars
    .replace(/[\s]+/g, '-')                 // spaces → hyphens
    .replace(/-{2,}/g, '-')                 // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')               // trim leading/trailing hyphens
    || 'untitled';
}

/**
 * Ensure the slug is unique within a workspace.
 * If `baseSlug` already exists, append -2, -3, ... until a unique slug is found.
 */
export async function ensureUniqueSlug(
  db: Db,
  workspaceId: string,
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  for (;;) {
    const existing = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(
        eq(documents.workspaceId, workspaceId),
        eq(documents.slug, candidate),
      ))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}
