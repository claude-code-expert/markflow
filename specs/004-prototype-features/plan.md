# Implementation Plan: Prototype-Based Feature Completion

**Branch**: `004-prototype-features` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-prototype-features/spec.md`

## Summary

프로토타입(markflow-prototype.html)에 정의된 11개 미구현 기능을 기존 핵심 기능(에디터, 저장, 워크스페이스, 인증, 문서 CRUD)을 유지하면서 구현한다. 기존 API 엔드포인트(join-requests, graph, import/export, versions, relations)와 프론트엔드 컴포넌트(dag-pipeline-graph, document-meta-panel, version-history-panel)를 최대한 재활용하며, 신규 프론트엔드 페이지/모달 중심으로 작업한다.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode, `any` 금지)
**Primary Dependencies**:
- Frontend: Next.js 16.2.1, React 19.2.4, Zustand 5.0.0, TanStack React Query 5.72.0, Tailwind CSS 4
- Backend: Fastify 5.3.0, Drizzle ORM 0.39.0, jsonwebtoken 9.0.2, bcryptjs 3.0.2
- Editor: CodeMirror 6, unified 11 + remark/rehype ecosystem
**Storage**: PostgreSQL 16 (Drizzle ORM), Cloudflare R2 (images)
**Testing**: Vitest 3 (Unit/Integration), Playwright 1 (E2E)
**Target Platform**: Web (Next.js App Router), API (Fastify on Node.js 20+)
**Project Type**: Web application (monorepo: apps/web + apps/api + packages/editor + packages/db)
**Performance Goals**: 프리뷰 테마 전환 < 2초, 검색 결과 표시 < 1초, DAG 렌더링 < 2초
**Constraints**: rehype-sanitize 파이프라인 유지, CSS 변수 `--mf-*` 접두사 강제, 수동 저장(Cmd+S) 유지
**Scale/Scope**: Phase 1 프로토타입 수준 (~50 사용자, ~1K 문서)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Package Independence | PASS | 에디터 패키지 변경 없음. Word count/cursor position은 에디터 패키지 내부에 추가하되 독립 동작 유지 |
| II. Type Safety | PASS | 모든 신규 코드 strict mode, `any` 금지 |
| III. Security by Default | PASS | CSS 테마는 `--mf-*` 변수만 허용 (Phase 1), Guest Token은 기존 JWT 패턴 확장, sanitize 파이프라인 불변 |
| IV. Test-First | PASS | 각 User Story별 테스트 작성 후 구현 |
| V. Style Isolation | PASS | 신규 CSS는 `.mf-` 접두사 유지, 랜딩 페이지는 앱 외부이므로 격리 불필요 |
| VI. Phased Delivery | PASS | 11개 스토리 독립 배포 가능, Phase 1 프로토타입 범위 |
| VII. Simplicity & YAGNI | PASS | 기존 API/컴포넌트 재활용, 불필요한 추상화 없음 |

**Gate Result: ALL PASS** — Phase 0 진행 가능

## Project Structure

### Documentation (this feature)

```text
specs/004-prototype-features/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.md # New/modified API contracts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── api/src/
│   ├── routes/
│   │   ├── join-requests.ts     # (기존) 가입 신청 API
│   │   ├── graph.ts             # (기존) DAG 데이터 API
│   │   ├── import-export.ts     # (기존) Import/Export API
│   │   ├── workspaces.ts        # (수정) 공개 워크스페이스 목록 엔드포인트 추가
│   │   ├── embed-tokens.ts      # (신규) Guest Token CRUD API
│   │   └── theme.ts             # (신규) CSS 테마 저장/조회 API
│   └── services/
│       ├── embed-token-service.ts  # (신규)
│       └── theme-service.ts        # (신규)
├── web/
│   ├── app/
│   │   ├── (landing)/page.tsx              # (신규) US1 — 랜딩 페이지
│   │   └── (app)/[workspaceSlug]/settings/  # workspaceSlug는 실제로 URL-encoded workspace name
│   │       ├── theme/page.tsx              # (신규) US5 — CSS 테마
│   │       └── embed/page.tsx              # (신규) US7 — 임베드 설정
│   ├── components/
│   │   ├── search-modal.tsx                # (신규) US2 — 검색 모달
│   │   ├── import-export-modal.tsx          # (신규) US6 — Import/Export 모달
│   │   ├── document-links-modal.tsx         # (신규) US9 — 문서 링크 모달
│   │   ├── version-history-modal.tsx        # (신규) US11 — 버전 히스토리 모달
│   │   ├── dag-structure-modal.tsx           # (신규) US4 — DAG 전체 모달
│   │   ├── mini-dag-diagram.tsx             # (신규) US4 — 메타 패널 미니 DAG
│   │   ├── toast-provider.tsx               # (신규) US10 — 토스트 시스템
│   │   ├── join-request-panel.tsx           # (신규) US3 — 가입 신청 패널
│   │   ├── landing/                         # (신규) US1 — 랜딩 컴포넌트
│   │   │   ├── hero.tsx
│   │   │   ├── features-grid.tsx
│   │   │   ├── pricing-section.tsx
│   │   │   └── footer.tsx
│   │   ├── sidebar.tsx                      # (수정) 검색 바 → 검색 모달 연동
│   │   ├── app-header.tsx                   # (수정) 검색 아이콘 → 검색 모달 연동
│   │   ├── document-meta-panel.tsx          # (수정) 미니 DAG, 링크 관리 연동
│   │   └── version-history-panel.tsx        # (수정) "전체 보기" → 모달 연동
│   └── stores/
│       └── toast-store.ts                   # (신규) 토스트 상태 관리
└── packages/
    └── editor/src/
        ├── editor/EditorPane.tsx            # (수정) 커서 위치 표시
        └── preview/PreviewPane.tsx          # (수정) Word count 표시
```

**Structure Decision**: 기존 모노레포 구조(apps/web, apps/api, packages/editor, packages/db)를 유지한다. 신규 파일은 기존 디렉토리 패턴(routes/, services/, components/)에 배치한다. 랜딩 페이지는 (landing) route group으로 격리한다.

## Complexity Tracking

> Constitution Check에 위반 사항 없음 — 이 섹션은 비어 있음.
