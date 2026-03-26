# Data Model: KMS SaaS Platform

**Date**: 2026-03-26
**ORM**: Drizzle ORM (PostgreSQL 16)

## Entity Relationship Diagram

```
User 1──* WorkspaceMember *──1 Workspace
User 1──* Invitation
User 1──* JoinRequest *──1 Workspace
Workspace 1──* Category
Workspace 1──* Document
Category 1──* Document (nullable)
Category *──* CategoryClosure (self-referential hierarchy)
Document 1──* DocumentVersion
Document 1──* DocumentRelation (as source)
Document *──* DocumentTag *──1 Tag
```

## Tables

### users

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 로그인 식별자 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 해시 |
| name | VARCHAR(100) | NOT NULL | 표시 이름 |
| avatar_url | VARCHAR(500) | NULLABLE | JPG/PNG, 2MB 이하 |
| email_verified | BOOLEAN | NOT NULL, default false | |
| email_verify_token | VARCHAR(255) | NULLABLE | 24시간 유효 |
| email_verify_expires_at | TIMESTAMPTZ | NULLABLE | |
| locked_until | TIMESTAMPTZ | NULLABLE | 계정 잠금 만료 시각 |
| login_fail_count | INTEGER | NOT NULL, default 0 | 연속 실패 횟수 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

### workspaces

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL 경로 |
| is_root | BOOLEAN | NOT NULL, default false | Root 워크스페이스 여부 (삭제 불가) |
| is_public | BOOLEAN | NOT NULL, default true | 공개 시 가입 신청 가능 |
| owner_id | UUID | FK → users.id, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

### workspace_members

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| workspace_id | UUID | FK → workspaces.id, NOT NULL | |
| user_id | UUID | FK → users.id, NOT NULL | |
| role | VARCHAR(20) | NOT NULL, CHECK IN ('owner','admin','editor','viewer') | |
| joined_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique**: (workspace_id, user_id)

### categories

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| workspace_id | UUID | FK → workspaces.id, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | |
| parent_id | UUID | FK → categories.id, NULLABLE | 루트 카테고리는 NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique**: (workspace_id, parent_id, name) — 같은 부모 아래 중복 이름 방지

### category_closure

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| ancestor_id | UUID | FK → categories.id, NOT NULL | |
| descendant_id | UUID | FK → categories.id, NOT NULL | |
| depth | INTEGER | NOT NULL | 0 = 자기 자신 |

**PK**: (ancestor_id, descendant_id)

### documents

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| workspace_id | UUID | FK → workspaces.id, NOT NULL | 데이터 격리 |
| category_id | UUID | FK → categories.id, NULLABLE | NULL = 루트 위치 |
| author_id | UUID | FK → users.id, NOT NULL | |
| title | VARCHAR(300) | NOT NULL | |
| slug | VARCHAR(300) | NOT NULL | |
| content | TEXT | NOT NULL, default '' | 마크다운 본문 |
| current_version | INTEGER | NOT NULL, default 1 | |
| is_deleted | BOOLEAN | NOT NULL, default false | Soft Delete |
| deleted_at | TIMESTAMPTZ | NULLABLE | 삭제 시각 (30일 후 영구 삭제) |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique**: (workspace_id, slug) — 워크스페이스 내 slug 고유

### document_versions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| document_id | UUID | FK → documents.id, NOT NULL | |
| version | INTEGER | NOT NULL | |
| content | TEXT | NOT NULL | 전체 스냅샷 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique**: (document_id, version)
**Rule**: 문서당 최대 20개, 초과 시 가장 오래된 버전 삭제 (FIFO)

### document_relations

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| source_id | UUID | FK → documents.id, NOT NULL | |
| target_id | UUID | FK → documents.id, NOT NULL | |
| type | VARCHAR(20) | NOT NULL, CHECK IN ('prev','next','related') | |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

**Unique**: (source_id, target_id, type)
**Rule**: related 타입은 문서당 최대 20개. prev/next는 DFS로 순환 참조 방지

### tags

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| workspace_id | UUID | FK → workspaces.id, NOT NULL | |
| name | VARCHAR(50) | NOT NULL | |

**Unique**: (workspace_id, name)

### document_tags

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| document_id | UUID | FK → documents.id, NOT NULL | |
| tag_id | UUID | FK → tags.id, NOT NULL | |

**PK**: (document_id, tag_id)
**Rule**: 문서당 최대 30개

### invitations

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| workspace_id | UUID | FK → workspaces.id, NOT NULL | |
| inviter_id | UUID | FK → users.id, NOT NULL | |
| email | VARCHAR(255) | NOT NULL | |
| role | VARCHAR(20) | NOT NULL | 초대 시 지정한 역할 |
| token | VARCHAR(255) | UNIQUE, NOT NULL | URL 토큰 |
| status | VARCHAR(20) | NOT NULL, default 'pending' | pending/accepted/expired |
| expires_at | TIMESTAMPTZ | NOT NULL | 72시간 후 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

### join_requests

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| workspace_id | UUID | FK → workspaces.id, NOT NULL | |
| user_id | UUID | FK → users.id, NOT NULL | |
| message | TEXT | NULLABLE | 신청 메시지 |
| status | VARCHAR(20) | NOT NULL, default 'pending' | pending/approved/rejected |
| reviewed_by | UUID | FK → users.id, NULLABLE | 승인/거절한 관리자 |
| assigned_role | VARCHAR(20) | NULLABLE | 승인 시 부여할 역할 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |

### refresh_tokens

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | 해시 저장 |
| expires_at | TIMESTAMPTZ | NOT NULL | 7일 (remember me: 30일) |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

## Indexes

```sql
-- 문서 조회 (워크스페이스 + 카테고리 필터)
CREATE INDEX idx_doc_ws_cat_updated
    ON documents(workspace_id, category_id, updated_at DESC)
    WHERE is_deleted = FALSE;

-- 삭제된 문서 (휴지통 조회)
CREATE INDEX idx_doc_ws_deleted
    ON documents(workspace_id, deleted_at)
    WHERE is_deleted = TRUE;

-- 한국어 제목 검색 (Phase 1: LIKE, Phase 2: FTS)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_doc_trgm_title ON documents USING gin(title gin_trgm_ops);

-- Closure Table (카테고리 서브트리 조회)
CREATE INDEX idx_closure_ancestor ON category_closure(ancestor_id);
CREATE INDEX idx_closure_descendant ON category_closure(descendant_id);

-- 문서 관계 (DAG 그래프)
CREATE INDEX idx_relation_source ON document_relations(source_id);
CREATE INDEX idx_relation_target ON document_relations(target_id);

-- 태그 조회
CREATE INDEX idx_doc_tags_doc ON document_tags(document_id);
CREATE INDEX idx_doc_tags_tag ON document_tags(tag_id);

-- Refresh Token 정리
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);
```

## State Transitions

### Document Lifecycle

```
created → active ←→ editing (auto-save loop)
                  → deleted (soft) → permanently_deleted (30일 후)
                                   → restored (휴지통에서 복원)
```

### Invitation Lifecycle

```
pending → accepted (멤버 추가)
       → expired (72시간 초과)
```

### Join Request Lifecycle

```
pending → approved (멤버 추가 + 역할 부여)
       → rejected
```

### Account Lock

```
normal → locked (5회 연속 실패, 15분)
      → normal (15분 경과 후 자동 해제)
```
