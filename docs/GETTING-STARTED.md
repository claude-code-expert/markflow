# MarkFlow KMS 시작 가이드

## 사전 준비

- **Node.js** 20+
- **pnpm** 10+
- **Docker** (PostgreSQL, Redis)

## 1. 설치 및 실행

```bash
# 의존성 설치
pnpm install

# Docker 서비스 시작 (PostgreSQL + Redis)
docker compose up -d

# 에디터 패키지 빌드 (최초 1회, 에디터 코드 변경 시)
pnpm --filter @markflow/editor build

# DB 마이그레이션 (최초 1회)
cd packages/db && pnpm drizzle-kit push && cd ../..

# 전체 실행 (API + Web 동시)
pnpm dev
```

> **포트 충돌 시**: 이전 프로세스가 남아있으면 아래 명령으로 정리 후 재실행
> ```bash
> lsof -ti:3002 -ti:4000 | xargs kill -9 2>/dev/null
> pnpm dev
> ```

## 2. 접속 정보

| 서비스 | URL | 포트 |
|--------|-----|------|
| 프론트엔드 | http://localhost:3002 | 3002 |
| 백엔드 API | http://localhost:4000/api/v1 | 4000 |
| PostgreSQL | localhost:5433 | 5433 (호스트) → 5432 (컨테이너) |
| Redis | localhost:6379 | 6379 |

## 3. 계정 생성 및 로그인

### 회원가입

1. http://localhost:3002/register 접속
2. 이름, 이메일, 비밀번호 입력 (비밀번호: 8자 이상, 영문+숫자+특수문자)
3. "계정 만들기" 클릭

### 이메일 인증 우회 (개발 환경)

개발 환경에서는 이메일 발송이 없으므로 DB에서 직접 인증 처리:

```bash
docker exec -it markflow-postgres psql -U markflow -d markflow \
  -c "UPDATE users SET email_verified = true WHERE email = '가입한이메일@example.com';"
```

### 로그인

http://localhost:3002/login 에서 가입한 이메일/비밀번호로 로그인

## 4. 주요 기능

### 워크스페이스

- 로그인 후 워크스페이스 목록이 표시됨
- 회원가입 시 "My Notes" 기본 워크스페이스가 자동 생성됨
- "워크스페이스 만들기"로 추가 생성 가능
- 워크스페이스가 1개뿐이면 자동으로 해당 워크스페이스로 이동

### 문서 관리

- 워크스페이스 진입 → 문서 목록 표시
- "새 문서" 버튼으로 문서 생성 → 에디터 진입
- 에디터에서 마크다운 작성 → **1초 후 자동 저장**
- 저장 상태: 헤더 우측에 "저장됨" / "저장 중..." / "저장 실패" 표시
- 문서 삭제 → 휴지통으로 이동 (복원 가능)

### 사이드바

- 워크스페이스 셀렉터: 클릭하면 워크스페이스 목록으로 이동
- 검색 바: 문서 검색 (⌘K 단축키)
- 폴더 트리: 카테고리별 문서 분류
- 네비게이션: 문서, 휴지통, 멤버, 그래프, 설정

### 워크스페이스 설정

- 설정 페이지: 이름 변경, 공개/비공개 전환
- 멤버 관리: 이메일 초대, 역할 변경 (소유자/관리자/편집자/뷰어)

## 5. 환경 변수

`apps/api/.env` (이미 설정됨):

```env
DATABASE_URL=postgresql://markflow:markflow@localhost:5433/markflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=<자동생성>
JWT_REFRESH_SECRET=<자동생성>
CORS_ORIGIN=http://localhost:3002
HOST=0.0.0.0
PORT=4000
```

프론트엔드는 별도 `.env` 불필요 (기본값 `http://localhost:4000/api/v1` 사용).

## 6. 개발 명령어

```bash
# 전체 실행
pnpm dev

# 개별 실행
pnpm --filter @markflow/api dev      # 백엔드만
pnpm --filter @markflow/web dev      # 프론트엔드만
pnpm --filter @markflow/editor dev   # 에디터 watch 빌드

# 빌드
pnpm build                           # 전체 빌드
pnpm --filter @markflow/editor build # 에디터 패키지만

# 테스트
pnpm test                            # 전체 테스트
pnpm --filter @markflow/web test:e2e # E2E 테스트 (서버 실행 중이어야 함)

# Docker 관리
docker compose up -d                 # 시작
docker compose down                  # 중지
docker compose down -v               # 중지 + 데이터 삭제
```

## 7. 디자인 참조

프로토타입 HTML을 브라우저에서 열어 디자인을 참조할 수 있습니다:

```bash
open docs/markflow-prototype.html
```

### 디자인 토큰

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg` | #F8F7F4 | 배경 |
| `--accent` | #1A56DB | 주요 액센트 |
| `--text` | #1A1916 | 본문 텍스트 |
| `--header-h` | 56px | 헤더 높이 |
| `--sidebar-w` | 260px | 사이드바 폭 |

### 폰트

| 용도 | 폰트 |
|------|------|
| 본문 | DM Sans |
| 헤딩 | Sora |
| 코드 | JetBrains Mono |

## 8. 트러블슈팅

### "네트워크 오류" → API 서버 미실행
```bash
pnpm --filter @markflow/api dev
```

### "Module not found: @markflow/editor" → 에디터 빌드 필요
```bash
pnpm --filter @markflow/editor build
```

### 포트 충돌 (EADDRINUSE)
```bash
lsof -ti:3002 -ti:4000 | xargs kill -9 2>/dev/null
```

### DB 연결 실패 → Docker 미실행
```bash
docker compose up -d
```

### 로그인 실패 "이메일 인증 필요"
```bash
docker exec -it markflow-postgres psql -U markflow -d markflow \
  -c "UPDATE users SET email_verified = true;"
```
