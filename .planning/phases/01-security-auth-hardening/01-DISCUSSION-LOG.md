# Phase 1: Security & Auth Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 01-security-auth-hardening
**Areas discussed:** 비밀번호 변경 세션 정책, R2 Worker 보안 전환 세부사항, 서비스 리팩터링 범위, SVG 보안 문서화 깊이

---

## 비밀번호 변경 세션 정책

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 세션 무효화 (권장) | 비밀번호 변경 시 현재 세션만 유지, 나머지 refresh token 무효화 | ✓ |
| 현재 세션만 유지 | 다른 기기 세션 건드리지 않음 | |
| Claude 재량 | 보안 best practice에 따라 판단 | |

**User's choice:** 전체 세션 무효화
**Notes:** 계정 탈취 시 공격자 세션 즉시 차단 목적

| Option | Description | Selected |
|--------|-------------|----------|
| 로그인 정책 동일 적용 (권장) | 5회 실패 시 15분 잠금, 기존 rate-limit 재사용 | ✓ |
| 별도 엄격한 정책 | 3회 실패 시 잠금 등 더 엄격한 기준 | |
| Claude 재량 | 보안 best practice에 따라 판단 | |

**User's choice:** 로그인 정책 동일 적용
**Notes:** 기존 rate-limit 로직 재사용으로 일관성 유지

| Option | Description | Selected |
|--------|-------------|----------|
| 새 토큰 발급 (권장) | 변경 성공 응답에 새 access + refresh token 포함 | ✓ |
| 성공 메시지만 | 토큰 없이 성공 메시지만, 클라이언트 재로그인 필요 | |

**User's choice:** 새 토큰 발급
**Notes:** 전체 세션 무효화 후에도 현재 클라이언트가 끊김 없이 사용 가능

---

## R2 Worker 보안 전환 세부사항

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 strict (권장) | ALLOWED_ORIGINS에 프로덕션/로컬 도메인만, 기본값 `*` 제거 | ✓ |
| 점진적 전환 | 먼저 모니터링 후 다음 배포에서 전환 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 즉시 strict
**Notes:** 내부 프로젝트이므로 외부 사용자 고려 불필요

| Option | Description | Selected |
|--------|-------------|----------|
| 인증 스킵 유지 (기존 결정) | API_SECRET 미설정 시 인증 검사 스킵 | ✓ |
| 로컬도 필수 | .dev.vars에 반드시 API_SECRET 설정 필요 | |

**User's choice:** 인증 스킵 유지 (기존 결정)
**Notes:** 기존 결정 유지, 로컬 개발 편의성 보장

| Option | Description | Selected |
|--------|-------------|----------|
| API 서버 발급 (권장) | API에서 업로드용 임시 토큰 발급, 프론트엔드가 Worker에 전달 | ✓ |
| 환경변수 공유 | 프론트엔드와 Worker가 동일 secret 공유 | |
| Claude 재량 | 기술적으로 적절한 방식 판단 | |

**User's choice:** API 서버 발급
**Notes:** 프론트엔드에 secret 노출 방지, API 서버가 토큰 게이트웨이 역할

---

## 서비스 리팩터링 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 응답 포맷 유지 (권장) | 내부 쿼리만 최적화, API 응답 구조 동일 | |
| 응답 확장 허용 | 최적화와 함께 추가 필드 포함 가능 | ✓ |
| Claude 재량 | 리팩터링 중 적절히 판단 | |

**User's choice:** 응답 확장 허용
**Notes:** JOIN으로 가져온 추가 데이터(categoryName 등)를 프론트엔드에서 활용 가능

| Option | Description | Selected |
|--------|-------------|----------|
| 함께 수정 (권장) | getRelations() + detectCycle() 모두 배치 쿼리로 변경 | ✓ |
| getRelations()만 | SEC-05 요구사항 범위인 getRelations()만 수정 | |

**User's choice:** 함께 수정
**Notes:** 같은 파일 수정이므로 한 번에 정리

---

## SVG 보안 문서화 깊이

| Option | Description | Selected |
|--------|-------------|----------|
| 규칙 + 근거 (권장) | 분리 규칙과 왜 분리했는지 근거 문서화 | ✓ |
| 위협 모델 ADR | 공격 벡터, 대응 방안, 잔여 리스크까지 정식 ADR | |
| 단순 규칙 나열 | 한 줄 규칙만 | |

**User's choice:** 규칙 + 근거
**Notes:** ADR까지는 불필요하나 근거가 있어야 향후 수정 시 맥락 이해 가능

## Claude's Discretion

- graph-service 쿼리 최적화 접근 방식 (JOIN vs subquery vs inArray)
- relation-service detectCycle() 최적화 구체 전략
- R2 Worker CORS 헤더 Authorization 추가 세부 구현

## Deferred Ideas

None — discussion stayed within phase scope
