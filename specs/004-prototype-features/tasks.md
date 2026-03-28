# Tasks: Prototype-Based Feature Completion

**Input**: Design documents from `/specs/004-prototype-features/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution IV (Test-First) and CLAUDE.md 규칙.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `apps/api/src/`
- **Frontend**: `apps/web/`
- **Database**: `packages/db/src/schema/`
- **Editor**: `packages/editor/src/`

---

## Phase 1: Setup

**Purpose**: DB 마이그레이션 및 공유 인프라 준비

- [x] T001 Add themePreset and themeCss columns to workspaces schema in `packages/db/src/schema/workspaces.ts`
- [x] T002 [P] Create embed_tokens table schema in `packages/db/src/schema/embed-tokens.ts`
- [x] T003 [P] Add unique partial index for join_requests (workspace_id, user_id) WHERE status='pending' in migration
- [x] T004 Generate and run Drizzle migrations via `pnpm --filter @markflow/db db:generate && db:migrate`
- [x] T005 Export new schema from `packages/db/src/index.ts` barrel

**Checkpoint**: DB schema ready — all tables and columns exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 토스트 시스템 — 모든 User Story가 사용자 피드백에 의존

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Create toast store with add/remove/clear actions in `apps/web/stores/toast-store.ts`
- [x] T007 [P] Write unit test for toast store (add, auto-remove, max 3 stack) in `apps/web/__tests__/stores/toast-store.test.ts`
- [x] T008 Create ToastProvider component (render toasts, auto-dismiss 3s/5s, stack max 3) in `apps/web/components/toast-provider.tsx`
- [x] T009 Integrate ToastProvider into root layout in `apps/web/app/layout.tsx`

**Checkpoint**: Toast system operational — `useToastStore().addToast({message, type})` usable from any component

---

## Phase 3: User Story 1 - Landing Page & Marketing Site (Priority: P1) 🎯 MVP

**Goal**: 비로그인 사용자가 제품 가치를 이해하고 가입 페이지까지 도달하는 랜딩 페이지

**Independent Test**: `/` 접속 시 Hero, Features(6카드), Pricing(3티어), Footer 렌더링. "Start for free" → `/register` 이동

### Tests for US1

- [x] T010 [US1] Write E2E test: landing page renders all sections and CTA links work in `apps/web/tests/e2e/landing.spec.ts`

### Implementation for US1

- [x] T011 [P] [US1] Create landing layout (no sidebar/header) in `apps/web/app/(landing)/layout.tsx`
- [x] T012 [P] [US1] Create Hero component (eyebrow, title, subtitle, 2 CTA buttons) in `apps/web/components/landing/hero.tsx`
- [x] T013 [P] [US1] Create FeaturesGrid component (6 feature cards) in `apps/web/components/landing/features-grid.tsx`
- [x] T014 [P] [US1] Create PricingSection component (Free/Team/Enterprise tiers) in `apps/web/components/landing/pricing-section.tsx`
- [x] T015 [P] [US1] Create Footer component in `apps/web/components/landing/footer.tsx`
- [x] T016 [P] [US1] Create NavBar component (logo, links, auth buttons) in `apps/web/components/landing/nav-bar.tsx`
- [x] T017 [US1] Assemble landing page with all sections in `apps/web/app/(landing)/page.tsx`
- [x] T018 [US1] Add auth redirect: logged-in users → workspace selector in `apps/web/app/(landing)/page.tsx`

**Checkpoint**: Landing page fully functional at `/`

---

## Phase 4: User Story 2 - Global Search Modal (Priority: P2)

**Goal**: Cmd+/ 또는 Ctrl+/로 전역 검색 모달 열어 문서 검색 및 이동

**Independent Test**: 앱 내 Cmd+/ → 모달 열림, 검색어 입력 → 결과 하이라이트, Enter → 문서 이동

### Tests for US2

- [x] T019 [US2] Write unit test for search modal keyboard navigation and result rendering in `apps/web/__tests__/components/search-modal.test.tsx`

### Implementation for US2

- [x] T020 [US2] Create SearchModal component (input, recent docs, results, highlight, keyboard nav) in `apps/web/components/search-modal.tsx`
- [x] T021 [US2] Add global keyboard listener for Cmd+/ and Ctrl+/ in `apps/web/app/(app)/layout.tsx`
- [x] T022 [P] [US2] Update sidebar search bar to open SearchModal on click in `apps/web/components/sidebar.tsx`
- [x] T023 [P] [US2] Update header search icon to open SearchModal on click in `apps/web/components/app-header.tsx`

**Checkpoint**: Search modal opens with Cmd+/, shows results, navigates on Enter

---

## Phase 5: User Story 9 - Document Links Modal & Preview Navigation (Priority: P9)

**Goal**: 메타 패널에서 문서 링크 관리 모달로 Prev/Next/Related 설정, 프리뷰 하단 내비게이션

**Independent Test**: 메타 패널 "관리" → 모달에서 Prev/Next 설정 → 프리뷰 하단에 내비게이션 카드 표시

### Tests for US9

- [x] T024 [US9] Write unit test for DocumentLinksModal search, cycle detection warning, save in `apps/web/__tests__/components/document-links-modal.test.tsx`

### Implementation for US9

- [x] T025 [US9] Create DocumentLinksModal component (prev/next/related inputs, doc search, cycle warning) in `apps/web/components/document-links-modal.tsx`
- [x] T026 [US9] Extract inline relation editing from DocumentMetaPanel to use modal in `apps/web/components/document-meta-panel.tsx`
- [x] T027 [US9] Add Prev/Next navigation cards at preview bottom in `apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx`

**Checkpoint**: Document links editable via modal, preview bottom shows Prev/Next navigation

---

## Phase 6: User Story 4 - Document Structure Diagram (Priority: P4)

**Goal**: 메타 패널 미니 DAG + 전체 다이어그램 모달 (색상 코드, 범례, 줌, 노드 클릭 이동)

**Independent Test**: 메타 패널 "문서 연결 구조" SVG 표시, "전체 보기" → 모달에 인터랙티브 DAG 표시

### Tests for US4

- [x] T028 [US4] Write unit test for MiniDagDiagram rendering with different relation states in `apps/web/__tests__/components/mini-dag-diagram.test.tsx`

### Implementation for US4

- [x] T029 [P] [US4] Create MiniDagDiagram component (inline SVG: root→category→current→prev/next) in `apps/web/components/mini-dag-diagram.tsx`
- [x] T030 [P] [US4] Create DagStructureModal component (full SVG, legend, zoom, summary cards, "링크 편집" button) in `apps/web/components/dag-structure-modal.tsx`
- [x] T031 [US4] Integrate MiniDagDiagram into meta panel "문서 연결 구조" section in `apps/web/components/document-meta-panel.tsx`

**Checkpoint**: Mini DAG visible in meta panel, full modal opens with interactive graph

---

## Phase 7: User Story 11 - Version History Enhancement (Priority: P11)

**Goal**: 버전 히스토리 모달 (좌: 버전 목록, 우: diff 미리보기, 복원)

**Independent Test**: 메타 패널 "전체 보기" → 2패널 모달, 버전 선택 → 추가(초록)/삭제(빨강) diff 표시

### Tests for US11

- [x] T032 [US11] Write unit test for version diff rendering (additions green, deletions red) in `apps/web/__tests__/components/version-history-modal.test.tsx`

### Implementation for US11

- [x] T033 [US11] Add `diff` npm package to web app: `pnpm --filter @markflow/web add diff`
- [x] T034 [US11] Create VersionHistoryModal component (2-panel: version list + diff preview, restore button) in `apps/web/components/version-history-modal.tsx`
- [x] T035 [US11] Add "전체 보기" button to version-history-panel linking to modal in `apps/web/components/version-history-panel.tsx`
- [x] T036 [US11] Add unsaved changes warning on restore in `apps/web/components/version-history-modal.tsx`

**Checkpoint**: Version history modal shows diff preview, restore creates new version

---

## Phase 8: User Story 6 - Import/Export Enhancement (Priority: P6)

**Goal**: Import/Export 모달 (가져오기 탭: 형식 선택 + 드래그앤드롭, 내보내기 탭: 범위/형식 선택)

**Independent Test**: 모달에서 MD 파일 드래그앤드롭 → 문서 추가, 내보내기 범위 선택 → 파일 다운로드

### Tests for US6

- [x] T037 [US6] Write unit test for ImportExportModal tab switching and file type selection in `apps/web/__tests__/components/import-export-modal.test.tsx`

### Implementation for US6

- [x] T038 [US6] Create ImportExportModal component (import tab: type select + dropzone, export tab: scope + format) in `apps/web/components/import-export-modal.tsx`
- [ ] T039 [P] [US6] Add import/export modal trigger to sidebar "가져오기/내보내기" item in `apps/web/components/sidebar.tsx`
- [ ] T040 [P] [US6] Add export button to editor toolbar linking to modal in `apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx`

**Checkpoint**: Import via drag-drop works, export with scope selection downloads file

---

## Phase 9: User Story 3 - Workspace Join Request System (Priority: P3)

**Goal**: 공개 워크스페이스 검색 및 가입 신청, 관리자 승인/거절

**Independent Test**: 워크스페이스 선택 화면 "가입 신청" 패널에서 검색 → 신청 → 관리자 탭에서 승인

### Tests for US3

- [x] T041 [P] [US3] Write integration test for `GET /workspaces/public` endpoint in `apps/api/tests/integration/public-workspaces.test.ts`
- [x] T042 [P] [US3] Write unit test for JoinRequestPanel component in `apps/web/__tests__/components/join-request-panel.test.tsx`

### Implementation for US3

- [x] T043 [US3] Add `GET /workspaces/public?q=&page=&limit=` route returning public workspaces with pendingRequest flag in `apps/api/src/routes/workspaces.ts`
- [x] T044 [US3] Add listPublicWorkspaces method to workspace service in `apps/api/src/services/workspace-service.ts`
- [x] T045 [US3] Create JoinRequestPanel component (collapsible, search, results, request modal) in `apps/web/components/join-request-panel.tsx`
- [x] T046 [US3] Integrate JoinRequestPanel into workspace selector page in `apps/web/app/(app)/page.tsx`
- [x] T047 [US3] Add pending join request display with cancel button in workspace list in `apps/web/app/(app)/page.tsx`

**Checkpoint**: Users can search public workspaces, submit join requests, admins can approve/reject

---

## Phase 10: User Story 8 - Member Management Enhancement (Priority: P8)

**Goal**: 멤버 관리 4탭 (멤버 목록/가입 신청/초대 현황/내보내기) + 역할 매트릭스

**Independent Test**: 설정 > 멤버 관리에서 4탭 전환, 초대 현황 탭에서 재발송, 멤버 CSV 내보내기

### Tests for US8

- [x] T048 [US8] Write unit test for member management tab switching and role matrix rendering in `apps/web/__tests__/settings/members.test.tsx`

### Implementation for US8

- [ ] T049 [US8] Refactor members page into 4 tabs (members/join-requests/invites/export) in `apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx`
- [x] T050 [P] [US8] Create InviteStatusTab component (invitation list, remaining time, resend button) in `apps/web/components/settings/invite-status-tab.tsx`
- [x] T051 [P] [US8] Create MemberExportTab component (CSV/PDF export with date filter) in `apps/web/components/settings/member-export-tab.tsx`
- [ ] T052 [US8] Add role permission matrix table to members tab in `apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx`

**Checkpoint**: All 4 member management tabs functional with data display

---

## Phase 11: User Story 5 - CSS Theme System (Priority: P5)

**Goal**: 설정 > CSS 테마에서 5 프리셋 선택 또는 CSS 변수 편집, 워크스페이스 전체 적용

**Independent Test**: 프리셋 선택 → 프리뷰 변경, CSS 변수 수정 → 저장 → 문서 프리뷰에 반영

### Tests for US5

- [x] T053 [P] [US5] Write integration test for `PATCH /workspaces/:id/theme` with CSS validation in `apps/api/tests/integration/theme.test.ts`
- [x] T054 [P] [US5] Write unit test for CSS variable validator (allow --mf-*, reject others) in `apps/api/tests/unit/theme-validator.test.ts`

### Implementation for US5

- [x] T055 [US5] Create CSS variable validator utility (parse CSS, allow only --mf-* properties) in `apps/api/src/utils/css-validator.ts`
- [x] T056 [US5] Create theme service (get/update theme, validate CSS) in `apps/api/src/services/theme-service.ts`
- [x] T057 [US5] Create theme routes (`GET /workspaces/:id/theme`, `PATCH /workspaces/:id/theme`) in `apps/api/src/routes/theme.ts`
- [x] T058 [US5] Register theme routes in app in `apps/api/src/index.ts`
- [x] T059 [US5] Create CSS theme settings page (preset selector, CSS editor, validate button, save & apply) in `apps/web/app/(app)/[workspaceSlug]/settings/theme/page.tsx`
- [ ] T060 [US5] Add theme CSS injection into document preview (dynamic `<style>` tag per workspace) in `apps/web/app/(app)/[workspaceSlug]/layout.tsx`
- [x] T061 [US5] Add "CSS 테마" nav item to settings sidebar in `apps/web/components/sidebar.tsx`

**Checkpoint**: Theme presets selectable, CSS variables editable and validated, applied to all doc previews

---

## Phase 12: User Story 7 - Embed Integration Settings (Priority: P7)

**Goal**: 설정 > 임베드 연동 3탭 (NPM/iframe/API) + Guest Token CRUD

**Independent Test**: iframe 탭에서 Guest Token 발급 → 목록에 표시 → 복사/폐기 동작

### Tests for US7

- [x] T062 [P] [US7] Write integration test for embed-token CRUD endpoints in `apps/api/tests/integration/embed-tokens.test.ts`

### Implementation for US7

- [x] T063 [US7] Create embed-token service (create with hash, list, revoke) in `apps/api/src/services/embed-token-service.ts`
- [x] T064 [US7] Create embed-token routes (POST/GET/DELETE) in `apps/api/src/routes/embed-tokens.ts`
- [x] T065 [US7] Register embed-token routes in app in `apps/api/src/index.ts`
- [x] T066 [US7] Create embed settings page with 3 tabs (NPM code example, iframe + token CRUD, REST API example) in `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx`
- [x] T067 [US7] Add "임베드 연동" nav item to settings sidebar in `apps/web/components/sidebar.tsx`

**Checkpoint**: Embed docs visible, Guest Tokens creatable/listable/revocable

---

## Phase 13: Editor Enhancements (Word Count & Cursor Position)

**Goal**: 에디터 프리뷰 헤더에 Word count, 에디터 헤더에 커서 위치(줄, 열) 표시

**Independent Test**: 에디터에서 텍스트 입력 → Word count 실시간 갱신, 커서 이동 → 줄/열 표시 갱신

### Tests

- [x] T068 [P] Write unit test for word count calculation in `packages/editor/src/utils/__tests__/wordCount.test.ts`

### Implementation

- [x] T069 Add word count display to preview pane header in `packages/editor/src/preview/PreviewPane.tsx`
- [x] T070 Add cursor position (line, column) display to editor pane header in `packages/editor/src/MarkdownEditor.tsx`

**Checkpoint**: Word count and cursor position visible in editor headers

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: 전체 스토리 통합 검증 및 품질 개선

- [ ] T071 [P] Verify all toast integrations across US1-US11 (save, delete, invite, error feedback)
- [ ] T072 [P] Verify responsive layout for landing page at mobile breakpoints (768px)
- [ ] T073 Run full test suite and fix failures: `pnpm test`
- [ ] T074 Run quickstart.md validation: verify setup instructions work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (DB migrations must exist)
- **User Stories (Phase 3-12)**: All depend on Phase 2 (toast system required)
  - US1 Landing: Independent, frontend only
  - US2 Search: Independent, reuses existing API
  - US9 Doc Links: Independent, reuses existing API
  - US4 DAG: Independent, reuses existing components
  - US11 Versions: Independent, needs `diff` package
  - US6 Import/Export: Independent, reuses existing API
  - US3 Join Request: Needs `GET /workspaces/public` API (T043-T044)
  - US8 Members: Independent, reuses existing APIs
  - US5 CSS Theme: Needs DB migration (T001), theme API (T055-T058)
  - US7 Embed: Needs DB migration (T002), embed API (T063-T065)
- **Editor (Phase 13)**: Independent of app, packages/editor only
- **Polish (Phase 14)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (Landing)**: No dependencies on other stories
- **US2 (Search)**: No dependencies on other stories
- **US9 (Doc Links)**: No dependencies, but integrates with US4 DAG modal
- **US4 (DAG)**: No dependencies, links to US9 modal via "링크 편집" button
- **US11 (Versions)**: No dependencies
- **US6 (Import/Export)**: No dependencies
- **US3 (Join Request)**: Needs new API endpoint (self-contained in US3 phase)
- **US8 (Members)**: Reuses join-request API (US3 API exists already in backend)
- **US5 (CSS Theme)**: Needs new API endpoint + DB column (self-contained)
- **US7 (Embed)**: Needs new API endpoint + DB table (self-contained)
- **Editor**: No dependencies on any US

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- API routes before frontend pages (for stories needing new APIs)
- Core component before integration into existing pages
- Story complete before moving to next priority

### Parallel Opportunities

- All Phase 1 tasks (T001-T005) can run in parallel except T004 (depends on T001-T003)
- Phase 2 tasks T006 and T007 can run in parallel
- Once Phase 2 completes, US1/US2/US9/US4/US11/US6/US8/Editor can start in parallel
- US3/US5/US7 include self-contained API work, can also start in parallel
- Within each US: tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all landing components in parallel:
Task: "Create Hero component in apps/web/components/landing/hero.tsx"
Task: "Create FeaturesGrid component in apps/web/components/landing/features-grid.tsx"
Task: "Create PricingSection component in apps/web/components/landing/pricing-section.tsx"
Task: "Create Footer component in apps/web/components/landing/footer.tsx"
Task: "Create NavBar component in apps/web/components/landing/nav-bar.tsx"
Task: "Create landing layout in apps/web/app/(landing)/layout.tsx"

# Then assemble (depends on all above):
Task: "Assemble landing page in apps/web/app/(landing)/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (DB migrations)
2. Complete Phase 2: Foundational (Toast system)
3. Complete Phase 3: User Story 1 (Landing page)
4. **STOP and VALIDATE**: Test landing page independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 Landing → Test → Deploy (MVP!)
3. US2 Search + US10 Toast already done → Test → Deploy
4. US9 Links + US4 DAG → Test → Deploy (editor enhancement bundle)
5. US11 Versions + US6 Import/Export → Test → Deploy (document management bundle)
6. US3 Join + US8 Members → Test → Deploy (team management bundle)
7. US5 Theme + US7 Embed → Test → Deploy (customization bundle)
8. Editor Enhancements → Test → Deploy
9. Polish → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 Landing + US2 Search (frontend only)
   - Developer B: US5 Theme + US7 Embed (full-stack: DB + API + UI)
   - Developer C: US3 Join + US8 Members (API + UI)
   - Developer D: US4 DAG + US9 Links + US11 Versions (editor panel enhancements)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Toast store (Phase 2) is the only cross-cutting dependency — must complete first
