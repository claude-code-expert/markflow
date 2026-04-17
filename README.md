# MarkFlow KMS

마크다운 기반 팀 지식 관리 플랫폼 (Knowledge Management System).

## 화면 미리보기

### 1. 로그인
![로그인 화면](./apps/web/public/image/0.png)

### 2. 워크스페이스
![워크스페이스 화면](./apps/web/public/image/1.png)

### 3. 문서 목록
![문서 목록 화면](./apps/web/public/image/2.png)

### 4. 상세 보기
![문서 상세 보기 화면](./apps/web/public/image/3.png)

### 5. 문서 작성하기
![문서 작성 화면](./apps/web/public/image/4.png)

## 구조

```
markflow/
├── packages/
│   ├── editor/          @markflow/editor — 독립 에디터 컴포넌트 (npm 배포 가능)
│   └── db/              @markflow/db — Drizzle ORM 스키마 + 마이그레이션 + SCHEMA.sql
├── apps/
│   ├── web/             @markflow/web — Next.js 16 프론트엔드 (App Router)
│   ├── api/             @markflow/api — Fastify 5 백엔드 API
│   ├── worker/          Cloudflare R2 이미지 업로드 Worker (선택)
│   └── demo/            에디터 데모 앱
└── docs/                설계 문서, 프로토타입, ERD
```

## 로컬 에디터 기능 테스트

```bash
./scripts/item-test.sh all        # 전체 28개
./scripts/item-test.sh bold       # Bold만
./scripts/item-test.sh strike     # Strikethrough만
./scripts/item-test.sh list       # UL+OL+Task 전체
./scripts/item-test.sh int        # 통합 테스트 (22개 한 문서)
./scripts/item-test.sh help       # 전체 명령어 목록
```

### 사전 준비

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- PostgreSQL 16+

### 1. PostgreSQL 설정 (최초 1회)

```bash
psql -h localhost -p 5432 -U postgres
```

```sql
CREATE USER markflow WITH PASSWORD 'markflow';
CREATE DATABASE markflow OWNER markflow;
GRANT ALL PRIVILEGES ON DATABASE markflow TO markflow;
\q
```

### 2. 환경 변수

루트의 `.env.local` 파일에 설정되어 있습니다. 본인 환경에 맞게 수정하세요:

```env
DATABASE_URL=postgresql://markflow:markflow@localhost:5432/markflow
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
HOST=0.0.0.0
PORT=4000
```

### 3. 설치 및 실행

```bash
pnpm install
pnpm --filter @markflow/editor build   # 에디터 빌드 (최초 1회)

# DB 부트스트랩 — 둘 중 하나 선택
psql "$DATABASE_URL" -f packages/db/SCHEMA.sql      # (a) 빈 DB에 한 번에 생성
cd packages/db && pnpm drizzle-kit push && cd ../.. # (b) Drizzle로 점진 적용

pnpm dev                                # API + Web 동시 실행
```

http://localhost:3002 에서 접속.

### 4. 계정 생성

1. http://localhost:3002/register 에서 회원가입
2. 이메일 인증 우회:
   ```bash
   psql -h localhost -p 5432 -U markflow -d markflow \
     -c "UPDATE users SET email_verified = true;"
   ```
3. http://localhost:3002/login 에서 로그인

## 프로덕션 환경 변수

### API 서버 (`apps/api`)

| 변수 | 설명 | 생성 방법 |
|------|------|----------|
| `DATABASE_URL` | PostgreSQL 연결 URL | DB 호스팅 서비스에서 제공 (Supabase, Neon, RDS 등) |
| `JWT_SECRET` | Access Token 서명 키 | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 | `openssl rand -hex 32` (JWT_SECRET과 다른 값) |
| `CORS_ORIGIN` | 프론트엔드 도메인 (쉼표 구분) | 예: `https://markflow.vercel.app` |
| `HOST` | API 바인드 주소 | `0.0.0.0` |
| `PORT` | API 포트 | 호스팅 플랫폼 기본값 또는 `4000` |

### 웹앱 (`apps/web`)

| 변수 | 설명 | 예시 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | API 서버 베이스 URL | `https://api.markflow.dev/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 도메인 (sitemap/SEO) | `https://markflow.vercel.app` |
| `NEXT_PUBLIC_R2_WORKER_URL` | (선택) 이미지 업로드 Worker | `https://r2-uploader.<id>.workers.dev` |

> `pnpm start`(프로덕션)는 `.env.local`을 읽지 않고 시스템 환경 변수만 사용합니다.

## 배포 아키텍처

Fastify는 long-running 서버라서 Vercel Serverless에는 부적합합니다. 분리 배포를 권장합니다.

| 컴포넌트 | 권장 호스팅 |
|---|---|
| `apps/web` (Next.js) | **Vercel** — Root Directory `apps/web`, build 시 `@markflow/editor` 먼저 빌드 |
| `apps/api` (Fastify) | **Railway / Render / Fly.io** — Docker 또는 Node 런타임 |
| PostgreSQL | **Supabase / Neon / Vercel Postgres** |
| `apps/worker` | **Cloudflare Workers** + R2 버킷 |

## 명령어

```bash
pnpm dev                             # 전체 실행 (API + Web)
pnpm build                           # 전체 빌드
pnpm test                            # 전체 테스트
pnpm --filter @markflow/api dev      # 백엔드만
pnpm --filter @markflow/web dev      # 프론트엔드만
pnpm --filter @markflow/editor build # 에디터 패키지 빌드
pnpm --filter @markflow/web test:e2e # E2E 테스트
```

## 패키지

### @markflow/editor

독립형 React Markdown 에디터 컴포넌트. 어떤 React 18+ 프로젝트에든 이식 가능.

- CodeMirror 6 (소스 편집기)
- remark + rehype (마크다운 파싱/렌더링)
- KaTeX (수식), rehype-highlight (코드 하이라이팅)
- rehype-sanitize (XSS 방어)

### @markflow/db

Drizzle ORM 기반 DB 스키마. 15개 테이블 (users, workspaces, workspace_members, categories, category_closure, documents, document_versions, document_relations, tags, document_tags, comments, invitations, join_requests, embed_tokens, refresh_tokens). 신규 환경 부트스트랩은 [SCHEMA.sql](./packages/db/SCHEMA.sql), 점진 마이그레이션은 `src/migrations/*.sql` 사용. ERD: [docs/ERD.svg](./docs/ERD.svg)

### @markflow/web

Next.js 16 프론트엔드. Zustand (상태), React Query (서버 상태), Tailwind CSS 4.

### @markflow/api

Fastify 5 백엔드 API. JWT 인증, RBAC (소유자/관리자/편집자/뷰어), 문서 CRUD + 버전 관리.

## 문서

| 문서 | 설명 |
|------|------|
| [packages/db/SCHEMA.sql](./packages/db/SCHEMA.sql) | 통합 DB 부트스트랩 SQL (15개 테이블 + FK + 인덱스) |
| [docs/ERD.svg](./docs/ERD.svg) | 데이터베이스 ER 다이어그램 |
| [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) | 프로젝트 구조 상세 |
| [docs/markflow-prototype.html](./docs/markflow-prototype.html) | UI 프로토타입 |
