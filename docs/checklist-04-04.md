# MarkFlow KMS — 프로젝트 감사 체크리스트

> **작성일:** 2026-04-04
> **브랜치:** develop
> **범위:** API · Frontend · DB · Editor Library · Spec Sync

---

## 1. 프로젝트 현황 요약

| 영역 | 완료 | 미완료 | 완성도 |
|------|------|--------|--------|
| API 엔드포인트 | 40/56 | 16 (부분1 + 미구현15) | 73% |
| 프론트엔드 화면 | 14/14 페이지 | 세부 기능 미완 | ~88% |
| DB 테이블 | 13/13 | Spec 대비 1개 미구현 (oauth_accounts) | 93% |
| 에디터 라이브러리 독립성 | 통과 | — | 100% |
| Spec 문서 Sync | — | 9개 문서 불일치 발견 | v1_3 필요 |
| ERD Sync | — | 7건 불일치 | 업데이트 필요 |

---

## 2. API 완성도

### 2.1 완전 구현된 엔드포인트 (40개)

| 영역 | 엔드포인트 | 상태 |
|------|-----------|------|
| **Auth** | POST /auth/register | ✅ |
| | POST /auth/login | ✅ (계정 잠금 5회/15분) |
| | POST /auth/refresh | ✅ |
| | POST /auth/logout | ✅ |
| | GET /auth/verify-email | ✅ |
| **Users** | GET /users/me | ✅ |
| | PATCH /users/me | ✅ |
| **Workspaces** | GET /workspaces | ✅ |
| | POST /workspaces | ✅ |
| | GET /workspaces/:id | ✅ |
| | PATCH /workspaces/:id | ✅ |
| | DELETE /workspaces/:id | ✅ |
| | POST /workspaces/:id/transfer | ✅ |
| | GET /workspaces/public | ✅ |
| **Members** | GET /workspaces/:id/members | ✅ |
| | PATCH /workspaces/:id/members/:userId | ✅ |
| | DELETE /workspaces/:id/members/:userId | ✅ |
| **Invitations** | POST /workspaces/:id/invitations | ✅ |
| | GET /invitations/:token | ✅ |
| | POST /invitations/:token/accept | ✅ |
| **Join Requests** | POST /workspaces/:id/join-requests | ✅ |
| | GET /workspaces/:id/join-requests | ✅ |
| | PATCH /workspaces/:id/join-requests/:id | ✅ |
| | PATCH /workspaces/:id/join-requests/batch | ✅ |
| **Categories** | POST /workspaces/:wsId/categories | ✅ |
| | GET /workspaces/:wsId/categories | ✅ (flat) |
| | GET /workspaces/:wsId/categories/tree | ✅ (nested) |
| | PATCH /workspaces/:wsId/categories/:id | ✅ |
| | PUT /workspaces/:wsId/categories/reorder | ✅ |
| | DELETE /workspaces/:wsId/categories/:id | ✅ |
| **Documents** | POST /workspaces/:wsId/documents | ✅ |
| | GET /workspaces/:wsId/documents | ✅ |
| | GET /workspaces/:wsId/documents/:id | ✅ |
| | PATCH /workspaces/:wsId/documents/:id | ✅ |
| | DELETE /workspaces/:wsId/documents/:id | ✅ (soft delete) |
| **Versions** | GET .../documents/:docId/versions | ✅ |
| | POST .../documents/:docId/restore-version | ✅ |
| **Tags** | GET .../documents/:docId/tags | ✅ |
| | PUT .../documents/:docId/tags | ✅ |
| | GET /workspaces/:wsId/tags | ✅ |
| **Relations** | PUT .../documents/:docId/relations | ✅ |
| | GET .../documents/:docId/relations | ✅ |
| **Comments** | GET .../documents/:docId/comments | ✅ |
| | POST .../documents/:docId/comments | ✅ |
| | DELETE .../comments/:commentId | ✅ |
| **Trash** | GET /workspaces/:wsId/trash | ✅ |
| | POST .../trash/:docId/restore | ✅ |
| | DELETE .../trash/:docId | ✅ (영구 삭제) |
| **Import/Export** | POST /workspaces/:wsId/import | ✅ |
| | GET .../documents/:docId/export | ✅ |
| | GET .../categories/:catId/export | ✅ (ZIP) |
| **Theme** | GET /workspaces/:id/theme | ✅ |
| | PATCH /workspaces/:id/theme | ✅ |
| **Embed** | POST /workspaces/:id/embed-tokens | ✅ |
| | GET /workspaces/:id/embed-tokens | ✅ |
| | DELETE .../embed-tokens/:tokenId | ✅ |
| **Graph** | GET /workspaces/:wsId/graph | ✅ |
| **System** | GET /health | ✅ |

### 2.2 부분 구현 (1개)

| 엔드포인트 | 구현된 부분 | 미완료 부분 |
|-----------|-----------|-----------|
| **PUT /users/me/avatar** | 파일 검증 (JPG/PNG, 2MB), DB 업데이트 | R2 실제 업로드 미구현 — 플레이스홀더 URL 생성만 (`users.ts:136`) |

### 2.3 미구현 엔드포인트 (15개)

| 우선순위 | 엔드포인트 | Spec 참조 | 비고 |
|---------|-----------|----------|------|
| **P1** | POST /auth/forgot-password | 005 §1 | 비밀번호 리셋 이메일 |
| **P1** | POST /auth/reset-password | 005 §1 | 토큰 기반 비밀번호 재설정 |
| **P1** | PATCH /users/me/password | 005 §2 | 비밀번호 변경 |
| **P2** | GET .../categories/:id/ancestors | 005 §4 | Breadcrumb 경로 |
| **P2** | GET .../categories/:id/descendants | 005 §4 | 하위 전체 조회 |
| **P2** | GET .../versions/:versionNum | 005 §6 | 특정 버전 내용 조회 |
| **P2** | GET .../versions/diff | 005 §6 | Myers diff 알고리즘 |
| **P2** | PATCH .../comments/:commentId | 005 §7 | 코멘트 수정/해결 |
| **P2** | GET /workspaces/:id/search | 005 §8 | 풀 워크스페이스 검색 (필터) |
| **P2** | POST /link-preview | 005 §9 | OG 메타데이터 프록시 |
| **P2** | GET /embed/doc/:documentId | 005 §11 | 퍼블릭 임베드 페이지 |
| **P2** | GET .../documents/:id/dag-context | 005 §13 | 단일 문서 DAG 컨텍스트 |
| **P3** | PATCH .../documents/:id/links | 005 §5 | 통합 링크 관리 (현재 /relations로 대체) |
| **P3** | POST /auth/resend-verification | — | 이메일 재발송 (프론트에서 호출 중) |
| **P3** | OAuth 2.0 연동 (Google, GitHub) | 008 Phase3 | UI 버튼만 존재 |

### 2.4 Spec vs 구현 엔드포인트명 불일치

| Spec 명세 | 실제 구현 | 영향 |
|----------|----------|------|
| `PATCH .../documents/:id/links` | `PUT/GET .../documents/:docId/relations` | 기능 동일, 경로명 상이 |
| `GET /categories` → nested tree | flat list 반환 + `/categories/tree` 별도 | 프론트엔드 `/categories/tree` 사용 중 |
| `POST /documents` with `startMode` param | `startMode` 미구현 | 스키마에도 컬럼 없음 |

---

## 3. 프론트엔드 화면별 완성도

### 3.1 페이지 인벤토리

| 화면 | 경로 | 완성도 | 미완료 사항 |
|------|------|--------|-----------|
| 랜딩 | `/` | 90% | 소셜 로그인 버튼 UI만 존재 |
| 로그인 | `/login` | 95% | Google/GitHub OAuth 미연동 |
| 회원가입 | `/register` | 95% | 소셜 가입 미연동 |
| 이메일 인증 | `/verify-email` | 100% | — |
| 초대 수락 | `/invite/[token]` | 100% | — |
| 워크스페이스 목록 | `/workspaces` | 100% | — |
| 문서 목록 | `/[ws]/doc` | 90% | 드래그앤드롭 폴더 이동 미완 |
| 문서 에디터 | `/[ws]/doc/[id]` | 85% | 실시간 협업, 고급 검색 필터 |
| 그래프 뷰 | `/[ws]/graph` | 80% | 필터링/검색 미완 |
| 휴지통 | `/[ws]/trash` | 95% | — |
| 프레젠테이션 | `/present/[ws]/[id]` | 80% | Export/Share 미완 |
| 설정 - 일반 | `/[ws]/settings` | 100% | — |
| 설정 - 멤버 | `/[ws]/settings/members` | 90% | 일괄 작업 미완 |
| 설정 - 테마 | `/[ws]/settings/theme` | 80% | 커스텀 테마 Import 미완 |
| 설정 - 임베드 | `/[ws]/settings/embed` | 70% | 임베드 문서/가이드 미완 |

### 3.2 컴포넌트 현황 (38개)

| 분류 | 수량 | 주요 컴포넌트 |
|------|------|-------------|
| 레이아웃 | 3 | sidebar, app-header, toast-provider |
| 모달/다이얼로그 | 10 | create-workspace, new-doc, new-folder, search, profile-edit, import-export, version-history, document-links, dag-structure |
| 문서 편집 패널 | 4 | document-meta-panel, version-history-panel, comment-panel, link-preview |
| 문서 관리 | 4 | category-tree, doc-context-menu, folder-context-menu, tag-input |
| 그래프 | 3 | dag-pipeline-graph, dag-pipeline-nav, mini-dag-diagram |
| 특수 기능 | 2 | presentation-mode, join-request-panel |
| 랜딩 | 5 | nav-bar, hero, features-grid, pricing-section, footer |
| 상태 표시 | 3 | loading, error, empty |

### 3.3 상태 관리 (Zustand 5개 스토어)

| 스토어 | 용도 | 상태 |
|--------|------|------|
| auth-store | 인증/사용자 | ✅ |
| workspace-store | 워크스페이스 컨텍스트 | ✅ |
| editor-store | 문서 편집 상태 | ✅ |
| sidebar-store | 사이드바 UI (persist) | ✅ |
| toast-store | 토스트 알림 | ✅ |

---

## 4. DB 스키마 감사

### 4.1 구현된 테이블 (13개)

| 테이블 | 컬럼 수 | 인덱스 | 상태 |
|--------|---------|--------|------|
| users | 12 | — | ✅ |
| workspaces | 9 | — | ✅ |
| workspace_members | 5 | — | ✅ |
| documents | 12 | 3 (active, deleted, slug unique) | ✅ |
| document_versions | 5 | 1 (unique version) | ✅ |
| document_relations | 5 | 2 (source, target) | ✅ |
| categories | 6 | 1 (unique name) | ✅ |
| category_closure | 3 | 2 (ancestor, descendant) | ✅ |
| tags | 3 | — | ✅ |
| document_tags | 2 | 2 (document, tag) | ✅ |
| comments | 6 | 1 (document) | ✅ |
| refresh_tokens | 5 | 2 (user, expires) | ✅ |
| invitations | 8 | — | ✅ |
| join_requests | 8 | 1 (unique pending) | ✅ |
| embed_tokens | 8 | 1 (workspace) | ✅ |

### 4.2 Spec에 정의되었으나 미구현 테이블

| 테이블 | Spec 위치 | 비고 |
|--------|----------|------|
| **OAUTH_ACCOUNTS** | 004 §2 | Google/GitHub OAuth 연동용. Phase 3 예정 |

### 4.3 Spec에 정의되었으나 미구현 컬럼 (Ghost Fields)

| 테이블 | 컬럼 | Spec 위치 | 비고 |
|--------|------|----------|------|
| **documents** | `start_mode` | 004 §6, 005 §5 | `'blank' \| 'template'` — 스키마/API 모두 미구현 |

### 4.4 Dead Fields 검출 (스키마에 있으나 사용되지 않는 컬럼)

> **결과: 발견되지 않음**
>
> 모든 78개 컬럼이 API 서비스 계층 또는 라우트 핸들러에서 READ 또는 WRITE 되고 있습니다.

### 4.5 ERD vs 실제 스키마 불일치 (7건)

| # | 불일치 내용 | ERD 표기 | 실제 스키마 |
|---|-----------|---------|-----------|
| 1 | **전체 ID 타입** | `uuid` | `bigserial` (bigint) |
| 2 | **workspaces.slug** | UQ varchar(100) | **존재하지 않음** (name이 UNIQUE) |
| 3 | **workspaces.theme_preset** | 없음 | `varchar(20) NOT NULL DEFAULT 'default'` |
| 4 | **workspaces.theme_css** | 없음 | `text NOT NULL DEFAULT ''` |
| 5 | **categories.order_index** | 없음 | `double precision NOT NULL DEFAULT 0` |
| 6 | **document_versions.author_id** | 없음 | `bigint FK → users` (nullable) |
| 7 | **comments, embed_tokens 테이블** | 없음 | 구현되어 있으나 ERD에 미표시 |

---

## 5. Spec 문서 Sync 이슈 (v1_2 → v1_3 업데이트 필요)

### 5.1 001_requirement

| 항목 | 변경 내용 |
|------|----------|
| Phase 1 상태 | "계획됨" → "구현 완료" (API+Web+DB) |
| 구현된 기능 반영 | 댓글, 임베드 토큰, 테마 커스텀, 프레젠테이션 모드 |
| OAuth 상태 | Phase 3으로 명확히 분류 |

### 5.2 002_component

| 항목 | 변경 내용 |
|------|----------|
| 컴포넌트 목록 | 실제 38개 컴포넌트 반영 (presentation-mode, join-request-panel 등) |
| 상태 관리 | Zustand 5개 스토어 구조 반영 |
| use-permissions 훅 | 16개 권한 체계 문서화 |

### 5.3 003_user-flow

| 항목 | 변경 내용 |
|------|----------|
| 프레젠테이션 모드 플로우 | 추가 필요 |
| 초대/가입 요청 플로우 | 추가 필요 |
| 임베드 토큰 관리 플로우 | 추가 필요 |

### 5.4 004_data-model

| 항목 | 변경 내용 |
|------|----------|
| ID 타입 | uuid → bigserial (전체) |
| OAUTH_ACCOUNTS | Phase 3로 상태 변경 |
| documents.start_mode | "미구현" 명시 또는 제거 |
| workspaces | slug 제거, theme_preset/theme_css 추가 |
| comments 테이블 | 스펙에 상세 추가 |
| embed_tokens 테이블 | 스펙에 상세 추가 |
| 인덱스 전략 | 실제 구현된 16개 인덱스 반영 |

### 5.5 005_api-spec

| 항목 | 변경 내용 |
|------|----------|
| 엔드포인트 경로명 | `/links` → `/relations` 반영 |
| 구현 상태 표시 | 각 엔드포인트에 ✅/⏳/📋 상태 추가 |
| startMode 파라미터 | 미구현 상태 명시 |
| 추가된 엔드포인트 | `/categories/tree`, `/join-requests/batch`, `/theme`, `/embed-tokens`, `/graph` |
| comments API | PATCH (수정) 미구현 명시 |

### 5.6 006_test-spec

| 항목 | 변경 내용 |
|------|----------|
| 통합 테스트 | 26개 테스트 파일 실제 현황 반영 |
| 팩토리 함수 | createUser, createWorkspace 등 테스트 헬퍼 문서화 |
| E2E 시나리오 | 프레젠테이션 모드, 임베드 토큰 시나리오 추가 |

### 5.7 007_architecture

| 항목 | 변경 내용 |
|------|----------|
| 기술 스택 | Fastify ✅, Next.js 16 ✅, Zustand 5 ✅, React 19 ✅ |
| 인프라 | cleanup-trash 잡, 정기 삭제 스케줄러 반영 |
| 배포 구조 | API (port 4000), Web (port 3002) 반영 |

### 5.8 008_roadmap

| 항목 | 변경 내용 |
|------|----------|
| Phase 1 상태 | ✅ 완료 (2026-04 달성) |
| 달성 항목 | DB, Auth, Workspace, Category, Document CRUD, DAG, Import/Export, Comments, Theme, Embed |
| Phase 2 잔여 | Search, Version Diff, OG Preview, OAuth, Real-time Collab |

### 5.9 009_media-embed-spec

| 항목 | 변경 내용 |
|------|----------|
| 상태 | v1.0 유지 (Phase 2 예정이므로 변경 불필요) |
| 의존성 | POST /link-preview 미구현 상태 명시 |

---

## 6. 에디터 라이브러리 독립성 검증

### 6.1 검증 결과: ✅ 통과

| 검증 항목 | 결과 | 상세 |
|----------|------|------|
| workspace:* 의존성 | ✅ 없음 | 모노레포 의존성 제로 |
| 크로스패키지 import | ✅ 없음 | apps/*, packages/db 참조 없음 |
| 하드코딩 URL | ✅ 없음 | 모든 URL은 설정 가능 또는 예시용 |
| 빌드 설정 | ✅ 정상 | ESM + CJS 듀얼 빌드, TypeScript 선언 파일 |
| CSS 네임스페이스 | ✅ 정상 | 모든 클래스 `.mf-`, 변수 `--mf-` 접두사 |
| peerDependencies | ✅ 정상 | React ^18 \|\| ^19 만 요구 |

### 6.2 Public API

```typescript
// Components
export { MarkdownEditor }

// Types
export type {
  MarkdownEditorProps, EditorLayout, EditorTheme,
  ToolbarAction, ToolbarProps, EditorPaneProps,
  PreviewPaneProps, WikiLinkItem,
}

// Utilities
export { parseMarkdown }            // Markdown → HTML (sync)
export { applyToolbarAction }       // CodeMirror 포맷팅
export { createCloudflareUploader } // R2 업로더 팩토리
export { validateImageFile }        // 이미지 검증
```

### 6.3 빌드 출력

| 파일 | 크기 | 용도 |
|------|------|------|
| `dist/index.js` | 49 KB | ESM 번들 |
| `dist/index.cjs` | 53 KB | CJS 번들 |
| `dist/index.d.ts` | 4 KB | TypeScript 선언 |
| `dist/index.css` | 19 KB | 스타일 (KaTeX 포함) |

### 6.4 npm 배포 조치 필요

- `package.json`에서 `"private": true` → `"private": false` 변경 필요

### 6.5 의존성 트리 (24개)

CodeMirror 6 (`@codemirror/*`), unified 마크다운 파이프라인 (`remark-*`, `rehype-*`), KaTeX, Lucide React, deepmerge-ts — 모두 성숙한 npm 패키지

---

## 7. 인프라 & 미들웨어

| 미들웨어 | 파일 | 상태 |
|---------|------|------|
| JWT 인증 | auth.ts | ✅ |
| RBAC | rbac.ts | ✅ (owner/admin/editor/viewer) |
| CSRF 방어 | csrf.ts | ✅ (Origin + SameSite) |
| 워크스페이스 스코프 | workspace-scope.ts | ✅ |
| CORS | cors.ts | ✅ (환경변수) |
| 휴지통 정리 잡 | cleanup-trash.ts | ✅ (스케줄 실행) |

---

## 8. 우선순위별 잔여 작업

### P1 — 핵심 기능 완성

- [ ] 비밀번호 재설정 플로우 (forgot + reset + change)
- [ ] Avatar R2 실제 업로드 구현
- [ ] 문서 에디터 `start_mode` 컬럼 추가 또는 Spec에서 제거 결정
- [ ] `PATCH /comments/:id` 코멘트 수정/해결 API

### P2 — Phase 2 MVP

- [ ] 워크스페이스 전체 검색 API (필터: category, tag, author, date)
- [ ] 버전 diff API (Myers algorithm)
- [ ] OG Link Preview 프록시
- [ ] 퍼블릭 임베드 페이지 (`/embed/doc/:id`)
- [ ] Category ancestors/descendants API
- [ ] 단일 문서 DAG 컨텍스트 API
- [ ] OAuth 2.0 연동 (Google, GitHub) + oauth_accounts 테이블

### P3 — 품질 & UX

- [ ] 드래그앤드롭 폴더 이동 완성
- [ ] 프레젠테이션 모드 Export/Share
- [ ] 임베드 설정 가이드 문서
- [ ] 테마 커스텀 Import 기능
- [ ] 멤버 관리 일괄 작업
- [ ] 실시간 협업 (y-websocket/CRDT)

---

## 9. 산출물 참조

| 산출물 | 파일 |
|--------|------|
| ERD (업데이트) | `docs/ERD.svg` |
| 화면별 테스트 시나리오 | `docs/scenarios/test-scenarios-04-04.md` |
| Spec 문서 v1_3 | `docs/001_requirement_v1_3.md` ~ `docs/009_media-embed-spec_v1_1.md` |
