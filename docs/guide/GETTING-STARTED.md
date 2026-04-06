# MarkFlow KMS 시작 가이드

## 사전 준비

- **Node.js** 20+
- **pnpm** 10+
- **PostgreSQL** 16+ (로컬 설치)

## 1. PostgreSQL 설정 (최초 1회)

```bash
# postgres 슈퍼유저로 접속
psql -h localhost -p 5432 -U postgres

# 유저 + DB 생성
CREATE USER markflow WITH PASSWORD 'markflow';
CREATE DATABASE markflow OWNER markflow;
GRANT ALL PRIVILEGES ON DATABASE markflow TO markflow;
\q
```

> `.env.local`의 `DATABASE_URL`을 본인 환경에 맞게 수정하세요.

## 2. 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 에디터 패키지 빌드 (최초 1회, 에디터 코드 변경 시)
pnpm --filter @markflow/editor build

# DB 마이그레이션 (최초 1회)
cd packages/db && pnpm drizzle-kit push && cd ../..

# 전체 실행 (API + Web 동시)
pnpm dev
```

> **포트 충돌 시**: `lsof -ti:3002 -ti:4000 | xargs kill -9` 후 재실행

## 3. 접속 정보

| 서비스 | URL | 포트 |
|--------|-----|------|
| 프론트엔드 | http://localhost:3002 | 3002 |
| 백엔드 API | http://localhost:4000/api/v1 | 4000 |
| PostgreSQL | localhost:5432 | 5432 |

## 4. 계정 생성 및 로그인

### 회원가입

1. http://localhost:3002/register 접속
2. 이름, 이메일, 비밀번호 입력 (비밀번호: 8자 이상, 영문+숫자+특수문자)
3. "계정 만들기" 클릭

### 이메일 인증 우회 (개발 환경)

```bash
psql -h localhost -p 5432 -U markflow -d markflow \
  -c "UPDATE users SET email_verified = true WHERE email = '가입한이메일@example.com';"
```

### 로그인

http://localhost:3002/login 에서 가입한 이메일/비밀번호로 로그인

## 5. 환경 변수

루트의 `.env.local` 파일에 설정 (레포에 포함됨):

| 변수 | 설명 | 로컬 기본값 |
|------|------|------------|
| `DATABASE_URL` | PostgreSQL 연결 URL | `postgresql://markflow:markflow@localhost:5432/markflow` |
| `JWT_SECRET` | Access Token 서명 키 | 개발용 고정값 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 | 개발용 고정값 |
| `CORS_ORIGIN` | 허용할 프론트엔드 origin (쉼표 구분) | `http://localhost:3000,http://localhost:3001,http://localhost:3002` |
| `HOST` | API 서버 바인드 주소 | `0.0.0.0` |
| `PORT` | API 서버 포트 | `4000` |

프로덕션 배포 시에는 호스팅 플랫폼의 환경 변수 설정에서 각 값을 지정합니다.

## 6. 주요 기능

### 워크스페이스

- 회원가입 시 "My Notes" 기본 워크스페이스 자동 생성
- 워크스페이스가 1개뿐이면 자동 이동
- "워크스페이스 만들기"로 추가 생성

### 문서 관리

- 워크스페이스 진입 → 문서 목록
- "새 문서" 버튼으로 생성 → 에디터 진입
- 마크다운 작성 → **1초 후 자동 저장**
- 문서 삭제 → 휴지통 (복원 가능)

### 사이드바

- 워크스페이스 셀렉터, 검색 바 (⌘K), 폴더 트리, 네비게이션 (문서/휴지통/멤버/그래프/설정)

## 7. 개발 명령어

```bash
pnpm dev                             # 전체 실행 (API + Web)
pnpm --filter @markflow/api dev      # 백엔드만
pnpm --filter @markflow/web dev      # 프론트엔드만
pnpm --filter @markflow/editor build # 에디터 패키지 빌드
pnpm build                           # 전체 빌드
pnpm test                            # 전체 테스트
pnpm --filter @markflow/web test:e2e # E2E 테스트
```

## 8. DB 스키마

ERD 다이어그램: [docs/ERD.svg](./ERD.svg)

13개 테이블: users, workspaces, workspace_members, documents, document_versions, document_relations, categories, category_closure, tags, document_tags, invitations, join_requests, refresh_tokens

## 9. 트러블슈팅

| 증상 | 해결 |
|------|------|
| "네트워크 오류" | API 서버 미실행 → `pnpm --filter @markflow/api dev` |
| "Module not found: @markflow/editor" | 에디터 빌드 → `pnpm --filter @markflow/editor build` |
| 포트 충돌 (EADDRINUSE) | `lsof -ti:3002 -ti:4000 \| xargs kill -9` |
| DB 연결 실패 | PostgreSQL 실행 확인 → `pg_isready -h localhost -p 5432` |
| "이메일 인증 필요" | `psql -U markflow -d markflow -c "UPDATE users SET email_verified = true;"` |
