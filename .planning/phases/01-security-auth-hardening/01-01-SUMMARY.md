---
phase: 01-security-auth-hardening
plan: 01
subsystem: infra
tags: [cloudflare-workers, cors, bearer-auth, r2, security, fastify]

# Dependency graph
requires: []
provides:
  - "R2 Worker CORS strict mode (fail-closed, no wildcard)"
  - "R2 Worker Bearer token authentication (API_SECRET conditional)"
  - "Upload token API endpoint (GET /api/v1/upload-token)"
  - "Worker helper functions extracted for testability"
affects: [01-02, 01-03, frontend-upload]

# Tech tracking
tech-stack:
  added: [vitest (worker package)]
  patterns: [worker-helper-extraction, bearer-token-auth, fail-closed-cors]

key-files:
  created:
    - apps/worker/src/helpers.ts
    - apps/worker/tests/worker-logic.test.ts
    - apps/worker/vitest.config.ts
    - apps/api/src/routes/upload-token.ts
  modified:
    - apps/worker/src/index.ts
    - apps/worker/package.json
    - apps/api/src/index.ts
    - pnpm-lock.yaml

key-decisions:
  - "Helper functions extracted to separate file (helpers.ts) for unit testability"
  - "CORS fail-closed: empty array default instead of wildcard, no '*' support"
  - "Bearer auth conditional: API_SECRET not set means auth skipped (D-05 backward compat)"
  - "Upload token route registered without db option (no database access needed)"
  - "process.env bracket notation used for R2_UPLOAD_SECRET to avoid TypeScript string literal issues"

patterns-established:
  - "Worker helper extraction: pure functions in helpers.ts, default export in index.ts"
  - "Conditional auth: env variable presence toggles security feature"

requirements-completed: [SEC-01, SEC-02]

# Metrics
duration: 6min
completed: 2026-04-11
---

# Phase 01 Plan 01: R2 Worker CORS Strict + Bearer Auth Summary

**R2 Worker CORS wildcard 제거 및 Bearer token 인증 추가, API 서버에 upload-token 발급 엔드포인트 구현**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-11T12:01:57Z
- **Completed:** 2026-04-11T12:07:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- R2 Worker CORS에서 wildcard `*` 기본값을 완전히 제거하고 fail-closed 방식으로 전환
- Bearer token 인증을 Worker에 추가 (API_SECRET 미설정 시 스킵하여 하위 호환 유지)
- 인증된 사용자가 업로드 토큰을 받을 수 있는 API 엔드포인트 추가
- corsHeaders(), checkAuth() 등 핵심 로직을 순수 함수로 추출하여 11개 unit test 작성

## Task Commits

Each task was committed atomically:

1. **Task 1: R2 Worker CORS strict + Bearer auth 구현** - `2d53db3` (feat)
2. **Task 2: Upload token API 엔드포인트 추가** - `5bb0cbf` (feat)

## Files Created/Modified
- `apps/worker/src/helpers.ts` - CORS, auth, JSON response 순수 함수 모듈 (Env 인터페이스 포함)
- `apps/worker/src/index.ts` - helpers.ts import 사용, checkAuth 호출 추가
- `apps/worker/tests/worker-logic.test.ts` - corsHeaders/checkAuth 11개 unit test
- `apps/worker/vitest.config.ts` - Worker 패키지 vitest 설정
- `apps/worker/package.json` - vitest devDependency 추가
- `apps/api/src/routes/upload-token.ts` - GET /api/v1/upload-token 라우트 (authMiddleware preHandler)
- `apps/api/src/index.ts` - uploadTokenRoutes import 및 등록
- `pnpm-lock.yaml` - vitest 의존성 반영

## Decisions Made
- **helpers.ts 분리**: Worker 로직을 테스트하기 위해 순수 함수를 별도 파일로 추출. index.ts는 fetch handler만 유지.
- **CORS fail-closed**: `ALLOWED_ORIGINS` 미설정 시 모든 origin 거부. 보안 우선 원칙 적용.
- **API_SECRET 조건부 인증**: API_SECRET이 없으면 인증을 스킵하여 기존 배포와의 하위 호환성 유지 (D-05).
- **uploadTokenRoutes에 db 미전달**: 이 엔드포인트는 DB 접근이 필요 없으므로 db 옵션 없이 등록.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- API 통합 테스트가 DB 연결 에러(`database "markdown_web_test" does not exist`)로 전체 실패하지만, 이는 기존 환경 문제이며 이번 변경과 무관. TypeScript 컴파일(`tsc --noEmit`)로 타입 정합성 확인 완료.
- gsd-tools commit이 develop 브랜치에 커밋하여 워크트리 브랜치에 직접 git commit으로 재커밋 수행.

## User Setup Required

Production 배포 시 다음 환경변수 설정 필요:

| 서비스 | 환경변수 | 설명 |
|--------|----------|------|
| Cloudflare Worker | `API_SECRET` | Workers Secret으로 설정 (64자 랜덤 hex 권장) |
| API Server | `R2_UPLOAD_SECRET` | Worker의 API_SECRET과 동일한 값 |
| Cloudflare Worker | `ALLOWED_ORIGINS` | 허용할 origin 쉼표 구분 (예: `https://app.markflow.io`) |

## Next Phase Readiness
- Worker CORS/auth 기반이 마련되어 프론트엔드 업로드 흐름에서 Authorization 헤더 전송 구현 가능
- 다음 플랜에서 프론트엔드가 upload-token API를 호출하고 Worker에 Bearer 헤더를 포함하는 흐름 구현 예정

## Self-Check: PASSED

- All 5 created files verified on disk
- Commit 2d53db3 (Task 1) verified in git log
- Commit 5bb0cbf (Task 2) verified in git log

---
*Phase: 01-security-auth-hardening*
*Completed: 2026-04-11*
