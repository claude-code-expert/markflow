# Phase 2: Test Coverage - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 보안 변경과 기존 핵심 기능(댓글, 이미지 업로드)이 통합 테스트로 검증되어, 이후 기능 추가 시 회귀를 방지한다. 댓글 CRUD 통합 테스트(7개 시나리오)와 이미지 업로드 클라이언트 검증 테스트(5개 시나리오)를 작성한다.

</domain>

<decisions>
## Implementation Decisions

### 이미지 업로드 테스트 전략
- **D-01:** **클라이언트 검증 로직만 단위 테스트** — R2 Worker 직접 테스트나 API 엔드포인트 테스트 제외. validateImageFile(), cloudflareUploader 등 클라이언트 유틸리티 함수 대상.
- **D-02:** **5개 시나리오 전부 커버** — 타입 검증/크기 제한/CORS/성공 업로드/에러 처리. CORS와 성공 업로드는 fetch mock으로 cloudflareUploader의 응답 처리 로직을 검증.

### 댓글 테스트 범위
- **D-03:** **단일 파일** `comments.test.ts`에 describe 블록으로 7개 시나리오 그룹화 — 기존 통합 테스트 패턴(auth-login.test.ts 등)과 동일.
- **D-04:** **권한 검증은 '권한' 시나리오에 포함** — viewer/editor/admin 역할별 접근 제어를 댓글 테스트 내 권한 describe 블록에서 검증. 별도 보안 테스트 파일 불필요.

### 테스트 인프라 & 격리
- **D-05:** **factory.ts 확장** — createComment(), createDocument() 등 헬퍼 함수 추가. 기존 createUser() 패턴을 따라서 테스트 코드 간결화.
- **D-06:** **기존 DB 격리 패턴 유지** — setup.ts의 beforeAll/afterAll로 DB 초기화. 기존 30+개 테스트와 동일한 방식으로 일관성 유지.

### 커버리지 기준
- **D-07:** **시나리오 통과만 기준** — TEST-01 7개, TEST-02 5개 시나리오 전부 통과를 성공 기준으로. 코드 커버리지 % 수치 게이트는 설정하지 않음.

### Claude's Discretion
- 댓글 테스트 내 각 시나리오의 구체적 assertion 설계
- fetch mock 구현 방식 (vitest mock vs msw)
- factory 함수의 매개변수 설계 및 기본값
- 테스트 데이터의 구체적 값 (이메일, 문서 내용 등)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 댓글 관련 코드
- `apps/api/src/routes/comments.ts` — 댓글 라우트 전체 (CRUD + 수정/삭제/해결)
- `apps/api/src/services/comment-service.ts` — 댓글 서비스 로직
- `packages/db/src/schema/` — 댓글 테이블 스키마

### 이미지 업로드 관련 코드
- `packages/editor/src/utils/imageValidation.ts` — validateImageFile() 클라이언트 검증 유틸
- `packages/editor/src/utils/cloudflareUploader.ts` — R2 Worker 업로드 함수
- `apps/worker/src/index.ts` — R2 Worker 구현 (테스트 대상 아님, 참고용)

### 테스트 인프라
- `apps/api/tests/helpers/setup.ts` — DB 초기화, getApp(), getDb() 헬퍼
- `apps/api/tests/helpers/factory.ts` — createUser() 등 팩토리 함수
- `apps/api/tests/integration/auth-login.test.ts` — 기존 통합 테스트 패턴 참고

### 요구사항
- `.planning/REQUIREMENTS.md` — TEST-01(댓글 CRUD 통합 테스트), TEST-02(이미지 업로드 테스트)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setup.ts` — getApp()/getDb() 헬퍼, beforeAll/afterAll DB 초기화 패턴
- `factory.ts` — createUser() 팩토리. createComment(), createDocument() 추가 예정
- `authMiddleware`, `requireRole()` — 댓글 라우트에 이미 적용된 인증/인가 미들웨어
- `badRequest()` 등 에러 유틸리티 — 테스트에서 에러 응답 검증 시 참고

### Established Patterns
- **통합 테스트**: Vitest + `app.inject()` 패턴으로 HTTP 요청 시뮬레이션
- **테스트 구조**: `describe` 블록으로 Success/Error 케이스 분리
- **테스트 번호**: `T027` 형식의 테스트 ID 부여 (기존 패턴)
- **DB 격리**: setup.ts에서 테스트 전/후 DB 초기화

### Integration Points
- `apps/api/tests/integration/` — 새 comments.test.ts 추가 위치
- `packages/editor/src/utils/` — 이미지 관련 단위 테스트 추가 위치
- `apps/api/tests/helpers/factory.ts` — 팩토리 함수 확장 위치

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-test-coverage*
*Context gathered: 2026-04-13*
