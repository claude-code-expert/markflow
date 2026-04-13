# Roadmap: MarkFlow KMS Phase 2 MVP

## Overview

Phase 1에서 구축된 KMS 인프라(73 엔드포인트, 15 테이블, 20 페이지) 위에 보안 보강, 테스트 커버리지, read-only API 노출, 검색/diff, 퍼블릭 공유를 순차적으로 완성한다. 대부분의 작업은 새 기능 발명이 아니라 기존 인프라를 안전하게 노출시키고 검증하는 것이다. 5개 페이즈를 통해 베타 10팀 온보딩에 필요한 Phase 2 MVP를 완성한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security & Auth Hardening** - R2 Worker 보안, 서비스 레이어 N+1/풀스캔 수정, 비밀번호 변경 API, SVG 보안 문서화
- [ ] **Phase 2: Test Coverage** - 댓글 CRUD 통합 테스트, 이미지 업로드 테스트로 Phase 1 변경 검증
- [ ] **Phase 3: Category & Document Context API** - 카테고리 ancestors/descendants, 문서 DAG 컨텍스트 read-only API 노출
- [ ] **Phase 4: Search & Version Diff** - pg_trgm GIN 인덱스 검색, 관련성 랭킹/스니펫, 서버사이드 버전 diff API
- [ ] **Phase 5: Public Services** - 퍼블릭 embed 렌더링, OG Link Preview 프록시, publicRoutes 플러그인

## Phase Details

### Phase 1: Security & Auth Hardening
**Goal**: 외부 공격 표면을 차단하고 인증/인가 기반을 완성하여, 이후 모든 기능이 안전한 인프라 위에서 동작한다
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. R2 Worker에 ALLOWED_ORIGINS에 없는 origin에서 업로드 요청 시 CORS 에러가 반환된다
  2. R2 Worker에 API_SECRET 설정 시 Bearer 토큰 없는 업로드가 403으로 거부된다
  3. 로그인한 사용자가 현재 비밀번호 확인 후 새 비밀번호로 변경할 수 있다
  4. graph-service가 워크스페이스 소속 문서의 relation만 조회하고, relation-service가 JOIN 기반 배치 쿼리를 사용한다
  5. SECURITY.md에 Avatar(SVG 거부)/Editor(SVG 허용) 분리 근거와 렌더링 규칙이 명시되어 있다
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md -- R2 Worker CORS strict + Bearer auth + upload-token API
- [x] 01-02-PLAN.md -- graph/relation 서비스 쿼리 최적화 + SVG 보안 문서화
- [x] 01-03-PLAN.md -- 비밀번호 변경 API (백엔드: changePassword + PUT /me/password)
- [x] 01-04-PLAN.md -- 비밀번호 변경 UI (프론트엔드: PasswordChangeModal + 설정 페이지)

### Phase 2: Test Coverage
**Goal**: Phase 1 보안 변경과 기존 핵심 기능(댓글, 이미지 업로드)이 통합 테스트로 검증되어, 이후 기능 추가 시 회귀를 방지한다
**Depends on**: Phase 1
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. 댓글 통합 테스트가 생성/조회/수정/삭제/해결/권한/스레딩 7개 시나리오를 검증하고 모두 통과한다
  2. 이미지 업로드 테스트가 타입 검증/크기 제한/CORS/성공 업로드/에러 처리 5개 시나리오를 검증하고 모두 통과한다
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- 댓글 CRUD 통합 테스트 (factory 확장 + 7개 시나리오)
- [x] 02-02-PLAN.md -- 이미지 업로드 클라이언트 검증 테스트 (editor vitest 설정 + 5개 시나리오)

### Phase 3: Category & Document Context API
**Goal**: 카테고리 계층 탐색과 문서 관계 컨텍스트를 단일 API 호출로 제공하여, 프론트엔드가 breadcrumb과 관계 그래프를 효율적으로 렌더링할 수 있다
**Depends on**: Phase 1
**Requirements**: CAT-01, CAT-02, DOC-01, DOC-02
**Success Criteria** (what must be TRUE):
  1. 특정 카테고리 ID로 ancestors API 호출 시 루트까지의 모든 조상이 순서대로 반환된다
  2. 특정 카테고리 ID로 descendants API 호출 시 모든 하위 카테고리가 트리 구조로 반환된다
  3. 단일 문서 ID로 DAG context API 호출 시 incoming/outgoing 관계와 관련 문서의 제목, 카테고리가 포함된 응답을 받는다
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md -- 카테고리 ancestors/descendants 서비스 + 라우트 + 통합 테스트
- [ ] 03-02-PLAN.md -- 문서 DAG context 서비스 + 라우트 + 통합 테스트

### Phase 4: Search & Version Diff
**Goal**: 워크스페이스 내 문서를 빠르게 검색하고, 두 버전 간 변경사항을 서버에서 구조화된 diff로 확인할 수 있다
**Depends on**: Phase 1
**Requirements**: SRCH-01, SRCH-02, VER-01, VER-02
**Success Criteria** (what must be TRUE):
  1. 워크스페이스 검색 API에 키워드를 입력하면 제목과 본문에서 매칭되는 문서가 관련성 순으로 반환된다
  2. 검색 결과 각 항목에 매칭 컨텍스트를 보여주는 스니펫이 포함된다
  3. 두 버전 ID로 diff API 호출 시 추가/삭제/변경된 라인이 구분된 구조화된 응답을 받는다
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Public Services
**Goal**: 인증 없이 embed 토큰으로 문서를 외부에 공유하고, 문서 내 외부 링크의 OG 프리뷰를 안전하게 제공할 수 있다
**Depends on**: Phase 1, Phase 2
**Requirements**: EMBD-01, EMBD-02, EMBD-03, LINK-01, LINK-02
**Success Criteria** (what must be TRUE):
  1. 유효한 embed 토큰 URL에 접속하면 인증 없이 마크다운 문서가 HTML로 렌더링된다
  2. 만료되었거나 취소된 embed 토큰으로 접속 시 접근 거부 응답을 받는다
  3. embed 페이지 응답 헤더에 CSP script-src 'none'이 포함되어 스크립트 실행이 차단된다
  4. OG 프리뷰 API에 외부 URL을 전달하면 title, description, image 메타데이터가 반환된다
  5. OG 프리뷰 API에 사설 IP/내부 네트워크 URL을 전달하면 요청이 차단된다
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
Note: Phase 3 and 4 can execute in parallel (both depend only on Phase 1).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Auth Hardening | 0/4 | Planning complete | - |
| 2. Test Coverage | 0/2 | Planning complete | - |
| 3. Category & Document Context API | 0/2 | Planning complete | - |
| 4. Search & Version Diff | 0/2 | Not started | - |
| 5. Public Services | 0/2 | Not started | - |
