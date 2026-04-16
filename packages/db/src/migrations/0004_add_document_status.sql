-- Phase 2: 문서 임시저장(draft) 상태 도입
-- 'published' = 기본값 (기존 동작 유지), 'draft' = 작성자만 볼 수 있는 임시저장
ALTER TABLE "documents" ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'published';--> statement-breakpoint

-- Draft 조회 성능을 위한 부분 인덱스 (작성자별 draft 만 빠르게 조회)
CREATE INDEX "idx_documents_draft_author" ON "documents" ("workspace_id", "author_id")
  WHERE status = 'draft' AND NOT is_deleted;

-- ROLLBACK (DOWN):
-- DROP INDEX IF EXISTS "idx_documents_draft_author";
-- ALTER TABLE "documents" DROP COLUMN "status";
