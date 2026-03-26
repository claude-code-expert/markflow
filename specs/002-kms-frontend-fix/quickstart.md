# Quickstart: KMS 프론트엔드 버그 수정 및 UI 재정비

**Branch**: `002-kms-frontend-fix`

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (PostgreSQL용)
- 백엔드 서버(`apps/api`)가 실행 중이어야 함

## Setup

```bash
# 1. 브랜치 체크아웃
git checkout 002-kms-frontend-fix

# 2. 의존성 설치
pnpm install

# 3. Docker로 PostgreSQL 실행
docker compose up -d

# 4. 환경 변수 확인
# apps/api/.env 에 DB 연결, JWT 시크릿 등 설정 필요

# 5. DB 마이그레이션 (최초 1회)
cd packages/db && pnpm drizzle-kit push && cd ../..

# 6. 백엔드 실행
pnpm --filter @markflow/api dev

# 7. 프론트엔드 실행 (별도 터미널)
pnpm --filter @markflow/web dev
```

## Access

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3002 | 3002 |
| Backend API | http://localhost:4000/api/v1 | 4000 |
| PostgreSQL | localhost:5433 | 5433 |

## Test

```bash
# Unit tests
pnpm --filter @markflow/web test

# E2E tests (프론트엔드 + 백엔드 실행 중이어야 함)
pnpm --filter @markflow/web test:e2e
```

## Key Files to Modify

| Priority | File | Description |
|----------|------|-------------|
| P1 | `stores/workspace-store.ts` | API 응답 파싱 버그 수정 |
| P1 | `app/globals.css` | 프로토타입 디자인 토큰 추가 |
| P1 | `app/layout.tsx` | 폰트 로딩 (DM Sans, Sora, JetBrains Mono) |
| P1 | `app/(app)/layout.tsx` | 앱 셸 그리드 레이아웃 |
| P1 | `app/(app)/page.tsx` | 워크스페이스 목록 + 자동 리다이렉트 |
| P1 | `components/sidebar.tsx` | 프로토타입 디자인 사이드바 |
| P1 | `app/(auth)/login/page.tsx` | 로그인 디자인 재정비 |
| P1 | `app/(app)/[workspaceSlug]/docs/page.tsx` | 문서 목록 |
| P1 | `app/(app)/[workspaceSlug]/docs/[docId]/page.tsx` | 에디터 + 자동 저장 |
| P2 | `components/create-workspace-modal.tsx` | 워크스페이스 생성 |
| P2 | `app/(app)/[workspaceSlug]/settings/page.tsx` | 설정 페이지 |

## Design Reference

프로토타입 HTML: `docs/markflow-prototype.html` (브라우저에서 열어 참조)

핵심 디자인 토큰:
- Background: `#F8F7F4`
- Accent blue: `#1A56DB`
- Text: `#1A1916`
- Header: 56px
- Sidebar: 260px
- Font: DM Sans (body), Sora (headings), JetBrains Mono (code)
