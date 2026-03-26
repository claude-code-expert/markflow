# Feature Specification: KMS 프론트엔드 버그 수정 및 UI 재정비

**Feature Branch**: `002-kms-frontend-fix`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "로그인 후 /undefined 리다이렉트 버그, 기능 미동작, 프로토타입(markflow-prototype.html) 디자인과 불일치 수정"

## Clarifications

### Session 2026-03-27

- Q: 프로토타입의 모든 화면을 이번에 구현하는가? → A: 핵심 플로우(로그인→워크스페이스→문서 편집)가 정상 동작하는 것을 우선. 디자인은 프로토타입의 색상/폰트/레이아웃을 적용
- Q: 랜딩 페이지(screen-landing)를 포함하는가? → A: 이번 범위에서 제외. 인증+앱 셸+문서 기능에 집중

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 로그인 후 워크스페이스 정상 진입 (Priority: P1)

사용자가 로그인하면 자신의 워크스페이스 목록을 보고, 선택하면 해당 워크스페이스의 문서 목록으로 이동한다. /undefined 리다이렉트가 발생하지 않는다.

**Why this priority**: 현재 로그인 후 앱이 완전히 작동하지 않는 치명적 버그. 이것이 해결되어야 모든 기능 테스트 가능.

**Independent Test**: 로그인 → 워크스페이스 목록 표시 → 워크스페이스 클릭 → 문서 목록 진입까지 단독 검증 가능

**Acceptance Scenarios**:

1. **Given** 계정이 있는 사용자, **When** 로그인 성공, **Then** 워크스페이스 목록 페이지에 자신의 워크스페이스가 표시된다
2. **Given** 워크스페이스 목록, **When** 워크스페이스를 클릭, **Then** /{workspaceSlug}/docs 경로로 이동하며 문서 목록이 표시된다 (/{workspaceSlug} 진입 시 /docs로 자동 리다이렉트)
3. **Given** 워크스페이스가 1개뿐인 사용자, **When** 로그인 성공, **Then** 해당 워크스페이스로 자동 리다이렉트된다
4. **Given** 워크스페이스가 0개인 신규 사용자, **When** 로그인 성공, **Then** 빈 상태 UI에 "첫 워크스페이스를 만들어보세요" 안내와 생성 CTA 버튼이 표시된다
5. **Given** 앱 내 어떤 페이지에서든, **When** URL에 /undefined가 포함되는 상황, **Then** 발생하지 않아야 한다

---

### User Story 2 - 프로토타입 디자인 시스템 적용 (Priority: P1)

앱 전체가 프로토타입(markflow-prototype.html)의 디자인 시스템(색상, 폰트, 레이아웃)과 일치하는 시각적 품질을 가진다.

**Why this priority**: 현재 CSS가 깨져있어 사용자가 인터페이스를 인식할 수 없음. 기능과 동시에 해결 필수.

**Independent Test**: 각 화면(로그인, 워크스페이스 목록, 문서 목록, 에디터)의 스크린샷을 프로토타입과 비교하여 검증 가능

**Acceptance Scenarios**:

1. **Given** 로그인 페이지, **When** 접속, **Then** warm cream 배경(#F8F7F4), DM Sans 폰트, 파란 액센트(#1A56DB) 버튼이 표시된다
2. **Given** 앱 셸, **When** 로그인 후 진입, **Then** 상단 헤더(정확히 56px) + 좌측 사이드바(정확히 260px) + 메인 콘텐츠(나머지 영역) 레이아웃이 CSS Grid로 구현되며 프로토타입 치수와 정확히 일치한다
3. **Given** 사이드바, **When** 워크스페이스 내 이동, **Then** 워크스페이스 셀렉터, 검색 바(⌘K 힌트), 폴더 트리, 네비게이션(문서/휴지통/멤버/그래프/설정)이 표시된다
4. **Given** 모든 텍스트 콘텐츠, **When** 화면 렌더링, **Then** 본문 DM Sans, 헤더 Sora, 코드 JetBrains Mono 폰트가 적용된다

---

### User Story 3 - 문서 CRUD 정상 동작 (Priority: P1)

워크스페이스 내에서 새 문서를 생성하고, 편집하고, 자동 저장이 작동한다.

**Why this priority**: KMS의 핵심 기능. 문서 작성이 안 되면 제품으로서 가치가 없음.

**Independent Test**: 문서 생성 → 에디터 진입 → 내용 입력 → 자동 저장 → 새로고침 후 내용 유지까지 단독 검증 가능

**Acceptance Scenarios**:

1. **Given** 워크스페이스 내 문서 목록, **When** "새 문서" 버튼 클릭, **Then** 문서 생성 모달이 표시된다
2. **Given** 문서 생성 모달, **When** 제목 입력 후 생성, **Then** 에디터 페이지로 이동한다
3. **Given** 에디터 페이지, **When** 마크다운 입력 후 1초 경과, **Then** 자동 저장되고 앱 헤더 우측에 저장 상태가 표시된다 — "저장 중..."(saving, 회색 텍스트) → "저장됨"(saved, --green 텍스트+체크 아이콘) / "저장 실패"(error, --red 텍스트)
4. **Given** 자동 저장된 문서, **When** 페이지 새로고침, **Then** 이전에 입력한 내용이 그대로 표시된다
5. **Given** 문서 목록, **When** 문서 삭제, **Then** 휴지통으로 이동하며 복원 가능하다

---

### User Story 4 - 워크스페이스 관리 정상 동작 (Priority: P2)

새 워크스페이스 생성, 멤버 초대, 설정 변경이 정상 작동한다.

**Why this priority**: 팀 협업 기능은 문서 CRUD 다음 우선순위.

**Independent Test**: 워크스페이스 생성 → 설정 변경 → 멤버 초대까지 단독 검증 가능

**Acceptance Scenarios**:

1. **Given** 워크스페이스 목록, **When** "워크스페이스 만들기" 클릭, **Then** 생성 모달이 표시되고 이름/slug 입력 후 생성 가능. 생성 후 /{newSlug}/docs로 이동
2. **Given** 워크스페이스 설정 페이지, **When** 이름 변경/공개 상태 전환, **Then** 저장 후 반영된다
3. **Given** 멤버 관리 페이지, **When** 이메일 초대, **Then** 초대가 생성된다

---

### Edge Cases

- 워크스페이스가 0개인 신규 사용자 → 빈 상태 UI + "워크스페이스 만들기" 안내 표시
- API 서버 미응답 시 → 에러 상태 UI 표시, 재시도 버튼
- 존재하지 않는 workspaceSlug 접근 시 → 404 페이지 또는 워크스페이스 목록으로 리다이렉트
- 브라우저 새로고침 시 인증 상태 유지 → refreshToken으로 세션 복원
- 사이드바 접기/펴기 상태가 페이지 이동 시 유지
- 긴 문서 제목(300자), 긴 워크스페이스 이름(100자) → UI에서 text-overflow: ellipsis로 truncation. 툴팁으로 전체 텍스트 표시
- 한글 워크스페이스 이름의 slug 자동 생성 → 한글 제거 후 영문/숫자/하이픈만 유지. 결과가 빈 문자열이면 랜덤 slug 생성 (기존 create-workspace-modal.tsx 로직 유지)
- 대량 문서 목록 → 페이지당 20개, 서버 사이드 페이지네이션. 페이지 번호 UI(이전/다음/번호) 표시. 1000+ 문서 시 성능 최적화는 Phase 2로 연기
- 에디터에서 미저장 콘텐츠가 있는 상태에서 다른 페이지/워크스페이스로 이동 시 → 브라우저 beforeunload 경고 표시. 사이드바 네비게이션 클릭 시에는 "저장하지 않은 변경사항이 있습니다" 확인 다이얼로그
- 에디터에서 자동 저장 중 토큰 만료 시 → refreshToken으로 자동 갱신 후 저장 재시도. 갱신 실패 시 saveStatus를 'error'로 표시하고 "다시 로그인 필요" 안내. 미저장 콘텐츠는 editor-store에 유지하여 재로그인 후 복원 가능

## Requirements *(mandatory)*

### Functional Requirements

**버그 수정**

- **FR-001**: 워크스페이스 목록 API 응답을 올바르게 파싱하여 워크스페이스가 화면에 표시되어야 한다
- **FR-002**: 앱 내 모든 라우팅(Link href, router.push, router.replace, 사이드바 네비게이션)에서 slug가 undefined일 때 /undefined URL로 이동하지 않아야 한다. slug가 falsy이면 워크스페이스 목록(/)으로 fallback
- **FR-003**: 워크스페이스가 1개뿐인 사용자는 로그인 후 해당 워크스페이스로 자동 리다이렉트되어야 한다

**디자인 시스템**

- **FR-004**: 전체 앱에 프로토타입 디자인 토큰(배경: #F8F7F4, 액센트: #1A56DB, 폰트: DM Sans/Sora/JetBrains Mono)이 적용되어야 한다
- **FR-005**: 앱 셸 레이아웃이 상단 헤더(56px) + 좌측 사이드바(260px, 접기 가능) + 메인 콘텐츠로 구성되어야 한다
- **FR-006**: 사이드바에 워크스페이스 셀렉터, 검색 바, 폴더 트리, 네비게이션(문서/휴지통/멤버/그래프/설정)이 표시되어야 한다
- **FR-007**: 로그인/회원가입/이메일 인증 페이지가 프로토타입의 인증 화면 디자인과 일치해야 한다 (auth-card 패턴: 440px max-width, --bg 배경, 로고+부제)

**기능 동작 보장**

- **FR-008**: 문서 생성 모달에서 제목 입력 후 문서가 정상 생성되고 에디터로 이동해야 한다
- **FR-009**: 에디터 페이지에서 @markflow/editor 통합(split pane: 좌측 CodeMirror 편집, 우측 마크다운 프리뷰) + 1초 디바운스 자동 저장이 정상 동작해야 한다. 저장 실패 시 saveStatus를 'error'로 표시하고 5초 후 자동 재시도(최대 3회)
- **FR-010**: 문서 목록에서 검색, 정렬, 카테고리 필터가 정상 동작해야 한다
- **FR-011**: 워크스페이스 생성 모달에서 이름/slug 입력 후 워크스페이스가 정상 생성되어야 한다
- **FR-012**: 모든 모달은 프로토타입 공통 패턴을 따라야 한다 — max-width 560px(기본)/800px(lg), border-radius: var(--radius-xl), box-shadow: var(--shadow-xl), backdrop blur(2px), ESC 키로 닫기, overlay 클릭으로 닫기
- **FR-013**: 사이드바 검색 바는 문서 제목 기준 필터링(클라이언트 사이드)으로 동작한다. ⌘K(Mac)/Ctrl+K(Windows) 단축키로 포커스 이동. Phase 1에서 전문 검색(내용 포함)은 제외
- **FR-014**: 문서 삭제 시 확인 다이얼로그 없이 즉시 휴지통으로 이동하며, 하단 토스트로 "휴지통으로 이동됨" + "실행 취소" 버튼을 5초간 표시한다

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 로그인 후 5초 이내에 워크스페이스 또는 문서 목록 화면이 표시된다 (측정 환경: 로컬 개발 서버, API 응답 지연 500ms 이하 기준)
- **SC-002**: 앱 내 모든 네비게이션에서 /undefined URL이 0회 발생한다
- **SC-003**: 프로토타입 디자인 토큰이 정확히 적용된다 — (a) CSS 변수 23개(--bg, --surface, --accent 등)가 globals.css에 정의되고 사용됨, (b) 폰트 3종(DM Sans/Sora/JetBrains Mono)이 올바른 요소에 적용됨, (c) 레이아웃 치수(헤더 56px, 사이드바 260px)가 프로토타입과 일치함, (d) Playwright visual regression snapshot으로 주요 4개 화면(로그인, 워크스페이스 목록, 문서 목록, 에디터) 검증
- **SC-004**: 문서 생성부터 자동 저장 확인까지 30초 이내에 완료할 수 있다
- **SC-005**: 모든 핵심 플로우(로그인→워크스페이스→문서 CRUD)가 에러 없이 동작한다
- **SC-006**: 모든 인터랙티브 요소(버튼, 링크, 입력 필드, 모달)에 키보드 접근이 가능하고 포커스 표시가 보인다. 모든 img/아이콘에 alt 텍스트 또는 aria-label이 존재한다 (Phase 1 최소 접근성 기준)

## Assumptions

- Phase 1 KMS 백엔드 API(apps/api)는 정상 동작하며 변경하지 않는다. API 응답 형식은 research.md 섹션 7 및 contracts/frontend-api.md에서 실제 소스코드 기반으로 검증 완료
- 프론트엔드(apps/web) 코드만 수정한다
- 프로토타입 HTML(docs/markflow-prototype.html)의 디자인이 최종 디자인 기준이다
- 랜딩 페이지(screen-landing)는 이번 범위에서 제외한다
- CSS 테마 에디터, embed 기능은 이번 범위에서 제외한다
- 그래프 페이지(/{workspaceSlug}/graph)는 사이드바 네비게이션 링크만 표시하고, 페이지 내용 구현은 이번 범위에서 제외한다 (placeholder "준비 중" UI)
- 반응형 레이아웃(모바일/태블릿)은 이번 범위에서 제외한다. 데스크톱(1280px+) 환경만 대상으로 한다
- 동시 편집(같은 문서를 여러 탭/사용자가 동시에 편집)은 Phase 1에서 제외한다. 마지막 저장이 우선(last-write-wins)
- 기존 프론트엔드 파일을 수정하는 것이 기본이며, 앱 셸 구성에 필요한 신규 컴포넌트(app-header.tsx) 및 공유 타입 파일(lib/types.ts)은 신규 생성을 허용한다
- 프론트엔드 로깅: Phase 1에서 console.warn/console.error는 API 에러 처리에 한해 허용한다. 전용 logger 유틸 도입은 Phase 2로 연기. Constitution VII의 "console.log 금지"는 디버그 로그에 적용되며, 에러 로깅은 예외로 한다
