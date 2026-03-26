# Implementation Plan: KMS 프론트엔드 버그 수정 및 UI 재정비

**Branch**: `002-kms-frontend-fix` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-kms-frontend-fix/spec.md`

## Summary

로그인 후 `/undefined` 리다이렉트 버그를 수정하고, 프로토타입(markflow-prototype.html)의 디자인 시스템을 앱 전체에 적용하며, 문서 CRUD와 워크스페이스 관리 기능이 정상 동작하도록 프론트엔드(apps/web)를 재정비한다. 백엔드(apps/api)는 변경하지 않으며, 프론트엔드 코드만 수정한다.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode, `any` 금지)
**Primary Dependencies**: Next.js 16.2.1 (App Router), React 19.2.4, Zustand 5.0.0, @tanstack/react-query 5.72.0, Tailwind CSS 4
**Storage**: N/A (프론트엔드 전용 — 백엔드 API를 통해 PostgreSQL 간접 접근)
**Testing**: Vitest 3 (Unit), Playwright (E2E)
**Target Platform**: Web Browser (Chrome, Firefox, Safari latest)
**Project Type**: Web application (Next.js SPA, frontend-only 수정)
**Performance Goals**: SC-001 기준 로그인 후 5초 이내 화면 표시
**Constraints**: 백엔드 API 변경 없음, 기존 컴포넌트 파일 수정 방식, Phase 1 프로토타입 수준
**Scale/Scope**: 인증 2화면 + 워크스페이스 목록 1화면 + 앱 셸(헤더+사이드바) + 문서 목록/에디터 = 약 6~8 화면

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Package Independence | PASS | 프론트엔드(apps/web)만 수정. @markflow/editor 패키지 독립성 영향 없음 |
| II. Type Safety | PASS | strict mode 유지, `any` 금지. 모든 API 응답에 타입 정의 |
| III. Security by Default | PASS | sanitize 파이프라인 변경 없음. 인증 토큰은 기존 Bearer 방식 유지 |
| IV. Test-First | PASS | 각 User Story별 테스트 시나리오 정의됨. Vitest + Playwright 활용 |
| V. Style Isolation | ATTENTION | apps/web은 KMS 앱이므로 `.mf-` 접두사는 에디터 패키지에만 해당. 앱 자체 CSS는 Tailwind + 프로토타입 디자인 토큰 적용. 에디터 embed 시 `.mf-` 규칙 준수 |
| VI. Phased Delivery | PASS | Phase 1 프로토타입 수준. 기술 부채 허용 범위 내 |
| VII. Simplicity & YAGNI | PASS | 스펙에 정의된 기능만 구현. 랜딩/CSS 에디터/embed 제외 |

**Gate Result**: PASS (위반 없음)

## Project Structure

### Documentation (this feature)

```text
specs/002-kms-frontend-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── frontend-api.md  # Frontend ↔ Backend API contract
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── globals.css                    # 프로토타입 디자인 토큰 + Tailwind
│   ├── layout.tsx                     # 루트 레이아웃 (폰트 로딩)
│   ├── providers.tsx                  # React Query Provider
│   ├── (auth)/
│   │   ├── layout.tsx                 # 인증 페이지 레이아웃
│   │   ├── login/page.tsx             # 로그인 페이지
│   │   └── register/page.tsx          # 회원가입 페이지
│   └── (app)/
│       ├── layout.tsx                 # 앱 셸 (헤더 + 사이드바 + 콘텐츠)
│       ├── page.tsx                   # 워크스페이스 목록
│       └── [workspaceSlug]/
│           ├── page.tsx               # 워크스페이스 홈 → 문서 목록 리다이렉트
│           ├── docs/
│           │   ├── page.tsx           # 문서 목록
│           │   └── [docId]/page.tsx   # 문서 에디터
│           ├── settings/
│           │   ├── page.tsx           # 워크스페이스 설정
│           │   └── members/page.tsx   # 멤버 관리
│           ├── trash/page.tsx         # 휴지통
│           └── graph/page.tsx         # 지식 그래프
├── components/
│   ├── app-header.tsx                 # 앱 헤더 (신규)
│   ├── sidebar.tsx                    # 사이드바 (대폭 수정)
│   ├── category-tree.tsx              # 폴더 트리
│   ├── create-workspace-modal.tsx     # 워크스페이스 생성 모달
│   ├── new-doc-modal.tsx              # 문서 생성 모달
│   ├── new-folder-modal.tsx           # 폴더 생성 모달
│   └── states/                        # 로딩/에러/빈 상태
├── lib/
│   └── api.ts                         # API 클라이언트 (수정 최소화)
├── stores/
│   ├── auth-store.ts                  # 인증 상태 (응답 파싱 버그 수정)
│   ├── workspace-store.ts             # 워크스페이스 상태 (응답 파싱 버그 수정)
│   ├── editor-store.ts                # 에디터 상태
│   └── sidebar-store.ts               # 사이드바 상태
└── hooks/
    └── use-permissions.ts             # RBAC 훅
```

**Structure Decision**: 기존 apps/web 구조를 유지하고, 프로토타입 디자인 토큰을 globals.css에 추가하며, 앱 헤더 컴포넌트를 신규 생성한다. 나머지는 기존 파일 수정.

## Complexity Tracking

> 위반 없음 — 기재 불필요
