# Implementation Plan: KMS SaaS Platform

**Branch**: `001-kms-saas-platform` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-kms-saas-platform/spec.md`

## Summary

MarkFlow KMS는 `@markflow/editor` 위에 구축되는 팀 지식 관리 SaaS 플랫폼이다. Phase 1은 인증, 워크스페이스/멤버 관리, 문서 CRUD(자동 저장/버전/휴지통), 카테고리(폴더) 계층 관리, 문서 간 링크(DAG 시각화), Import/Export, 역할 기반 권한 제어를 포함한다. Next.js App Router 프론트엔드 + Fastify API 서버 + PostgreSQL + Redis 아키텍처로 구현한다.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode, `any` 금지)
**Primary Dependencies**:
- Frontend: Next.js (App Router), React 18, Zustand 4+, TanStack Query 5+, Tailwind CSS 4+
- Backend: Fastify 4+, Drizzle ORM, bcrypt, jsonwebtoken
- Shared: `@markflow/editor` (에디터 컴포넌트)

**Storage**: PostgreSQL 16 (primary), Redis 7 (session/cache), Cloudflare R2 (images)
**Testing**: Vitest (Unit/Integration), Playwright (E2E), MSW (API Mock)
**Target Platform**: Web (Desktop browser), Node.js server
**Project Type**: Web application (monorepo: frontend + backend API)
**Performance Goals**: 페이지 초기 로드 < 2초, 에디터 입력 지연 < 16ms, API p95 < 200ms
**Constraints**: 최대 50명 동시 접속, Phase 1 기술 부채 허용 (콘솔 로그 이메일, LIKE 검색)
**Scale/Scope**: ~50 사용자, ~1,000 문서/워크스페이스, ~10 동시 편집자

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Package Independence | ✅ PASS | KMS는 `apps/web`에 위치. `@markflow/editor`는 npm 의존으로만 사용. 에디터 패키지에 KMS 코드 침투 없음 |
| II. Type Safety | ✅ PASS | 모든 신규 코드 strict mode. Drizzle ORM 스키마에서 타입 추론. API 응답 타입 공유 |
| III. Security by Default | ✅ PASS | JWT + HttpOnly Cookie, bcrypt 해시, RBAC 미들웨어, workspace_id 데이터 격리, env var 시크릿 관리 |
| IV. Test-First | ✅ PASS | Vitest 유닛 80%+, 핵심 API 통합 100%, Playwright E2E 핵심 시나리오 |
| V. Style Isolation | ✅ PASS | KMS는 Tailwind CSS 사용. 에디터는 기존 `.mf-` 네임스페이스 유지. 충돌 없음 |
| VI. Phased Delivery | ✅ PASS | 본 계획이 Phase 1. 기술 부채 허용 범위 명시 (이메일=콘솔, 검색=LIKE, 모니터링=console.error) |
| VII. Simplicity & YAGNI | ✅ PASS | Phase 2+ 기능(실시간 협업, 소셜 로그인, PDF Export) 미구현. logger 유틸 사용 |

**Gate result: ALL PASS** — Phase 0 진행 가능

## Project Structure

### Documentation (this feature)

```text
specs/001-kms-saas-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-v1.md        # REST API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
markflow-editor/                     (Turborepo monorepo root)
├── packages/
│   ├── editor/                      ← @markflow/editor (기존, 변경 없음)
│   └── db/                          ← @markflow/db (신규: Drizzle 스키마 + 마이그레이션)
│       ├── src/
│       │   ├── schema/              ← 테이블 정의 (users, workspaces, documents, ...)
│       │   ├── migrations/          ← drizzle-kit 생성 마이그레이션
│       │   └── index.ts             ← barrel export
│       ├── drizzle.config.ts
│       └── package.json
│
├── apps/
│   ├── demo/                        ← 기존 에디터 데모 앱
│   ├── web/                         ← KMS Next.js 앱 (신규)
│   │   ├── app/
│   │   │   ├── (auth)/              ← 로그인/회원가입 페이지
│   │   │   ├── (app)/               ← 인증 필요 영역
│   │   │   │   ├── layout.tsx       ← AppShell (Sidebar + MainContent)
│   │   │   │   └── [workspaceSlug]/
│   │   │   │       ├── docs/        ← 문서 목록 + 편집
│   │   │   │       ├── graph/       ← DAG 그래프 뷰
│   │   │   │       ├── trash/       ← 휴지통
│   │   │   │       └── settings/    ← 워크스페이스 설정
│   │   │   └── layout.tsx           ← Root layout (providers)
│   │   ├── lib/                     ← 클라이언트 유틸리티
│   │   │   ├── api.ts               ← API 클라이언트
│   │   │   └── auth.ts              ← 인증 헬퍼
│   │   ├── components/              ← 공유 UI 컴포넌트
│   │   ├── stores/                  ← Zustand stores
│   │   └── hooks/                   ← 커스텀 React hooks
│   │
│   └── api/                         ← Fastify API 서버 (신규)
│       ├── src/
│       │   ├── routes/              ← 라우트 핸들러
│       │   │   ├── auth.ts
│       │   │   ├── workspaces.ts
│       │   │   ├── documents.ts
│       │   │   ├── categories.ts
│       │   │   ├── relations.ts
│       │   │   ├── invitations.ts
│       │   │   ├── join-requests.ts
│       │   │   ├── tags.ts
│       │   │   └── import-export.ts
│       │   ├── middleware/           ← 인증, 권한, rate limit
│       │   ├── services/            ← 비즈니스 로직
│       │   └── utils/               ← logger, validation 등
│       ├── tests/
│       │   ├── unit/
│       │   └── integration/
│       └── package.json
│
├── docker-compose.yml               ← PostgreSQL + Redis (개발용)
└── package.json                     ← Turborepo root
```

**Structure Decision**: 기존 Turborepo 모노레포 구조를 확장한다. `packages/db`에 공유 DB 스키마, `apps/api`에 Fastify 백엔드, `apps/web`에 Next.js KMS 프론트엔드를 배치한다. 에디터 패키지(`packages/editor`)는 변경하지 않으며, KMS 프론트엔드에서 npm 의존으로 사용한다.

## Complexity Tracking

> No constitution violations detected. This section is intentionally empty.
