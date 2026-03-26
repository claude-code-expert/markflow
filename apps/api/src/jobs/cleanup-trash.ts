import {
  documents,
  documentVersions,
  eq,
  and,
  lt,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { logger } from '../utils/logger.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Permanently deletes documents that have been soft-deleted for more than 30 days.
 * Removes associated document_versions first, then the documents themselves.
 */
export async function cleanupTrash(db: Db): Promise<number> {
  const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);

  // Find documents that have been in trash for over 30 days
  const staleDocuments = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(
      eq(documents.isDeleted, true),
      lt(documents.deletedAt, cutoffDate),
    ));

  if (staleDocuments.length === 0) {
    logger.info('Trash cleanup: no stale documents to remove');
    return 0;
  }

  const docIds = staleDocuments.map((d) => d.id);

  // Delete document versions for all stale documents
  for (const docId of docIds) {
    await db
      .delete(documentVersions)
      .where(eq(documentVersions.documentId, docId));
  }

  // Delete the documents themselves
  const deletedCount = docIds.length;
  for (const docId of docIds) {
    await db
      .delete(documents)
      .where(eq(documents.id, docId));
  }

  logger.info('Trash cleanup completed', {
    deletedCount,
    cutoffDate: cutoffDate.toISOString(),
  });

  return deletedCount;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Starts a recurring cleanup interval that runs every 24 hours.
 * Returns the interval handle for cleanup on shutdown.
 */
export function startCleanupInterval(db: Db): ReturnType<typeof setInterval> {
  // Run immediately on startup
  void cleanupTrash(db).catch((err: unknown) => {
    logger.error('Trash cleanup failed on startup', err);
  });

  // Then run every 24 hours
  const intervalHandle = setInterval(() => {
    void cleanupTrash(db).catch((err: unknown) => {
      logger.error('Scheduled trash cleanup failed', err);
    });
  }, TWENTY_FOUR_HOURS_MS);

  logger.info('Trash cleanup job scheduled (every 24 hours)');

  return intervalHandle;
}
