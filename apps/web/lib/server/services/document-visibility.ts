import { documents, eq, ne, or } from '@markflow/db';
import type { SQL } from 'drizzle-orm';

/**
 * 문서 draft 가시성 필터.
 * - currentUserId 있으면: 본인 draft 는 포함, 남의 draft 는 제외.
 * - currentUserId 없으면: 모든 draft 제외 (시스템 호출용).
 *
 * document-service / graph-service / category-service 의 조회 쿼리에서 공통으로 사용.
 */
export function draftVisibilityClause(currentUserId?: string): SQL {
  if (currentUserId) {
    return or(
      ne(documents.status, 'draft'),
      eq(documents.authorId, Number(currentUserId)),
    )!;
  }
  return ne(documents.status, 'draft');
}
