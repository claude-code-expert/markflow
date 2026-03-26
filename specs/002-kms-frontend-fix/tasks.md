# Tasks: KMS 프론트엔드 버그 수정 및 UI 재정비

**Input**: Design documents from `/specs/002-kms-frontend-fix/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/frontend-api.md

**Tests**: 프로젝트 Constitution(IV. Test-First)에 따라 핵심 플로우에 대한 E2E 테스트를 포함한다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Design System Infrastructure)

**Purpose**: 프로토타입 디자인 토큰 정의, 폰트 로딩, API 응답 타입 정의 — 이후 모든 작업의 기반

- [x] T001 [P] Define API response wrapper types in `apps/web/lib/types.ts` — WorkspacesResponse, DocumentsResponse, CategoriesResponse, TagsResponse, MembersResponse, LoginResponse, UserResponse 등 contracts/frontend-api.md 기반 전체 타입 정의
- [x] T002 [P] Add prototype design tokens to `apps/web/app/globals.css` — CSS custom properties (--bg, --surface, --accent, --text, --border, --radius-*, --shadow-*, --sidebar-w, --header-h) + Tailwind v4 @theme inline 연동
- [x] T003 [P] Configure Google Fonts in `apps/web/app/layout.tsx` — next/font/google로 DM_Sans(--font-dm-sans), Sora(--font-sora), JetBrains_Mono(--font-jetbrains-mono) 로딩, CSS 변수로 html className 적용

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: /undefined 버그의 근본 원인 수정 + 앱 셸 레이아웃 구축 — 모든 User Story의 전제 조건

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Fix API response parsing in `apps/web/stores/workspace-store.ts` — `apiFetch<Workspace[]>` → `apiFetch<WorkspacesResponse>`, `response.workspaces` 추출. research.md 섹션 1 참조
- [x] T005 Audit and fix all apiFetch call sites across `apps/web/stores/` and `apps/web/app/` — auth-store.ts의 fetchUser(`{ user }` 래퍼), 문서/카테고리/태그 관련 모든 API 호출에서 응답 래퍼 패턴 정확히 적용. contracts/frontend-api.md의 모든 응답 형식과 대조
- [x] T006 Implement app shell grid layout in `apps/web/app/(app)/layout.tsx` — CSS Grid (grid-template-columns: var(--sidebar-w) 1fr, grid-template-rows: var(--header-h) 1fr), height: 100vh, overflow: hidden. 인증 가드 로직 유지하면서 레이아웃 구조 변경
- [x] T007 Create AppHeader component in `apps/web/components/app-header.tsx` — 프로토타입 .app-header 구현: 로고(MarkFlow), 브레드크럼(워크스페이스/현재 페이지), 저장 상태 표시(에디터), 검색 버튼(⌘K), 사용자 아바타(30px). height: var(--header-h), grid-column: 1/-1

**Checkpoint**: 앱 셸 레이아웃이 렌더링되고, 워크스페이스 목록 API가 정상 파싱됨. /undefined 버그 해소 확인.

---

## Phase 3: User Story 1 — 로그인 후 워크스페이스 정상 진입 (Priority: P1) MVP

**Goal**: 사용자가 로그인하면 워크스페이스 목록을 보고, 선택하면 문서 목록으로 이동한다. /undefined가 발생하지 않는다.

**Independent Test**: 로그인 → 워크스페이스 목록 표시 → 워크스페이스 클릭 → /{slug} 진입 확인

### Implementation for User Story 1

- [x] T008 [P] [US1] Redesign login page in `apps/web/app/(auth)/login/page.tsx` — 프로토타입 .auth-card 디자인 적용: warm cream 배경(--bg), 440px max-width 카드, 로고(32px), 탭(Login/Register), 폼 필드(--radius-sm border, --accent focus), 소셜 로그인 버튼(Google/GitHub placeholder), 계정 잠금 카운트다운 유지
- [x] T009 [P] [US1] Redesign register page in `apps/web/app/(auth)/register/page.tsx` — login과 동일한 .auth-card 디자인, 이름/이메일/비밀번호/비밀번호 확인 필드, 비밀번호 유효성 검증(8자+영문+숫자+특수), 성공 시 /login 리다이렉트
- [x] T010 [P] [US1] Redesign auth layout in `apps/web/app/(auth)/layout.tsx` — 프로토타입 .auth-screen: centered, 100vh, --bg 배경. 로고 + "팀 지식 관리 플랫폼" 부제 스타일 적용
- [x] T010-1 [P] [US1] Redesign verify-email page in `apps/web/app/(auth)/verify-email/page.tsx` — 프로토타입 .auth-card 디자인 적용: 이메일 인증 아이콘(48px), 상태 메시지, 재전송 버튼, 정보 박스(--teal-lt 배경). FR-007 인증 화면 디자인 일치
- [x] T011 [US1] Fix workspace list page in `apps/web/app/(app)/page.tsx` — T004 수정 기반으로 워크스페이스 목록 정상 렌더링. 프로토타입 .ws-list 디자인 적용: 680px max-width, 각 항목에 아이콘(40px) + 이름 + 메타데이터 + 역할 배지(Admin/Owner). workspaces.map에서 ws.slug 안전 접근 보장
- [x] T012 [US1] Implement auto-redirect for single workspace in `apps/web/app/(app)/page.tsx` — fetchWorkspaces 결과가 정확히 1개일 때 router.replace(`/${ws.slug}`) 자동 이동. 0개일 때 빈 상태 UI 표시
- [x] T013 [US1] Fix workspace home redirect in `apps/web/app/(app)/[workspaceSlug]/page.tsx` — 서버 컴포넌트 → 클라이언트 컴포넌트 전환, workspaceSlug로 워크스페이스 로드 후 /{workspaceSlug}/docs로 리다이렉트. slug가 유효하지 않으면 워크스페이스 목록으로 리다이렉트

### E2E Test for User Story 1

- [x] T014 [US1] Write E2E test in `apps/web/tests/e2e/auth-workspace-flow.spec.ts` — 시나리오: 로그인 → 워크스페이스 목록 표시 → 클릭 → /{slug}/docs 진입 확인. /undefined URL 미발생 어서션. 단일 워크스페이스 자동 리다이렉트 확인

**Checkpoint**: 로그인 → 워크스페이스 선택 → 문서 목록 진입 플로우가 /undefined 없이 정상 동작

---

## Phase 4: User Story 2 — 프로토타입 디자인 시스템 적용 (Priority: P1)

**Goal**: 앱 셸(헤더+사이드바+콘텐츠)이 프로토타입 디자인과 일치하는 시각적 품질을 가진다.

**Independent Test**: 앱 셸 진입 후 헤더(56px) + 사이드바(260px, 워크스페이스 셀렉터/검색/폴더 트리/네비게이션) + 콘텐츠 영역 레이아웃 확인

### Implementation for User Story 2

- [x] T015 [US2] Redesign sidebar workspace selector in `apps/web/components/sidebar.tsx` — 프로토타입 .sidebar-ws 구현: 현재 워크스페이스 이름 + 아이콘 + 드롭다운 화살표, 클릭 시 워크스페이스 목록(/)으로 이동 또는 셀렉터 드롭다운 표시
- [x] T016 [US2] Add sidebar search bar in `apps/web/components/sidebar.tsx` — 프로토타입 .sidebar-search: 검색 인풋(placeholder: "문서 검색..."), ⌘K 힌트 배지, --surface-2 배경, --radius-sm 모서리
- [x] T017 [US2] Integrate folder tree in sidebar `apps/web/components/sidebar.tsx` — 프로토타입 .sidebar-section: "문서" 섹션 헤더 + category-tree.tsx 통합, .sidebar-item 스타일(13.5px, --text-2, active시 --accent-2 배경), .sidebar-indent(28px), .item-icon(18px, opacity 0.65), .item-count 배지
- [x] T018 [US2] Add navigation items in `apps/web/components/sidebar.tsx` — 하단 네비게이션 섹션: 문서(docs), 휴지통(trash), 멤버(settings/members), 그래프(graph), 설정(settings) 각각 아이콘 + 라벨 + href. 현재 경로에 따른 active 상태
- [x] T019 [US2] Add sidebar user profile footer in `apps/web/components/sidebar.tsx` — 프로토타입 .sidebar-footer: 사용자 아바타(28px) + 이름 + 역할 표시, 로그아웃 버튼. auth-store의 user 데이터 사용
- [x] T020 [US2] Style category-tree component in `apps/web/components/category-tree.tsx` — 프로토타입 폴더 아이콘(📁/📂 또는 SVG), 들여쓰기(depth * 14px), 접기/펴기 화살표, 우클릭 컨텍스트 메뉴 트리거 유지

### E2E Test for User Story 2

- [x] T020-1 [US2] Write visual regression E2E test in `apps/web/tests/e2e/design-system.spec.ts` — 시나리오: 앱 셸 진입 → 헤더 높이(56px) 확인 → 사이드바 폭(260px) 확인 → 사이드바 구성요소(워크스페이스 셀렉터, 검색 바, 폴더 트리, 네비게이션 5개 항목) 존재 확인 → 배경색/폰트 CSS 변수 적용 확인

**Checkpoint**: 앱 셸이 프로토타입의 색상/폰트/레이아웃과 시각적으로 일치. 사이드바에 워크스페이스 셀렉터, 검색, 폴더 트리, 네비게이션 표시

---

## Phase 5: User Story 3 — 문서 CRUD 정상 동작 (Priority: P1)

**Goal**: 새 문서 생성, 에디터 진입, 마크다운 편집, 자동 저장, 삭제→휴지통 플로우가 정상 동작한다.

**Independent Test**: 문서 생성 → 에디터 진입 → 내용 입력 → 1초 후 자동 저장 → 새로고침 후 내용 유지 확인

### Implementation for User Story 3

- [x] T021 [US3] Fix document list page in `apps/web/app/(app)/[workspaceSlug]/docs/page.tsx` — API 응답 래퍼 수정(DocumentsResponse), 프로토타입 문서 목록 디자인 적용: 리스트/그리드 뷰 토글, 검색/정렬/카테고리 필터, 페이지네이션. 각 문서 항목에 제목/카테고리/수정일/작성자 표시
- [x] T022 [US3] Fix new document modal in `apps/web/components/new-doc-modal.tsx` — 프로토타입 모달 디자인(--radius-xl, --shadow-xl, 560px max-width), 제목 입력 + 카테고리 선택(옵션), 생성 후 `/${workspaceSlug}/docs/${document.id}` 에디터로 이동. API 응답 `{ document: {...} }` 래퍼 처리
- [x] T023 [US3] Implement editor page in `apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx` — 문서 로딩(GET /documents/:id → `{ document }` 래퍼), @markflow/editor 통합, editor-store 연동(setDocument → content 변경 감지), 프로토타입 에디터 레이아웃(toolbar + split pane or preview)
- [x] T024 [US3] Implement auto-save in `apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx` — content 변경 시 1초 디바운스 후 PATCH /documents/:id, saveStatus 상태 관리(unsaved→saving→saved/error), 헤더에 저장 상태 표시("저장됨"/"저장 중..."/"저장 실패"), useRef로 debounce timer 관리
- [x] T025 [US3] Fix trash page in `apps/web/app/(app)/[workspaceSlug]/trash/page.tsx` — 삭제된 문서 목록 표시(GET /trash → documents), 복원 버튼(POST /trash/:id/restore), 프로토타입 디자인 적용

### E2E Test for User Story 3

- [x] T026 [US3] Write E2E test in `apps/web/tests/e2e/document-crud-flow.spec.ts` — 시나리오: 새 문서 생성 → 에디터 진입 → 마크다운 입력 → 자동 저장 확인 → 새로고침 후 내용 유지 → 문서 삭제 → 휴지통 확인

**Checkpoint**: 문서 생성 → 편집 → 자동 저장 → 새로고침 복원 → 삭제 → 휴지통 복원 전체 플로우 동작

---

## Phase 6: User Story 4 — 워크스페이스 관리 정상 동작 (Priority: P2)

**Goal**: 새 워크스페이스 생성, 설정 변경, 멤버 초대가 정상 작동한다.

**Independent Test**: 워크스페이스 생성 → 설정 변경 → 멤버 이메일 초대 → 초대 확인

### Implementation for User Story 4

- [x] T027 [P] [US4] Fix create workspace modal in `apps/web/components/create-workspace-modal.tsx` — 프로토타입 모달 디자인 적용, API 응답 `{ workspace: {...} }` 래퍼 처리 확인, slug 자동 생성 + 중복 검사 유지, 생성 후 `/${workspace.slug}` 이동
- [x] T028 [P] [US4] Fix workspace settings page in `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx` — 워크스페이스 정보 로딩(GET /workspaces/:id), 이름 변경 + 공개/비공개 토글, PATCH /workspaces/:id 저장, owner 권한 체크(usePermissions). 프로토타입 설정 페이지 디자인
- [x] T029 [US4] Fix members management page in `apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx` — 멤버 목록 표시(GET /workspaces/:id/members → `{ members }` 래퍼), 역할 배지, 이메일 초대 폼(POST /invitations), 역할 변경(PATCH /members/:userId), 멤버 제거(DELETE /members/:userId). admin+ 권한 체크

### E2E Test for User Story 4

- [x] T029-1 [US4] Write E2E test in `apps/web/tests/e2e/workspace-management.spec.ts` — 시나리오: 워크스페이스 생성 모달 → 이름/slug 입력 → 생성 확인 → 설정 페이지 진입 → 이름 변경 저장 → 멤버 페이지 → 이메일 초대 생성 확인

**Checkpoint**: 워크스페이스 생성 → 설정 변경 → 멤버 초대 플로우 동작

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge case 처리, 상태 컴포넌트 개선, 전체 일관성 확보

- [x] T030 [P] Implement empty state component in `apps/web/components/states/empty.tsx` — 워크스페이스 0개: "첫 워크스페이스를 만들어보세요" + CTA 버튼, 문서 0개: "새 문서를 작성해보세요" + CTA 버튼. 프로토타입 스타일
- [x] T031 [P] Implement error state component in `apps/web/components/states/error.tsx` — API 에러 시 에러 메시지 + 재시도 버튼, 404 (존재하지 않는 workspaceSlug) → 워크스페이스 목록 리다이렉트 또는 404 UI
- [x] T032 [P] Implement loading skeleton in `apps/web/components/states/loading.tsx` — 워크스페이스 목록, 문서 목록, 에디터 각각에 적합한 스켈레톤 UI. 프로토타입 색상(--surface-2, --surface-3)
- [x] T033 Implement sidebar collapse/expand in `apps/web/components/sidebar.tsx` + `apps/web/stores/sidebar-store.ts` — 토글 버튼으로 사이드바 접기(0px)/펴기(260px), CSS transition, isSidebarOpen 상태 유지. 앱 셸 grid-template-columns 동적 변경
- [x] T034 Cross-page design consistency audit — 모든 페이지에서 프로토타입 디자인 토큰(폰트, 색상, 간격, 모서리) 일관성 확인. 누락된 스타일 보정

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001, T002, T003 모두 병렬 가능
- **Foundational (Phase 2)**: Phase 1 완료 필요 — T004/T005는 T001(타입) 의존, T006/T007은 T002(디자인 토큰)+T003(폰트) 의존
- **User Stories (Phase 3-6)**: Phase 2 완료 필요 (앱 셸 + API 파싱 수정)
- **Polish (Phase 7)**: Phase 3-5(P1 스토리) 완료 후 진행 권장

### User Story Dependencies

- **US1 (P1, Phase 3)**: Phase 2 완료 후 즉시 시작 가능. 다른 스토리에 의존 없음
- **US2 (P1, Phase 4)**: Phase 2 완료 후 시작 가능. US1과 병렬 가능하나, US1의 워크스페이스 진입이 동작해야 사이드바 테스트 가능하므로 US1 이후 권장
- **US3 (P1, Phase 5)**: US1(워크스페이스 진입) + US2(사이드바 네비게이션) 완료 후 시작 권장. 문서 페이지 접근에 워크스페이스 진입이 필요
- **US4 (P2, Phase 6)**: US1 완료 후 시작 가능. US2/US3과 독립적

### Within Each User Story

- 병렬([P]) 태스크 → 순차 태스크 → E2E 테스트 순서
- 모달/컴포넌트 태스크는 병렬 가능
- 페이지 태스크는 컴포넌트 완료 후 진행

### Parallel Opportunities

**Phase 1** (3 tasks 동시):
```
T001 (types) ║ T002 (design tokens) ║ T003 (fonts)
```

**Phase 2** (T004/T005 먼저, T006/T007 병렬):
```
T004 (workspace-store fix) → T005 (audit all stores)
T006 (app shell layout) ║ T007 (app header)
```

**Phase 3 US1** (T008/T009/T010 병렬, T011/T012/T013 순차):
```
T008 (login) ║ T009 (register) ║ T010 (auth layout) ║ T010-1 (verify-email)
→ T011 (workspace list) → T012 (auto-redirect) → T013 (workspace home)
→ T014 (E2E test)
```

**Phase 4 US2** (T015-T019 순차 — 동일 파일 sidebar.tsx, T020 독립):
```
T015 (ws selector) → T016 (search bar) → T017 (folder tree) → T018 (nav items) → T019 (user footer)
T020 (category-tree style)  # sidebar.tsx 완료 후 또는 병렬
→ T020-1 (E2E test)
```

**Phase 5 US3** (T021 먼저, 나머지 순차):
```
T021 (doc list) → T022 (new doc modal) → T023 (editor) → T024 (auto-save)
→ T025 (trash) → T026 (E2E test)
```

---

## Parallel Example: User Story 1

```text
# Phase 3 시작 시 병렬 실행 가능:
Task T008: "Redesign login page in apps/web/app/(auth)/login/page.tsx"
Task T009: "Redesign register page in apps/web/app/(auth)/register/page.tsx"
Task T010: "Redesign auth layout in apps/web/app/(auth)/layout.tsx"
Task T010-1: "Redesign verify-email page in apps/web/app/(auth)/verify-email/page.tsx"

# 위 3개 완료 후 순차:
Task T011: "Fix workspace list page in apps/web/app/(app)/page.tsx"
Task T012: "Implement auto-redirect in apps/web/app/(app)/page.tsx"
Task T013: "Fix workspace home redirect in apps/web/app/(app)/[workspaceSlug]/page.tsx"
```

## Parallel Example: User Story 2

```text
# Phase 4 — sidebar.tsx 순차 실행 (동일 파일):
Task T015: "Redesign sidebar workspace selector in apps/web/components/sidebar.tsx"
Task T016: "Add sidebar search bar in apps/web/components/sidebar.tsx"
Task T017: "Integrate folder tree in sidebar"
Task T018: "Add navigation items in sidebar"
Task T019: "Add sidebar user profile footer"

# category-tree.tsx는 별도 파일 — sidebar 작업과 병렬 가능:
Task T020: "Style category-tree component in apps/web/components/category-tree.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) — 디자인 토큰 + 폰트 + 타입
2. Complete Phase 2: Foundational (T004-T007) — 버그 수정 + 앱 셸
3. Complete Phase 3: US1 (T008-T014) — 로그인 → 워크스페이스 진입
4. **STOP and VALIDATE**: /undefined 버그 해소, 로그인 플로우 정상 동작 확인
5. 이 시점에서 앱이 "사용 가능한" 최소 상태

### Incremental Delivery

1. Setup + Foundational → 앱 셸 렌더링, API 정상 파싱
2. + US1 → 로그인 → 워크스페이스 진입 **(MVP!)**
3. + US2 → 프로토타입 디자인 적용, 사이드바 완성
4. + US3 → 문서 CRUD 전체 동작
5. + US4 → 워크스페이스 관리
6. + Polish → Edge case, 로딩/에러 상태, 사이드바 접기

### Suggested MVP Scope

**Phase 1 + Phase 2 + Phase 3 (US1)**: 총 14 tasks
- /undefined 버그 해결
- 프로토타입 디자인 기반 로그인/회원가입
- 워크스페이스 목록 정상 표시
- 앱 셸 레이아웃 구축

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- 모든 API 응답은 래퍼 패턴 (`{ workspaces: [...] }`, `{ document: {...} }`) — contracts/frontend-api.md 참조
- 프로토타입 디자인 참조: `docs/markflow-prototype.html`
- 에디터 패키지의 `.mf-` CSS 접두사 규칙은 @markflow/editor 내부에만 해당, apps/web CSS에는 적용하지 않음
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
