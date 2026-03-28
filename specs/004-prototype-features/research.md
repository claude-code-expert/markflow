# Research: Prototype-Based Feature Completion

**Date**: 2026-03-27 | **Branch**: `004-prototype-features`

## 1. 기존 API/컴포넌트 재활용 가능성

### Decision: 최대한 기존 구현을 재활용한다

**Rationale**: 코드베이스 분석 결과, 11개 User Story 중 상당수가 이미 백엔드 API를 보유하고 있다. 프론트엔드 UI만 추가/보강하면 되는 스토리가 다수이다.

| User Story | 기존 백엔드 | 기존 프론트엔드 | 필요한 작업 |
|------------|------------|---------------|-----------|
| US1 Landing | 없음 | 없음 | 프론트엔드 전용 (정적 페이지) |
| US2 Search | `GET /documents?q=` 존재 | 없음 | 검색 모달 UI 신규 |
| US3 Join Request | 4개 엔드포인트 완비 | 없음 | 프론트엔드 UI 신규 |
| US4 DAG Diagram | `GET /graph` 존재 | dag-pipeline-graph.tsx 존재 | 미니 DAG + 모달 래핑 |
| US5 CSS Theme | 없음 | 없음 | DB 스키마 + API + UI 신규 |
| US6 Import/Export | import/export API 완비 | 없음 | 모달 UI 신규 |
| US7 Embed | 없음 | 없음 | DB 스키마 + API + UI 신규 |
| US8 Member Mgmt | invitations/join-requests API 존재 | members/page.tsx 기본 | 탭 UI 보강 |
| US9 Doc Links Modal | `PUT /relations` 존재 | document-meta-panel.tsx 인라인 | 전용 모달 분리 |
| US10 Toast | 없음 | 없음 | 클라이언트 전용 |
| US11 Version History | `GET /versions` 존재 | version-history-panel.tsx 기본 | 모달 + diff UI 보강 |

**Alternatives Considered**:
- 전체 재구현 → 기존 코드 무시하고 새로 작성. 거부: 중복 작업, Constitution VII(YAGNI) 위반
- 기존 코드 수정 없이 새 코드만 추가 → 거부: 기존 컴포넌트와 중복 발생

## 2. 신규 DB 스키마 필요 항목

### Decision: 2개 테이블 추가, 1개 테이블 컬럼 추가

**Rationale**: 코드베이스 분석 결과:
- `join_requests` 테이블: **이미 존재** — 스키마 변경 불필요
- `embed_tokens` 테이블: **미존재** — 신규 생성 필요
- `workspaces.themeCss` 컬럼: **미존재** — 컬럼 추가 필요 (CSS 테마 저장)
- `workspaces.themePreset` 컬럼: **미존재** — 컬럼 추가 필요 (프리셋 이름)

**Alternatives Considered**:
- CSS 테마를 별도 테이블로 분리 → 거부: 워크스페이스당 1개만 필요, 컬럼으로 충분
- embed_tokens 없이 JWT 직접 발급 → 거부: 발급/폐기/목록 관리가 필요하므로 별도 테이블 필요

## 3. 신규 API 엔드포인트

### Decision: 4개 신규 엔드포인트 + 1개 수정

**Rationale**:

| 엔드포인트 | 용도 | US |
|-----------|------|-----|
| `GET /workspaces/public` | 공개 워크스페이스 검색 | US3 |
| `PATCH /workspaces/:id/theme` | CSS 테마 저장 | US5 |
| `GET /workspaces/:id/theme` | CSS 테마 조회 | US5 |
| `POST /workspaces/:id/embed-tokens` | Guest Token 발급 | US7 |
| `GET /workspaces/:id/embed-tokens` | Guest Token 목록 | US7 |
| `DELETE /workspaces/:id/embed-tokens/:tokenId` | Guest Token 폐기 | US7 |

**기존 수정**: `GET /workspaces/:wsId/documents/:docId/versions` — 버전 content 포함 여부 확인 필요 (이미 포함됨)

**Alternatives Considered**:
- 검색 전용 API 추가 → 거부: 기존 `GET /documents?q=` 파라미터로 충분
- 별도 theme 서비스 → 거부: workspace 서비스에 통합이 단순

## 4. 프론트엔드 상태 관리

### Decision: Zustand 토스트 스토어 1개 추가, 나머지는 React Query 캐시 활용

**Rationale**:
- 토스트는 전역 UI 상태이므로 Zustand 스토어가 적합
- 검색 결과, 테마, 토큰 목록 등은 서버 상태이므로 TanStack Query로 관리
- 기존 패턴(auth-store, workspace-store, editor-store, sidebar-store)을 따른다

**Alternatives Considered**:
- Context API로 토스트 관리 → 거부: 기존 프로젝트가 Zustand 패턴 사용
- 전역 이벤트 버스 → 거부: 과도한 추상화, Constitution VII(YAGNI) 위반

## 5. CSS 테마 보안

### Decision: Phase 1에서는 `--mf-*` CSS 변수만 허용, 전체 CSS는 Phase 2 이후

**Rationale**:
- 임의 CSS 허용 시 XSS 위험 (예: `background-image: url('javascript:...')`)
- 프로토타입에도 "Phase 1: CSS 변수 오버라이드만 허용" 경고가 명시됨
- 허용 변수 목록: `--mf-font-body`, `--mf-font-code`, `--mf-color-*`, `--mf-line-height`, `--mf-max-width`, `--mf-heading-font`
- 서버 사이드에서 CSS 파싱 후 허용 목록 외 속성 거부

**Alternatives Considered**:
- 클라이언트 사이드만 검증 → 거부: 우회 가능, Constitution III(Security by Default) 위반
- 전체 CSS 허용 + DOMPurify → 거부: Phase 1 범위 초과, 복잡도 증가

## 6. 버전 Diff 구현

### Decision: 클라이언트 사이드 텍스트 diff (라이브러리 활용)

**Rationale**:
- 설계 문서(005)에 "Myers algorithm" 명시 → `fast-diff` 또는 `diff` npm 패키지 활용
- 서버 사이드 diff API를 추가하지 않고, 클라이언트에서 두 버전 content를 비교
- 버전 API(`GET /versions`)가 이미 content를 포함하므로 추가 API 불필요

**Alternatives Considered**:
- 서버 사이드 diff API → 거부: 네트워크 왕복 추가, 클라이언트에서 충분
- 커스텀 diff 구현 → 거부: 검증된 라이브러리 존재, Constitution VII(YAGNI)

## 7. 랜딩 페이지 라우팅

### Decision: Next.js App Router의 Route Group `(landing)`을 사용

**Rationale**:
- 랜딩 페이지는 앱 레이아웃(사이드바, 헤더)이 없는 별도 레이아웃 필요
- `(landing)` 그룹으로 분리하면 URL에 영향 없이 독립 레이아웃 적용 가능
- 루트 `/` → 비로그인 시 랜딩, 로그인 시 워크스페이스 리다이렉트

**Alternatives Considered**:
- 별도 도메인/서브도메인 → 거부: Phase 1 범위 초과, 인프라 복잡도
- 기존 layout.tsx에 조건부 렌더링 → 거부: 코드 복잡도 증가, 관심사 분리 위반

## 8. Word Count / Cursor Position

### Decision: 에디터 패키지 내부에 표시, prop으로 활성화

**Rationale**:
- `EditorPane.tsx`에 CodeMirror의 `EditorState.doc.lines`와 `cursorPosition`에서 줄/열 정보 추출
- `PreviewPane.tsx`에 렌더링된 텍스트에서 단어 수 계산
- 기존 컴포넌트의 헤더 영역에 표시 (프로토타입의 `.editor-pane-header`, `.editor-pane-header` 패턴)
- 에디터 패키지 독립성 유지: 표시 여부를 prop으로 제어

**Alternatives Considered**:
- 앱 레벨에서 계산 → 거부: 에디터 내부 상태 접근 필요, 패키지 경계 위반
