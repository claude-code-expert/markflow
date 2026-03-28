# Data Model: Prototype-Based Feature Completion

**Date**: 2026-03-27 | **Branch**: `004-prototype-features`

## Schema Changes

### 1. New Table: `embed_tokens`

Guest Token for iframe embedding (US7).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default random | 토큰 고유 식별자 |
| workspaceId | UUID | FK → workspaces.id, NOT NULL | 소속 워크스페이스 |
| creatorId | UUID | FK → users.id, NOT NULL | 발급자 |
| label | VARCHAR(100) | NOT NULL | 토큰 라벨 (예: "외부 블로그 임베드") |
| tokenHash | VARCHAR(255) | UNIQUE, NOT NULL | 토큰 해시 (bcrypt) |
| scope | VARCHAR(20) | NOT NULL, CHECK ('read', 'read_write') | 권한 범위 |
| expiresAt | TIMESTAMP WITH TZ | NOT NULL | 만료일 |
| revokedAt | TIMESTAMP WITH TZ | NULL | 폐기일 (NULL이면 활성) |
| createdAt | TIMESTAMP WITH TZ | NOT NULL, default now | 생성일 |

**Indexes**:
- `idx_embed_tokens_workspace` ON (workspaceId)
- `idx_embed_tokens_hash` ON (tokenHash) — UNIQUE

**Lifecycle**:
- Created → Active (revokedAt IS NULL AND expiresAt > now)
- Active → Revoked (revokedAt set)
- Active → Expired (expiresAt <= now, no state change needed)

### 2. Column Addition: `workspaces` table

CSS Theme storage (US5).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| themePreset | VARCHAR(20) | DEFAULT 'default' | 프리셋 이름 (default/github/notion/dark/academic) |
| themeCss | TEXT | DEFAULT '' | 커스텀 CSS 변수 오버라이드 |

**Validation Rules**:
- `themePreset` MUST be one of: 'default', 'github', 'notion', 'dark', 'academic'
- `themeCss` MUST contain only `--mf-*` CSS custom properties (서버 사이드 파싱으로 검증)
- `themeCss` maximum length: 10,000 characters

## Existing Tables (No Changes)

### `join_requests` — Already exists

Schema matches spec requirements. Fields: id, workspaceId, userId, message, status (pending/approved/rejected), reviewedBy, assignedRole, createdAt, updatedAt.

**Unique constraint needed**: (workspaceId, userId) WHERE status = 'pending' — 동일 사용자의 중복 대기 신청 방지. 현재 코드에서 서비스 레벨로 처리되어 있으나, DB 제약 추가 권장.

### `documents` — Search support

기존 `GET /documents?q=` 쿼리는 제목 LIKE 검색 지원. Full-text search는 Phase 2 (pg_trgm).

### `document_versions` — Diff support

기존 content 필드가 전체 버전 텍스트를 포함. 클라이언트 사이드 diff에 충분.

### `document_relations` — Links modal

기존 스키마(source, target, type)와 서비스(cycle detection, bidirectional sync)가 US9 요구사항을 완전히 충족.

## Entity Relationships

```
workspaces 1──N embed_tokens    (신규)
workspaces     + themePreset    (신규 컬럼)
workspaces     + themeCss       (신규 컬럼)
workspaces 1──N join_requests   (기존)
documents  1──N document_versions (기존)
documents  N──M document_relations (기존)
```

## Migration Plan

```
Migration 0013: add_workspace_theme_columns
  UP:   ALTER TABLE workspaces ADD COLUMN theme_preset VARCHAR(20) DEFAULT 'default';
        ALTER TABLE workspaces ADD COLUMN theme_css TEXT DEFAULT '';
  DOWN: ALTER TABLE workspaces DROP COLUMN theme_preset;
        ALTER TABLE workspaces DROP COLUMN theme_css;

Migration 0014: create_embed_tokens
  UP:   CREATE TABLE embed_tokens (...);
        CREATE INDEX idx_embed_tokens_workspace ON embed_tokens(workspace_id);
  DOWN: DROP TABLE embed_tokens;

Migration 0015: add_join_request_unique_constraint
  UP:   CREATE UNIQUE INDEX idx_join_requests_unique_pending
        ON join_requests(workspace_id, user_id) WHERE status = 'pending';
  DOWN: DROP INDEX idx_join_requests_unique_pending;
```
