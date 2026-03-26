# Tasks: KMS SaaS Platform

**Input**: Design documents from `/specs/001-kms-saas-platform/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api-v1.md

**Tests**: Included — Constitution IV (Test-First) mandates TDD approach. Unit 80%+, API Integration 100%.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Monorepo 확장 및 인프라 초기화

- [ ] T001 Create `packages/db/` package with package.json, tsconfig.json, drizzle.config.ts
- [ ] T002 [P] Create `apps/api/` package with Fastify 4+ boilerplate in apps/api/src/index.ts
- [ ] T003 [P] Create `apps/web/` package with Next.js App Router boilerplate in apps/web/app/layout.tsx
- [ ] T004 [P] Create docker-compose.yml with PostgreSQL 16 + Redis 7 services
- [ ] T005 Update turbo.json to include db, api, web packages with correct dependency graph
- [ ] T006 [P] Create apps/api/.env.example with DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN
- [ ] T007 [P] Create apps/api/src/utils/logger.ts — structured logger utility (no console.log direct usage)
- [ ] T008 [P] Create apps/api/src/utils/errors.ts — AppError class with code/message/statusCode
- [ ] T009 Configure shared tsconfig.base.json for strict mode, path aliases across packages

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB 스키마, 인증 미들웨어, RBAC — 모든 User Story의 전제 조건

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Define users table schema in packages/db/src/schema/users.ts (per data-model.md)
- [ ] T011 [P] Define workspaces table schema in packages/db/src/schema/workspaces.ts
- [ ] T012 [P] Define workspace_members table schema in packages/db/src/schema/workspace-members.ts
- [ ] T013 [P] Define refresh_tokens table schema in packages/db/src/schema/refresh-tokens.ts
- [ ] T014 Create barrel export in packages/db/src/index.ts and run drizzle-kit generate for initial migration
- [ ] T015 Implement JWT token utilities (sign, verify, refresh) in apps/api/src/utils/jwt.ts
- [ ] T016 [P] Implement bcrypt password utilities (hash, compare) in apps/api/src/utils/password.ts
- [ ] T017 Implement auth middleware (extractToken → verifyJWT → attach user) in apps/api/src/middleware/auth.ts
- [ ] T018 Implement RBAC middleware (requireRole factory → check workspace_members role) in apps/api/src/middleware/rbac.ts
- [ ] T019 [P] Implement workspace scope middleware (enforce workspace_id on all queries) in apps/api/src/middleware/workspace-scope.ts
- [ ] T020 [P] Implement rate limit middleware (Redis sliding window, IP-based 10req/15min) in apps/api/src/middleware/rate-limit.ts
- [ ] T021 Create test database setup and factory helpers in apps/api/tests/helpers/setup.ts and apps/api/tests/helpers/factory.ts
- [ ] T022 [P] Configure Vitest for apps/api with jsdom environment in apps/api/vitest.config.ts
- [ ] T023 [P] Configure TanStack Query provider + Zustand stores skeleton in apps/web/app/providers.tsx
- [ ] T024 [P] Create API client with auth interceptor in apps/web/lib/api.ts
- [ ] T025 [P] Create auth store (Zustand) in apps/web/stores/auth-store.ts

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - 회원가입 및 개인 워크스페이스 시작 (Priority: P1) 🎯 MVP

**Goal**: 신규 사용자가 이메일로 가입하고, Root 워크스페이스에서 첫 문서를 작성한다

**Independent Test**: 회원가입 → 이메일 인증 → 로그인 → Root 워크스페이스 확인 → 첫 문서 작성 → 자동 저장 확인

### Tests for User Story 1

- [ ] T026 [P] [US1] Integration test for POST /auth/register in apps/api/tests/integration/auth-register.test.ts
- [ ] T027 [P] [US1] Integration test for POST /auth/login (success, lock, rate limit) in apps/api/tests/integration/auth-login.test.ts
- [ ] T028 [P] [US1] Integration test for GET /auth/verify-email in apps/api/tests/integration/auth-verify.test.ts
- [ ] T029 [P] [US1] Integration test for POST /auth/refresh and POST /auth/logout in apps/api/tests/integration/auth-refresh.test.ts
- [ ] T030 [P] [US1] Integration test for GET/PATCH /users/me in apps/api/tests/integration/users-me.test.ts

### Implementation for User Story 1

- [ ] T031 [US1] Implement AuthService (register, login, verify, refresh, logout, account lock) in apps/api/src/services/auth-service.ts
- [ ] T032 [US1] Implement auth routes (register, login, verify-email, refresh, logout) in apps/api/src/routes/auth.ts
- [ ] T033 [US1] Implement user routes (GET /users/me, PATCH /users/me, PUT /users/me/avatar) in apps/api/src/routes/users.ts
- [ ] T034 [US1] Implement Root workspace auto-creation on registration in apps/api/src/services/auth-service.ts (within register flow)
- [ ] T035 [P] [US1] Create RegisterPage UI (form + validation) in apps/web/app/(auth)/register/page.tsx
- [ ] T036 [P] [US1] Create LoginPage UI (form + error states + remember me) in apps/web/app/(auth)/login/page.tsx
- [ ] T037 [US1] Create email verification page in apps/web/app/(auth)/verify-email/page.tsx
- [ ] T038 [US1] Create AppShell layout (Sidebar + MainContent) in apps/web/app/(app)/layout.tsx
- [ ] T039 [US1] Create Sidebar component with workspace header, navigation in apps/web/components/sidebar.tsx
- [ ] T040 [US1] Create workspace dashboard page showing Root workspace in apps/web/app/(app)/[workspaceSlug]/page.tsx

**Checkpoint**: User Story 1 완료 — 회원가입 → 로그인 → Root 워크스페이스 확인까지 검증 가능

---

## Phase 4: User Story 2 - 팀 워크스페이스 생성 및 멤버 관리 (Priority: P1)

**Goal**: 팀 워크스페이스 생성, 멤버 초대, 가입 신청 승인/거절

**Independent Test**: 워크스페이스 생성 → 멤버 초대 → 초대 수락 → 역할별 접근 확인

### Tests for User Story 2

- [ ] T041 [P] [US2] Integration test for workspace CRUD in apps/api/tests/integration/workspaces.test.ts
- [ ] T042 [P] [US2] Integration test for member management in apps/api/tests/integration/members.test.ts
- [ ] T043 [P] [US2] Integration test for invitations (create, accept, expire) in apps/api/tests/integration/invitations.test.ts
- [ ] T044 [P] [US2] Integration test for join requests (create, approve, reject, batch) in apps/api/tests/integration/join-requests.test.ts

### Implementation for User Story 2

- [ ] T045 [US2] Define invitations table schema in packages/db/src/schema/invitations.ts and run migration
- [ ] T046 [P] [US2] Define join_requests table schema in packages/db/src/schema/join-requests.ts and run migration
- [ ] T047 [US2] Implement WorkspaceService (create, update, delete, visibility toggle, owner transfer) in apps/api/src/services/workspace-service.ts
- [ ] T048 [US2] Implement MemberService (list, update role, remove) in apps/api/src/services/member-service.ts
- [ ] T049 [US2] Implement InvitationService (create, accept, expire) in apps/api/src/services/invitation-service.ts
- [ ] T050 [US2] Implement JoinRequestService (create, approve, reject, batch) in apps/api/src/services/join-request-service.ts
- [ ] T051 [US2] Implement workspace routes in apps/api/src/routes/workspaces.ts
- [ ] T052 [P] [US2] Implement invitation routes in apps/api/src/routes/invitations.ts
- [ ] T053 [P] [US2] Implement join-request routes in apps/api/src/routes/join-requests.ts
- [ ] T054 [US2] Create workspace list page (행 기반 뷰, 역할 배지) in apps/web/app/(app)/page.tsx
- [ ] T055 [P] [US2] Create workspace settings page (이름, 공개/비공개, 삭제) in apps/web/app/(app)/[workspaceSlug]/settings/page.tsx
- [ ] T056 [P] [US2] Create member management page (3탭: 멤버/가입신청/초대현황) in apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx
- [ ] T057 [US2] Create invitation accept page in apps/web/app/(auth)/invite/[token]/page.tsx
- [ ] T058 [US2] Add workspace store (Zustand) in apps/web/stores/workspace-store.ts

**Checkpoint**: User Stories 1 AND 2 완료 — 팀 워크스페이스 생성·멤버 관리까지 검증 가능

---

## Phase 5: User Story 6 - 역할 기반 권한 제어 (Priority: P1)

**Goal**: 4가지 역할(Owner/Admin/Editor/Viewer) 권한 매트릭스가 모든 API에서 동작

**Independent Test**: 4가지 역할로 문서 CRUD, 멤버 관리, 설정 변경 시도 → 허용/거부 확인

### Tests for User Story 6

- [ ] T059 [P] [US6] Integration test for role-based access matrix (parametrized) in apps/api/tests/integration/rbac-matrix.test.ts
- [ ] T060 [P] [US6] Integration test for workspace data isolation in apps/api/tests/integration/data-isolation.test.ts

### Implementation for User Story 6

- [ ] T061 [US6] Extend RBAC middleware with granular permission checks (create_doc, invite_member, delete_workspace, etc.) in apps/api/src/middleware/rbac.ts
- [ ] T062 [US6] Apply RBAC middleware to all existing routes (workspaces, members, invitations, join-requests) in apps/api/src/routes/*.ts
- [ ] T063 [US6] Add workspace_id scope enforcement to all document/category queries in apps/api/src/middleware/workspace-scope.ts
- [ ] T064 [US6] Add role-based UI controls (button disable, section hide) in apps/web/hooks/use-permissions.ts

**Checkpoint**: 모든 P1 스토리(US1, US2, US6) 완료 — 인증 + 워크스페이스 + 권한까지 검증 가능

---

## Phase 6: User Story 3 - 문서 작성 및 카테고리 관리 (Priority: P1)

**Goal**: 카테고리(폴더) 구조화, 문서 CRUD, 자동 저장, 버전 스냅샷, 휴지통

**Independent Test**: 폴더 생성 → 문서 생성 → 편집 → 자동 저장 → 삭제 → 휴지통 복원 → 폴더 삭제

### Tests for User Story 3

- [ ] T065 [P] [US3] Integration test for category CRUD + hierarchy in apps/api/tests/integration/categories.test.ts
- [ ] T066 [P] [US3] Integration test for document CRUD + auto-save + versioning in apps/api/tests/integration/documents.test.ts
- [ ] T067 [P] [US3] Integration test for trash (soft delete, restore, permanent delete) in apps/api/tests/integration/trash.test.ts
- [ ] T068 [P] [US3] Unit test for slug generation (한글→영문, 중복 suffix) in apps/api/tests/unit/slug.test.ts

### Implementation for User Story 3

- [ ] T069 [US3] Define categories + category_closure tables in packages/db/src/schema/categories.ts and run migration
- [ ] T070 [P] [US3] Define documents + document_versions tables in packages/db/src/schema/documents.ts and run migration
- [ ] T071 [US3] Implement CategoryService (create, rename, delete with subcategory check, Closure Table management) in apps/api/src/services/category-service.ts
- [ ] T072 [US3] Implement DocumentService (create with slug gen, update, auto-save, version snapshot FIFO 20) in apps/api/src/services/document-service.ts
- [ ] T073 [US3] Implement TrashService (soft delete, list trash, restore, permanent delete) in apps/api/src/services/trash-service.ts
- [ ] T074 [US3] Implement slug generation utility in apps/api/src/utils/slug.ts
- [ ] T075 [US3] Implement category routes in apps/api/src/routes/categories.ts
- [ ] T076 [P] [US3] Implement document routes in apps/api/src/routes/documents.ts
- [ ] T077 [P] [US3] Implement trash routes (GET /trash, POST /trash/:id/restore, DELETE /trash/:id) in apps/api/src/routes/trash.ts
- [ ] T078 [P] [US3] Implement version routes (GET /documents/:id/versions) in apps/api/src/routes/versions.ts
- [ ] T079 [US3] Create CategoryTree sidebar component (폴더 트리, 접기/펼치기) in apps/web/components/category-tree.tsx
- [ ] T080 [P] [US3] Create FolderContextMenu component (새 문서/하위 폴더/이름 변경/삭제) in apps/web/components/folder-context-menu.tsx
- [ ] T081 [P] [US3] Create NewFolderModal component (이름+상위 위치+경로 미리보기) in apps/web/components/new-folder-modal.tsx
- [ ] T082 [P] [US3] Create NewDocModal component (제목+카테고리 선택+시작 방식) in apps/web/components/new-doc-modal.tsx
- [ ] T083 [US3] Create document list page (리스트/그리드 뷰, 정렬, 필터) in apps/web/app/(app)/[workspaceSlug]/docs/page.tsx
- [ ] T084 [US3] Create editor page with @markflow/editor integration + auto-save in apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx
- [ ] T085 [US3] Create trash page (삭제 문서 목록, 복원/영구삭제) in apps/web/app/(app)/[workspaceSlug]/trash/page.tsx
- [ ] T086 [US3] Add editor store (Zustand: documentId, saveStatus, queueSave) in apps/web/stores/editor-store.ts
- [ ] T087 [US3] Add sidebar store (Zustand: expandedCategoryIds, isSidebarOpen) in apps/web/stores/sidebar-store.ts
- [ ] T087a [US3] Create version history panel (버전 목록, 선택 시 내용 프리뷰) in apps/web/components/version-history-panel.tsx

**Checkpoint**: US3 완료 — 폴더 + 문서 + 에디터 + 휴지통까지 완전히 검증 가능

---

## Phase 7: User Story 4 - 문서 간 링크 및 DAG 내비게이션 (Priority: P2)

**Goal**: Prev/Next/연관 관계 설정, DAG Pipeline 시각화 (미니 DAG + 프리뷰 하단 + 그래프 뷰 페이지)

**Independent Test**: 문서 3개 Prev/Next 설정 → 연관 문서 추가 → 미니 DAG 확인 → 그래프 뷰 페이지 확인

### Tests for User Story 4

- [ ] T088 [P] [US4] Integration test for document relations CRUD in apps/api/tests/integration/relations.test.ts
- [ ] T089 [P] [US4] Integration test for circular reference prevention (DFS) in apps/api/tests/integration/circular-ref.test.ts
- [ ] T090 [P] [US4] Integration test for graph API in apps/api/tests/integration/graph.test.ts

### Implementation for User Story 4

- [ ] T091 [US4] Define document_relations table in packages/db/src/schema/document-relations.ts and run migration
- [ ] T092 [US4] Implement RelationService (set prev/next/related, DFS cycle detection, max 20 related) in apps/api/src/services/relation-service.ts
- [ ] T093 [US4] Implement GraphService (build workspace-wide graph data) in apps/api/src/services/graph-service.ts
- [ ] T094 [US4] Implement relation routes (PUT/GET /documents/:id/relations) in apps/api/src/routes/relations.ts
- [ ] T095 [P] [US4] Implement graph route (GET /workspaces/:id/graph) in apps/api/src/routes/graph.ts
- [ ] T096 [US4] Create DocumentMetaPanel with MiniDAGGraph in apps/web/components/document-meta-panel.tsx
- [ ] T097 [P] [US4] Create DAGPipelineGraph component (스테이지 렌더링, 노드 색상, pulse 애니메이션) in apps/web/components/dag-pipeline-graph.tsx
- [ ] T098 [P] [US4] Create DAGPipelineNav component (프리뷰 하단 내비게이션) in apps/web/components/dag-pipeline-nav.tsx
- [ ] T099 [US4] Create GraphViewPage (워크스페이스 전체 DAG, 범례, 통계) in apps/web/app/(app)/[workspaceSlug]/graph/page.tsx
- [ ] T100 [US4] Integrate MiniDAGGraph into editor page meta panel in apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx
- [ ] T101 [US4] Add graph view navigation item to Sidebar in apps/web/components/sidebar.tsx

**Checkpoint**: US4 완료 — 문서 링크 + DAG 시각화 전체 검증 가능

---

## Phase 8: User Story 5 - Import/Export (Priority: P2)

**Goal**: .md/.zip Import/Export

**Independent Test**: .md Import → 문서 확인 → .md Export → 내용 일치 검증

### Tests for User Story 5

- [ ] T102 [P] [US5] Integration test for .md import in apps/api/tests/integration/import.test.ts
- [ ] T103 [P] [US5] Integration test for .md/.zip export in apps/api/tests/integration/export.test.ts

### Implementation for User Story 5

- [ ] T104 [US5] Implement ImportService (.md parse → document create, .zip extract → category + documents) in apps/api/src/services/import-service.ts
- [ ] T105 [US5] Implement ExportService (.md single download, .zip category with folder structure) in apps/api/src/services/export-service.ts
- [ ] T106 [US5] Implement import/export routes in apps/api/src/routes/import-export.ts
- [ ] T107 [US5] Add import/export buttons to document list page toolbar in apps/web/app/(app)/[workspaceSlug]/docs/page.tsx
- [ ] T108 [US5] Add export button to individual document editor page in apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx

**Checkpoint**: US5 완료 — Import/Export 전체 검증 가능

---

## Phase 9: User Story 7 - 태그 관리 (Priority: P2)

**Goal**: 문서 태그 추가/삭제, 태그 필터링

**Independent Test**: 문서에 태그 추가 → 태그로 필터링 → 태그 삭제

### Tests for User Story 7

- [ ] T109 [P] [US7] Integration test for tag CRUD (PUT /documents/:id/tags, max 30) in apps/api/tests/integration/tags.test.ts

### Implementation for User Story 7

- [ ] T110 [US7] Define tags + document_tags tables in packages/db/src/schema/tags.ts and run migration
- [ ] T111 [US7] Implement TagService (upsert tags, set document tags, list workspace tags) in apps/api/src/services/tag-service.ts
- [ ] T112 [US7] Implement tag routes (PUT /documents/:id/tags, GET /workspaces/:id/tags) in apps/api/src/routes/tags.ts
- [ ] T113 [US7] Create TagInput component (autocomplete, badge display) in apps/web/components/tag-input.tsx
- [ ] T114 [US7] Integrate TagInput into document meta panel in apps/web/components/document-meta-panel.tsx
- [ ] T115 [US7] Add tag filter to document list page in apps/web/app/(app)/[workspaceSlug]/docs/page.tsx

**Checkpoint**: US7 완료 — 태그 관리 전체 검증 가능

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 전체 통합, E2E 테스트, 보안 마무리

- [ ] T116 [P] E2E test: 온보딩 플로우 (가입→인증→로그인→문서 작성) in apps/web/tests/e2e/onboarding.spec.ts
- [ ] T117 [P] E2E test: 폴더+문서 관리 플로우 in apps/web/tests/e2e/document-management.spec.ts
- [ ] T118 [P] E2E test: 멤버 초대+역할 권한 플로우 in apps/web/tests/e2e/team-management.spec.ts
- [ ] T119 CSRF protection (SameSite=Strict cookie config, Origin header validation) in apps/api/src/middleware/csrf.ts
- [ ] T120 [P] Add CORS configuration for apps/api in apps/api/src/plugins/cors.ts
- [ ] T121 Implement scheduled job for permanent deletion of 30-day-old soft-deleted documents in apps/api/src/jobs/cleanup-trash.ts
- [ ] T122 [P] Create loading/error/empty states for all pages in apps/web/components/states/
- [ ] T123 Run quickstart.md validation (fresh clone → docker up → migrate → dev → verify)
- [ ] T124 Security audit: verify no secrets in code, all endpoints authenticated, workspace isolation enforced
- [ ] T125 [P] Load test: 1,000개 문서 워크스페이스에서 목록 조회 응답 시간 검증 (SC-005) in apps/api/tests/load/document-list.test.ts
- [ ] T126 [P] Load test: 50명 동시 접속 시나리오 검증 (SC-011) in apps/api/tests/load/concurrent-users.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP entry point
- **US2 (Phase 4)**: Depends on Foundational — can parallel with US1 if team allows
- **US6 (Phase 5)**: Depends on US1 + US2 routes existing — applies RBAC across all
- **US3 (Phase 6)**: Depends on Foundational + US6 (RBAC on doc routes)
- **US4 (Phase 7)**: Depends on US3 (documents must exist)
- **US5 (Phase 8)**: Depends on US3 (documents + categories must exist)
- **US7 (Phase 9)**: Depends on US3 (documents must exist)
- **Polish (Phase 10)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — No dependencies on other stories
- **US2 (P1)**: After Foundational — Can parallel with US1
- **US6 (P1)**: After US1 + US2 — Applies permissions across existing routes
- **US3 (P1)**: After US6 — Documents need RBAC
- **US4 (P2)**: After US3 — Relations need documents
- **US5 (P2)**: After US3 — Import/Export needs documents + categories
- **US7 (P2)**: After US3 — Tags need documents

### Parallel Opportunities

```
Phase 2 (Foundational):
  T010, T011, T012, T013 — all schema files in parallel
  T015, T016 — JWT + password utils in parallel
  T017, T018, T019, T020 — all middleware in parallel
  T022, T023, T024, T025 — test config + frontend setup in parallel

Phase 6 (US3):
  T065, T066, T067, T068 — all test files in parallel
  T069, T070 — schema files in parallel
  T079, T080, T081, T082 — UI components in parallel

Phase 7 (US4):
  T088, T089, T090 — all test files in parallel
  T097, T098 — DAG components in parallel

After US3 complete:
  US4, US5, US7 — all can run in parallel (different files, no dependencies)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: 회원가입 → 로그인 → Root 워크스페이스 → 첫 문서 작성
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → 회원가입/로그인 MVP → Demo
3. US2 → 팀 워크스페이스 + 멤버 → Demo
4. US6 → RBAC 적용 → Demo
5. US3 → 문서/폴더/휴지통 → Demo (핵심 기능 완성)
6. US4 + US5 + US7 (병렬) → 링크/DAG + Import/Export + 태그 → Demo
7. Polish → E2E + 보안 → Phase 1 완료

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (인증)
   - Developer B: US2 (워크스페이스)
3. After US1+US2:
   - Developer A: US6 (RBAC) → US3 (문서)
   - Developer B: US3 UI components (병렬 가능한 컴포넌트)
4. After US3:
   - Developer A: US4 (문서 링크/DAG)
   - Developer B: US5 (Import/Export) + US7 (태그)
5. Team: Polish + E2E

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution IV (Test-First): tests written and FAIL before implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
