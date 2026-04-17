-- =====================================================================
-- MarkFlow KMS — Consolidated Schema
-- =====================================================================
-- 0000 ~ 0004 마이그레이션을 합친 최종 스키마 (신규 환경 부트스트랩용)
--
-- 순서: TABLES → FOREIGN KEYS → INDEXES
-- 대상: PostgreSQL 16+
-- 사용:  psql "$DATABASE_URL" -f packages/db/SCHEMA.sql
--
-- 주의: 이미 마이그레이션이 적용된 DB에는 사용하지 마세요.
--       기존 DB는 drizzle-kit migrate 또는 push 사용.
-- =====================================================================

BEGIN;

-- =====================================================================
-- TABLES
-- =====================================================================

CREATE TABLE "users" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "name" varchar(100) NOT NULL,
    "avatar_url" varchar(500),
    "email_verified" boolean DEFAULT false NOT NULL,
    "email_verify_token" varchar(255),
    "email_verify_expires_at" timestamp with time zone,
    "password_reset_token" varchar(255),
    "password_reset_expires_at" timestamp with time zone,
    "locked_until" timestamp with time zone,
    "login_fail_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "workspaces" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "is_root" boolean DEFAULT false NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "owner_id" bigint NOT NULL,
    "theme_preset" varchar(20) DEFAULT 'default' NOT NULL,
    "theme_css" text DEFAULT '' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "uq_workspace_owner_name" UNIQUE("owner_id","name")
);

CREATE TABLE "workspace_members" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "user_id" bigint NOT NULL,
    "role" varchar(20) NOT NULL,
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "uq_workspace_member" UNIQUE("workspace_id","user_id")
);

CREATE TABLE "categories" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "name" varchar(100) NOT NULL,
    "parent_id" bigint,
    "order_index" double precision DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "uq_category_name_parent" UNIQUE NULLS NOT DISTINCT("workspace_id","parent_id","name")
);

CREATE TABLE "category_closure" (
    "ancestor_id" bigint NOT NULL,
    "descendant_id" bigint NOT NULL,
    "depth" integer NOT NULL,
    CONSTRAINT "category_closure_ancestor_id_descendant_id_pk" PRIMARY KEY("ancestor_id","descendant_id")
);

CREATE TABLE "documents" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "category_id" bigint,
    "author_id" bigint NOT NULL,
    "title" varchar(300) NOT NULL,
    "content" text DEFAULT '' NOT NULL,
    "current_version" integer DEFAULT 1 NOT NULL,
    "status" varchar(20) DEFAULT 'published' NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "document_versions" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "document_id" bigint NOT NULL,
    "version" integer NOT NULL,
    "content" text NOT NULL,
    "author_id" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "uq_document_version" UNIQUE("document_id","version")
);

CREATE TABLE "document_relations" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "source_id" bigint NOT NULL,
    "target_id" bigint NOT NULL,
    "type" varchar(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "uq_document_relation" UNIQUE("source_id","target_id","type")
);

CREATE TABLE "tags" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "name" varchar(50) NOT NULL,
    CONSTRAINT "uq_tag_workspace_name" UNIQUE("workspace_id","name")
);

CREATE TABLE "document_tags" (
    "document_id" bigint NOT NULL,
    "tag_id" bigint NOT NULL,
    CONSTRAINT "document_tags_document_id_tag_id_pk" PRIMARY KEY("document_id","tag_id")
);

CREATE TABLE "comments" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "document_id" bigint NOT NULL,
    "author_id" bigint NOT NULL,
    "content" text NOT NULL,
    "parent_id" bigint,
    "resolved" boolean DEFAULT false NOT NULL,
    "resolved_by" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "invitations" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "inviter_id" bigint NOT NULL,
    "email" varchar(255) NOT NULL,
    "role" varchar(20) NOT NULL,
    "token" varchar(255) NOT NULL,
    "status" varchar(20) DEFAULT 'pending' NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "invitations_token_unique" UNIQUE("token")
);

CREATE TABLE "join_requests" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "user_id" bigint NOT NULL,
    "message" text,
    "status" varchar(20) DEFAULT 'pending' NOT NULL,
    "reviewed_by" bigint,
    "assigned_role" varchar(20),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "embed_tokens" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workspace_id" bigint NOT NULL,
    "creator_id" bigint NOT NULL,
    "label" varchar(100) NOT NULL,
    "token_hash" varchar(255) NOT NULL,
    "scope" varchar(20) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "embed_tokens_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "refresh_tokens" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "user_id" bigint NOT NULL,
    "token_hash" varchar(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);

-- =====================================================================
-- FOREIGN KEYS
-- =====================================================================

ALTER TABLE "workspaces"
    ADD CONSTRAINT "workspaces_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id");

ALTER TABLE "workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "workspace_members_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "categories_parent_id_categories_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id");

ALTER TABLE "category_closure"
    ADD CONSTRAINT "category_closure_ancestor_id_categories_id_fk"
    FOREIGN KEY ("ancestor_id") REFERENCES "categories"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "category_closure_descendant_id_categories_id_fk"
    FOREIGN KEY ("descendant_id") REFERENCES "categories"("id") ON DELETE CASCADE;

ALTER TABLE "documents"
    ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "documents_category_id_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "documents_author_id_users_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "users"("id");

ALTER TABLE "document_versions"
    ADD CONSTRAINT "document_versions_document_id_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "document_versions_author_id_users_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "users"("id");

ALTER TABLE "document_relations"
    ADD CONSTRAINT "document_relations_source_id_documents_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "documents"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "document_relations_target_id_documents_id_fk"
    FOREIGN KEY ("target_id") REFERENCES "documents"("id") ON DELETE CASCADE;

ALTER TABLE "tags"
    ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

ALTER TABLE "document_tags"
    ADD CONSTRAINT "document_tags_document_id_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "document_tags_tag_id_tags_id_fk"
    FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;

ALTER TABLE "comments"
    ADD CONSTRAINT "comments_document_id_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "comments_author_id_users_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "users"("id"),
    ADD CONSTRAINT "comments_parent_id_comments_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "comments"("id"),
    ADD CONSTRAINT "comments_resolved_by_users_id_fk"
    FOREIGN KEY ("resolved_by") REFERENCES "users"("id");

ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "invitations_inviter_id_users_id_fk"
    FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "join_requests"
    ADD CONSTRAINT "join_requests_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "join_requests_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "join_requests_reviewed_by_users_id_fk"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id");

ALTER TABLE "embed_tokens"
    ADD CONSTRAINT "embed_tokens_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "embed_tokens_creator_id_users_id_fk"
    FOREIGN KEY ("creator_id") REFERENCES "users"("id");

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX "idx_closure_ancestor"           ON "category_closure"   ("ancestor_id");
CREATE INDEX "idx_closure_descendant"         ON "category_closure"   ("descendant_id");

CREATE INDEX "idx_documents_active"           ON "documents"          ("workspace_id","category_id","updated_at") WHERE NOT is_deleted;
CREATE INDEX "idx_documents_deleted"          ON "documents"          ("workspace_id","deleted_at") WHERE is_deleted;
CREATE INDEX "idx_documents_draft_author"     ON "documents"          ("workspace_id","author_id") WHERE status = 'draft' AND NOT is_deleted;

CREATE INDEX "idx_document_relations_source"  ON "document_relations" ("source_id");
CREATE INDEX "idx_document_relations_target"  ON "document_relations" ("target_id");

CREATE INDEX "idx_document_tags_document"     ON "document_tags"      ("document_id");
CREATE INDEX "idx_document_tags_tag"          ON "document_tags"      ("tag_id");

CREATE INDEX "idx_comments_document"          ON "comments"           ("document_id");

CREATE INDEX "idx_embed_tokens_workspace"     ON "embed_tokens"       ("workspace_id");

CREATE UNIQUE INDEX "idx_join_requests_unique_pending"
    ON "join_requests" ("workspace_id","user_id")
    WHERE "status" = 'pending';

CREATE INDEX "idx_refresh_user"               ON "refresh_tokens"     ("user_id");
CREATE INDEX "idx_refresh_expires"            ON "refresh_tokens"     ("expires_at");

COMMIT;
