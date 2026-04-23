import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/server/db';
import { documents, eq, lt, and } from '@markflow/db';
import { logger } from '../../../../lib/server/utils/logger';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleted = await db
      .delete(documents)
      .where(and(
        eq(documents.isDeleted, true),
        lt(documents.deletedAt, thirtyDaysAgo),
      ))
      .returning({ id: documents.id });

    logger.info('Trash cleanup completed', { deletedCount: deleted.length });
    return NextResponse.json({ ok: true, deletedCount: deleted.length });
  } catch (error) {
    logger.error('Trash cleanup failed', { error });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
