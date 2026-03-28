# Quickstart: Prototype-Based Feature Completion

**Branch**: `004-prototype-features`

## Prerequisites

```bash
# Node.js 20+, pnpm 10+, PostgreSQL 16
node --version   # v20+
pnpm --version   # 10+
psql --version   # 16+
```

## Setup

```bash
# 1. Clone and checkout
git checkout 004-prototype-features
pnpm install

# 2. Environment
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL, JWT_SECRET, etc.

# 3. Database migrations (after schema changes)
pnpm --filter @markflow/db db:migrate

# 4. Start dev servers
pnpm dev
# API: http://localhost:4000
# Web: http://localhost:3002
```

## Implementation Order

구현 순서는 의존성과 가치를 기준으로 정렬:

```
1. US10 Toast System          ← 다른 모든 US가 토스트 사용, 의존성 없음
2. US1  Landing Page           ← 독립적, 프론트엔드 전용
3. US2  Global Search Modal    ← 기존 API 재활용, 프론트엔드 전용
4. US9  Document Links Modal   ← 기존 API 재활용, 프론트엔드 전용
5. US4  DAG Structure Diagram  ← 기존 컴포넌트 재활용
6. US11 Version History Modal  ← 기존 API 재활용 + diff 라이브러리
7. US6  Import/Export Modal    ← 기존 API 재활용
8. US3  Join Request System    ← 기존 API + 신규 공개 WS 검색 API
9. US8  Member Management      ← 기존 API 재활용, UI 보강
10. US5 CSS Theme System       ← DB 마이그레이션 + 신규 API + UI
11. US7 Embed Integration      ← DB 마이그레이션 + 신규 API + UI
```

## Key Files to Modify/Create per Story

### US10 — Toast
- `apps/web/stores/toast-store.ts` (신규)
- `apps/web/components/toast-provider.tsx` (신규)
- `apps/web/app/layout.tsx` (수정: ToastProvider 추가)

### US1 — Landing
- `apps/web/app/(landing)/page.tsx` (신규)
- `apps/web/app/(landing)/layout.tsx` (신규)
- `apps/web/components/landing/hero.tsx` (신규)
- `apps/web/components/landing/features-grid.tsx` (신규)
- `apps/web/components/landing/pricing-section.tsx` (신규)
- `apps/web/components/landing/footer.tsx` (신규)

### US2 — Search Modal
- `apps/web/components/search-modal.tsx` (신규)
- `apps/web/components/sidebar.tsx` (수정: 검색 바 클릭 → 모달)
- `apps/web/components/app-header.tsx` (수정: 검색 아이콘 → 모달)

### US5 — CSS Theme (DB work required)
- `packages/db/src/schema/workspaces.ts` (수정: 컬럼 추가)
- `packages/db/drizzle/0013_add_workspace_theme.sql` (신규)
- `apps/api/src/routes/theme.ts` (신규)
- `apps/api/src/services/theme-service.ts` (신규)
- `apps/web/app/(app)/[workspaceSlug]/settings/theme/page.tsx` (신규)

### US7 — Embed Tokens (DB work required)
- `packages/db/src/schema/embed-tokens.ts` (신규)
- `packages/db/drizzle/0014_create_embed_tokens.sql` (신규)
- `apps/api/src/routes/embed-tokens.ts` (신규)
- `apps/api/src/services/embed-token-service.ts` (신규)
- `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx` (신규)

## Testing

```bash
# Unit tests
pnpm test

# Specific package
pnpm --filter @markflow/editor test
pnpm --filter @markflow/api test

# E2E
pnpm --filter @markflow/web test:e2e

# Watch mode
pnpm --filter @markflow/api test -- --watch
```

## New Dependencies

```bash
# Client-side text diff for version history
pnpm --filter @markflow/web add diff

# No other new dependencies expected
```
