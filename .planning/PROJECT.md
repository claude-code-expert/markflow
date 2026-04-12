# MarkFlow KMS — Phase 2 MVP

## What This Is

마크다운 기반 지식 관리 시스템(KMS). 팀이 마크다운 문서를 생성·편집·공유하고, 워크스페이스 단위로 협업할 수 있는 웹 애플리케이션. Phase 0(에디터 패키지)과 Phase 1(프로토타입)이 완료된 상태에서, Phase 2 MVP를 통해 베타 사용자 10팀 온보딩을 목표로 한다.

## Core Value

**팀이 마크다운으로 지식을 체계적으로 관리하고 공유할 수 있어야 한다** — 문서 생성/편집, 카테고리 계층 구조, 버전 관리, 관계 그래프가 안정적으로 동작해야 한다.

## Requirements

### Validated

- ✓ CodeMirror 6 듀얼 뷰 에디터 + GFM/KaTeX/코드 하이라이팅 — Phase 0
- ✓ 인증 (회원가입/로그인/토큰갱신/로그아웃/이메일인증/비밀번호 찾기·재설정) — Phase 1
- ✓ 사용자 프로필 CRUD + 아바타 R2 업로드 — Phase 1
- ✓ 워크스페이스 CRUD + 멤버관리 + 초대 + 가입요청 — Phase 1
- ✓ 카테고리 CRUD + 트리 + 재정렬 — Phase 1
- ✓ 문서 CRUD + 버전관리 + 태그 + 관계(DAG) + 댓글 + 휴지통 — Phase 1
- ✓ 임베드 토큰 CRUD — Phase 1
- ✓ 프레젠테이션 모드 + 검색 모달 + 그래프 뷰 + 랜딩 페이지 — Phase 1
- ✓ JWT + RBAC + CSRF + Rate Limiting + 워크스페이스 스코프 — Phase 1
- ✓ 이미지 업로드 통합 (Avatar + Editor R2) — Phase 2
- ✓ 댓글 수정/해결 API — Phase 2
- ✓ 드래그앤드롭 폴더 이동 — Phase 2

### Active

- [ ] 이메일 재발송 API (POST /auth/resend-verification) — P1 긴급
- [x] 비밀번호 변경 API (PUT /users/me/password) — Validated in Phase 1: Security & Auth Hardening
- [x] R2 Worker 보안 보강 (CORS strict + Bearer auth) — Validated in Phase 1: Security & Auth Hardening
- [x] SVG 업로드 보안 문서화 — Validated in Phase 1: Security & Auth Hardening
- [ ] 댓글 CRUD 통합 테스트 — 테스트
- [ ] 이미지 업로드 테스트 — 테스트
- [ ] 워크스페이스 풀텍스트 검색 (pg_trgm) — P2 기능
- [ ] 버전 Diff 서버 API — P2 기능
- [ ] 카테고리 Graph REST 엔드포인트 (ancestors/descendants) — P2 기능
- [ ] 단일 문서 DAG 컨텍스트 API — P2 기능
- [ ] 퍼블릭 임베드 렌더링 페이지 — P2 기능
- [ ] OG Link Preview 프록시 API — P2 기능

### Out of Scope

- 이메일 서비스 연동 (Resend/SendGrid) — 사용자 결정으로 다음 phase 이관. 현재 logger.info() 유지
- 실시간 협업 (y-websocket CRDT) — Phase 2 후반 또는 Phase 3에서 별도 판단
- OAuth 2.0 (Google/GitHub) — Phase 3
- Activity Feed & 알림 — Phase 3
- Public Pages & 커스텀 도메인 — Phase 3
- AI Writing Assistant — Phase 3
- 성능 최적화 & 부하 테스트 — Phase 3
- 수익화 (Stripe) — Phase 3

## Context

- **기술 스택**: TypeScript 5+ (strict), Next.js 16 (App Router), Fastify, Drizzle ORM, PostgreSQL 16, Cloudflare R2
- **모노레포**: pnpm workspace + Turborepo (`packages/editor`, `apps/web`, `apps/api`, `apps/worker`)
- **현재 상태**: Phase 2 MVP Phase 1(Security & Auth Hardening) 완료, Phase 2(Test Coverage) 진행 예정
- **코드 규모**: API 74 엔드포인트(+upload-token, +PUT /me/password), 프론트 20 페이지, DB 15 테이블
- **긴급 이슈**: 프론트에서 `POST /auth/resend-verification` 호출 시 404 에러 발생 중
- **보안 상태**: R2 Worker CORS strict(fail-closed) + Bearer auth 적용 완료

## Constraints

- **TypeScript**: strict mode, `any` 금지
- **CSS**: `.mf-` 접두사, `--mf-` CSS 변수
- **테스트**: 새 기능 구현 시 테스트 코드 먼저 작성 (TDD)
- **커밋**: Conventional Commits
- **보안**: rehype-sanitize 필수, dangerouslySetInnerHTML은 sanitize 통과 HTML만
- **DB**: 삭제/리셋 시 사용자 승인 필수, 마이그레이션 롤백 가능해야 함

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 이메일 서비스를 Phase 2에서 제외 | 현재 logger.info()로 충분, 실제 발송은 베타 온보딩 시 결정 | — Pending |
| R2 Worker에 인증 토큰 추가 | 비인증 업로드 위험 해소 | ✓ Phase 1 완료 |
| 클라이언트사이드 diff 유지 + 서버 API 추가 | 현재 동작하는 기능 유지하면서 서버사이드 최적화 병행 | — Pending |
| pg_trgm 풀텍스트 검색 도입 | ILIKE만으로는 대용량 문서 검색 성능 부족 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after Phase 1 completion*
