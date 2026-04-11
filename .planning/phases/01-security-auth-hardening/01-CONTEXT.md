# Phase 1: Security & Auth Hardening - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

외부 공격 표면을 차단하고 인증/인가 기반을 완성하여, 이후 모든 기능이 안전한 인프라 위에서 동작한다. R2 Worker CORS/인증, 비밀번호 변경 API, graph/relation 서비스 쿼리 최적화, SVG 보안 문서화를 포함한다.

</domain>

<decisions>
## Implementation Decisions

### 비밀번호 변경 세션 정책
- **D-01:** 비밀번호 변경 성공 시 **전체 세션 무효화** — 현재 세션만 유지하고 다른 기기의 모든 refresh token을 무효화한다. 계정 탈취 시 공격자 세션을 즉시 차단하기 위함.
- **D-02:** 비밀번호 변경 실패 시 **로그인 정책 동일 적용** — 5회 실패 시 15분 잠금. 기존 rate-limit 로직을 재사용하여 일관성 유지.
- **D-03:** 변경 성공 응답에 **새 access + refresh token 포함** — 전체 세션 무효화 후에도 클라이언트가 별도 재로그인 없이 계속 사용 가능.

### R2 Worker 보안 전환
- **D-04:** CORS **즉시 strict 전환** — ALLOWED_ORIGINS 환경변수에 프로덕션/로컬 도메인만 설정하고 기본값 `*`을 제거한다. 내부 프로젝트이므로 점진적 전환 불필요.
- **D-05:** API_SECRET 미설정 시 **인증 검사 스킵** (기존 결정 유지) — 로컬 개발 환경에서 .dev.vars 없이도 Worker가 작동하도록 하위 호환 유지.
- **D-06:** 업로드 토큰은 **API 서버에서 발급** — API 서버에 업로드용 임시 토큰 발급 엔드포인트를 추가하고, 프론트엔드가 토큰을 받아 Worker에 Authorization Bearer 헤더로 전달. Worker는 API_SECRET과 비교 검증.

### 서비스 리팩터링
- **D-07:** 쿼리 최적화 시 API **응답 확장 허용** — 기존 필드를 유지하면서 JOIN으로 가져온 추가 데이터(예: categoryName)를 응답에 포함 가능. 프론트엔드에서 추가 데이터 활용 가능.
- **D-08:** relation-service **detectCycle() N+1도 함께 수정** — getRelations()와 detectCycle() 모두 배치 쿼리/JOIN으로 변경. 같은 파일 수정이므로 한 번에 정리.

### SVG 보안 문서화
- **D-09:** SECURITY.md에 **규칙 + 근거** 형태로 문서화 — Avatar(SVG 거부)/Editor(SVG 허용) 분리 규칙과 왜 분리했는지 근거(아바타는 img 태그로 렌더링되어 스크립트 실행 가능, 에디터는 rehype-sanitize 통과하여 안전)를 함께 기록. 정식 ADR까지는 불필요.

### Claude's Discretion
- graph-service 쿼리 최적화 접근 방식 (JOIN vs subquery vs inArray) — 성능과 코드 가독성을 고려하여 Claude가 판단
- relation-service detectCycle() 최적화 구체 전략 — 한 번에 chain을 로드하는 CTE vs 배치 조회 중 선택
- R2 Worker CORS 헤더에 `Authorization` 추가 세부 구현

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### R2 Worker
- `apps/worker/src/index.ts` — R2 Worker 전체 구현. CORS 로직(18-28행), 업로드 핸들러(65-112행). ALLOWED_ORIGINS 기본값 `*` 제거 및 인증 로직 추가 대상.

### API 서비스 레이어
- `apps/api/src/services/graph-service.ts` — 전체 테이블 스캔 이슈(56-62행). documentRelations 전체 SELECT 후 JS 필터.
- `apps/api/src/services/relation-service.ts` — N+1 이슈. getRelations()(280-301행) 개별 document 조회, detectCycle()(63-139행) DFS 루프 조회.
- `apps/api/src/routes/users.ts` — 비밀번호 변경 엔드포인트 추가 대상. 현재 GET/PATCH /me만 존���.
- `apps/api/src/utils/password.ts` — hashPassword(), comparePassword(), validatePassword() 재사용.

### 보안 문서
- `docs/SECURITY.md` — 기존 보안 문서. XSS 방어, 이미지 업로드 보안 섹션 있으나 SVG 분리 근거 미작성.

### 요구사항 및 로드맵
- `.planning/REQUIREMENTS.md` — AUTH-01, SEC-01~05 요구사항 정의
- `.planning/ROADMAP.md` — Phase 1 성공 기준 5개 항목

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `password.ts` — hashPassword(), comparePassword(), validatePassword() 유틸리티. 비밀번호 변경 API에서 그대로 재사용.
- `authMiddleware` — 모든 인증 필요 라우트에 적용 중. 비밀번호 변경도 동일하게 적용.
- `requireRole('viewer'|'editor')` — RBAC 미들웨어. graph/relation 라우트에 이미 적용.
- `badRequest()`, `unauthorized()`, `notFound()` — 에러 유틸리티. 일관된 에러 응답 패턴.
- R2 Worker CORS 로직 (`corsHeaders()`) — origin 필터링 로직 이미 구현, `*` 기본값만 제거하면 됨.

### Established Patterns
- **Fastify 라우트 패턴**: `app.addHook('preHandler', authMiddleware)` → `app.get/post/patch()` with `preHandler: requireRole()`
- **서비스 패턴**: `createXxxService(db)` 팩토리 함수로 DI
- **에러 처리**: `throw badRequest('CODE', 'message')` 패턴
- **Rate Limit**: IP 기준 10회/15분 (로그인에 적용 중)
- **Account Lock**: 동일 계정 5회 연속 실패 → 15분 잠금

### Integration Points
- `apps/api/src/routes/users.ts` — 비밀번호 변경 엔드포인트 추가 위치
- `apps/api/src/routes/auth.ts` — 세션 무효화 로직 참조 (로그아웃 패턴)
- `apps/worker/src/index.ts` — Worker 인증 로직 추가 위치 (fetch 핸들러)
- `docs/SECURITY.md` — SVG 섹션 추가 위치

</code_context>

<specifics>
## Specific Ideas

- 비밀번호 변경 후 전체 세션 무효화 시, 현재 세션의 새 토큰 발급을 atomic하게 처리해야 함 (무효화와 재발급 사이에 gap이 없어야 함)
- R2 Worker의 토큰 검증은 단순 string 비교 (API_SECRET === Bearer token). JWT 검증 불필요 — Worker는 single-consumer 서비스.
- graph-service 최적화 시 `inArray(documentRelations.sourceId, docIds)` 또는 documents와 JOIN 사용 고려

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-security-auth-hardening*
*Context gathered: 2026-04-11*
