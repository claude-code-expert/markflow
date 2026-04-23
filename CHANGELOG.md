# Changelog

## [0.4.0] - 2026-04-23

Fastify API 서버를 Next.js App Router API Routes로 완전 통합. 단일 Vercel 프로젝트 배포.

### API 마이그레이션 (Fastify → Next.js)

별도 Fastify 서버(`apps/api/`)를 제거하고 Next.js App Router의 Route Handlers로 전환.

- **feat: 서버 인프라** — 서비스 17개 + 유틸 7개를 `apps/web/lib/server/`로 이동, DB 싱글턴(serverless 최적화 `max:3, idle_timeout:20`), 미들웨어 래퍼(`extractCurrentUser`, `checkRole`, `handleApiError`)
- **feat: API 라우트 50개** — Fastify 17개 라우트 파일 → Next.js `route.ts` 50개로 변환 (Auth 8, Users 2, Workspaces 6, Documents 4, Categories 6, Relations 1, Tags 2, Comments 2, Graph 2, Import/Export 3, Trash 3, Theme 1, Embed Tokens 2, Upload Token 1, Invitations 3, Join Requests 3, Cron 1)
- **refactor: API_BASE 변경** — `NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'` → `/api/v1` (Same-origin, CORS 불필요)
- **chore: Fastify 제거** — `apps/api/` 전체 삭제 (소스, 테스트, 설정), `apps/demo/` 삭제 (에디터 데모 앱)
- **fix: 에러 로깅 개선** — `handleApiError`에서 Error 객체의 message/stack을 정확히 로깅

### 에디터 개선

- **fix: 툴바 단축키 툴팁 제거** — 미등록 단축키(Ctrl+B, Ctrl+I 등) 참조를 풍선 도움말에서 제거
- **fix: wordCount 테스트** — 인라인 스텁(`return 0`)을 실제 `countWords` 모듈 import로 교체, 55개 테스트 전체 통과
- **fix: 이미지 저장소 설정 UX** — 스토리지 설정 저장 시 문서 자동저장 후 새로고침 없이 즉시 업로드 활성화 (`uploadConfigVersion` 상태 도입)

### 이미지 업로드 가이드 & CORS

- **docs: R2 CORS 정책 가이드** — 이미지 업로드 설정 가이드에 R2 CORS 정책 설정 단계 추가 (6→7단계), JSON 예제 + 흔한 실수 안내 (origin 문자열 합치기 금지)
- **fix: Worker CORS** — `wrangler.toml`에 `ALLOWED_ORIGINS` 설정 (`localhost:3002`, `markflow.dev`)
- **docs: Worker 재배포 안내** — 설정 변경 후 반드시 `npx wrangler deploy` 필요 안내 추가

### SEO

- **fix: OG 이미지 중복 제거** — `layout.tsx`의 `openGraph.images`/`twitter.images` 제거 (동적 `opengraph-image.tsx` 생성기가 우선)
- **feat: 누락 페이지 메타데이터** — `forgot-password`, `reset-password` 페이지에 title/description 추가
- **fix: sitemap** — `/forgot-password` URL 추가

### 테스트

- **test: E2E 에디터 툴바** — Playwright 25개 케이스 (로그인 → 에디터 진입 → 툴바 클릭 → 마크다운 삽입 + 프리뷰 렌더링 검증)
- **fix: playwright.config** — baseURL/port를 3002로 수정

### 정리

- **chore: .bak 파일 57개 삭제** — 소스코드, 설정, 문서, planning 디렉토리 전체
- **chore: localhost:4000 하드코딩 제거** — `layout.tsx`, `import-export-modal.tsx`
- **chore: dev 스크립트 정리** — 루트 `package.json`에서 port 4000 참조 제거
- **chore: FRONTEND_URL 업데이트** — `process.env.FRONTEND_URL` → `process.env.NEXT_PUBLIC_SITE_URL`, 기본값 `localhost:3002`
- **chore: .gitignore** — `playwright-report/`, `test-results/`, `*.bak` 추가

### Vercel 배포 트러블슈팅

모노레포 구조에서 Vercel 배포 시 발생한 문제와 해결 과정 기록.

**문제 1: `apps/web` Root Directory + npm 자동 선택**
- 증상: `npm install` 실행 → `workspace:*` 프로토콜 미지원 에러
- 원인: Root Directory를 `apps/web`으로 설정하면 Vercel이 루트의 `pnpm-lock.yaml`을 감지하지 못해 npm으로 폴백
- 시도: Install Command를 `pnpm install`로 Override → `ERR_INVALID_THIS` 에러 (Vercel 빌드 환경의 pnpm/Node.js 버전 호환 문제)

**문제 2: 빌드 캐시로 인한 유령 배포**
- 증상: 빌드 168ms 완료, 실제 빌드 없음, 404 반환
- 원인: 이전 실패 배포의 빌드 캐시가 재사용됨
- 해결: "Use Existing Build Cache" 체크 해제 후 Redeploy

**문제 3: Framework Preset 미감지**
- 증상: Root Directory를 루트(`/`)로 변경 → 빌드는 되지만 404 반환
- 원인: `next.config.ts`가 `apps/web/`에 있어 Vercel이 Next.js 프로젝트로 인식 못함

**최종 해결:**
| 설정 | 값 |
|------|------|
| Root Directory | (비워두기 — 프로젝트 루트) |
| Framework Preset | Next.js (수동 선택) |
| Build Command | `pnpm --filter @markflow/db build && pnpm --filter @markflow/editor build && cd apps/web && next build` |
| Output Directory | `apps/web/.next` |
| Install Command | Override OFF (자동 — 루트 `pnpm-lock.yaml` 감지) |

**핵심 교훈:** pnpm 모노레포에서 Vercel 배포 시 Root Directory를 하위 앱으로 설정하면 패키지 매니저 감지가 실패한다. 루트에 두고 Framework Preset/Build Command/Output Directory를 명시적으로 지정해야 한다.

---

## [0.3.0] - 2026-04-14

Phase 1.1(이메일 서비스), Phase 2(테스트 커버리지), Phase 3(카테고리/문서 컨텍스트 API)를 포함하는 릴리스.

### Phase 1.1: Email Service & Resend Verification API

Resend SDK 기반 이메일 발송 인프라 구축 및 이메일 재인증 API 추가.

- **feat: 이메일 유틸리티** — Resend SDK 연동, HTML 템플릿, XSS 방어(`escapeHtml`)
- **feat: 인증 이메일 재발송 API** — `POST /resend-verification`, 10req/15min 레이트 리밋
- **feat: 회원가입/인증 페이지 연동** — verify-email 페이지 GET 전환, 회원가입 후 인증 링크 안내
- **fix: verify-email HTTP 메서드** — POST → GET 수정 (CR-01)
- **fix: 이메일 템플릿 URL 파라미터 이스케이프** — HTML injection 방어 (WR-01)
- **fix: 로그인 라우트 타입 안전성** — Fastify generic 타입 파라미터 사용 (WR-03)

### Phase 2: Test Coverage

Phase 1 변경사항 검증을 위한 통합/유닛 테스트 추가.

- **test: 댓글 CRUD 통합 테스트** — 7개 시나리오, 13개 테스트 (생성/조회/수정/삭제/해결/권한/스레딩)
- **test: 이미지 업로드 클라이언트 검증** — imageValidation 타입/크기 테스트, cloudflareUploader CORS/성공/에러 테스트
- **chore: editor 패키지 vitest 설정** 추가
- **feat: factory 헬퍼** — `createDocument()`, `createComment()` 추가

### Phase 3: Category & Document Context API

카테고리 계층 탐색과 문서 관계 DAG 컨텍스트를 read-only API로 노출.

- **feat: 카테고리 Ancestors API** — `GET /workspaces/:wsId/categories/:id/ancestors` (Root→Leaf 순서, 풀 카테고리 객체)
- **feat: 카테고리 Descendants API** — `GET /workspaces/:wsId/categories/:id/descendants` (nested tree + 소속 문서)
- **feat: 문서 DAG Context API** — `GET /workspaces/:wsId/graph/documents/:id/context` (incoming/outgoing/related 3분류, title+categoryName+tags)
- **test:** 17개 통합 테스트 (ancestors 5 + descendants 5 + DAG context 7)

### Chore

- **chore: .gitignore** — `.env.local`, `**/.mcp.json` 추적 제외

---

## [0.2.0] - 2026-04-03

### API 보완

- **fix: 문서 태그 GET 엔드포인트 추가** — `GET /workspaces/:wsId/documents/:docId/tags` 누락으로 태그가 로드되지 않던 문제 해결
- **feat: 문서 카테고리 이동 API** — `PATCH /documents/:id` Body에 `categoryId` 필드 추가, 문서를 다른 폴더로 이동 가능
- **fix: 버전 히스토리 content 반환** — `getVersions()`가 `content`를 포함하도록 수정, diff 기능 활성화
- **fix: 로그인 에러 코드 정규화** — `UNAUTHORIZED` → `INVALID_CREDENTIALS` / `EMAIL_NOT_VERIFIED` / `ACCOUNT_LOCKED`로 세분화, 프론트엔드 에러 메시지 매칭

### 프론트엔드 버그 수정

- **fix: NewFolderModal/FolderContextMenu slug→ID** — workspace slug 대신 UUID를 API 경로에 사용하도록 수정 (RBAC 403 해결)
- **fix: TagInput queryKey/deps 불일치** — `wsKey`로 통일, useCallback 의존성 배열 수정
- **fix: SearchModal useRef 초기값** — React 19 호환을 위해 `useRef<T>(undefined)` 초기값 추가
- **fix: DocumentLinksModal relations 400 오류** — `prev`/`next`가 null일 때 `undefined`로 전달하여 JSON에서 제외

### UI 개선

- **feat: 문서 에디터 헤더 재구성** — 버전 기록(History), 문서 속성(PanelRight) 아이콘을 제목 줄 우측에 배치
- **feat: 에디터 컨트롤 메타 줄 이동** — 테마 토글, 레이아웃 스위처(에디터/분할/미리보기)를 메타 줄 우측으로 이동, 에디터 내부 `.mf-toolbar-spacer` 숨김
- **feat: 인라인 카테고리 선택** — 제목 인풋 좌측에 FolderOpen + select 드롭다운, 새 문서 모달 제거 후 바로 에디터로 이동
- **feat: 헤더 공통 새 문서 아이콘** — AppHeader에 FilePlus 아이콘 추가, 클릭 시 즉시 문서 생성 + 네비게이션
- **feat: 이전/다음 문서 UI 개선** — 좌/우 정렬, 높이 36px, 최대 너비 200px, 호버 툴팁
- **feat: 모든 모달 배경색/블러 제거** — 5개 모달에서 `bg-black/35`, `backdrop-blur-sm` 제거
- **feat: 공통 토스트 알림** — 문서 저장, 카테고리 변경, 태그 저장 시 성공/실패 토스트 표시
- **feat: 사이드바 폴더 섹션** — "문서" → "폴더"로 변경, + 아이콘 ↔ ChevronDown 토글
- **feat: 문서 목록 리스트형 기본** — 기본 뷰 모드 list, 페이지당 10개 기본, 10/20/50 선택, 하단 "더보기" 버튼
- **feat: 태그 입력 포커스 유지** — 엔터로 태그 추가 후 입력 필드에 포커스 복원

### 프리젠테이션 모드

- **feat: 프리젠테이션 모드 구현** — `/present/[slug]/[docId]` 별도 라우트, 새 창으로 열림
- Fullscreen API로 브라우저 전체화면 (주소창/탭/즐겨찾기 숨김)
- 폰트 크기 3단계 (기본 16px / 중간 20px / 크게 24px), 너비 비례 확장
- 하단 독 바: 마우스 하단 이동 시 표시, 화면 클릭 시 닫힘
- 펜 모드: Canvas 드로잉, 색상 6종, 굵기 4단계
- 우측 목차 패널: H1/H2 추출, 클릭 시 앵커 스크롤 이동
- ESC 1회 전체화면 해제, 2회 창 닫기

### 테스트

- **test: KMS 전체 플로우 통합 테스트** — 9개 Phase (폴더 CRUD, 문서 CRUD, 태그 5개, 카테고리 이동, 문서 관계, 버전 히스토리, 그래프, 삭제/복원, 카테고리 제약) 통과
