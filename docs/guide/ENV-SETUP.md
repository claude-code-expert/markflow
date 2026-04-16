# 로컬 개발 환경변수 설정

## 위치

루트 모노레포 디렉토리에 `.env.local` 파일로 저장합니다.

```
/Users/edell/Project/AI-Project/makrflow/.env.local
```

## 파일 내용 (복사 후 그대로 저장)

```env
DATABASE_URL=postgres://markdown:password@localhost:5432/markdown_web
HOST=0.0.0.0
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
JWT_SECRET=8e718bf2d3fa38ba23b78ce3bf23dc642be675d7563070fd7d99c5957f228e06
JWT_REFRESH_SECRET=1cf07b27734ba544f411deb706b8cbb0606d7a22629de5b52ec4d53cd7b0e184
EMAIL_FROM=noreply@markflow.app
```
- openssl rand -hex 32


## 작성 시 주의사항

- 각 라인 맨 앞에 **공백 없이** `KEY=VALUE` 형식으로 시작
- 인코딩: **UTF-8 (BOM 없음)**
- 개행: **LF** (Windows CRLF ❌)
- 주석(`#`)에 em dash(`—`)나 한글 특수기호 넣지 않기 (Node `--env-file` 파서가 혼동될 수 있음)
- 값에 `<`, `>`, 공백 있으면 파싱 실패 가능 → 단순화 권장

## 변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 접속 문자열. 비번에 특수문자 있으면 URL 인코딩 |
| `JWT_SECRET` | ✅ | Access token 서명 키 (64자 hex 권장) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token 서명 키 (64자 hex 권장) |
| `HOST` | ❌ | 기본 `0.0.0.0` |
| `PORT` | ❌ | 기본 `4000` |
| `NODE_ENV` | ❌ | `development` / `production` |
| `FRONTEND_URL` | ❌ | 이메일 링크 기준 URL. 기본 `http://localhost:3000` |
| `CORS_ORIGIN` | ❌ | 허용 오리진 (콤마 구분). 기본 `http://localhost:3000` |
| `EMAIL_FROM` | ❌ | 발신자 이메일 |
| `RESEND_API_KEY` | ❌ | Resend 이메일 API 키 (이메일 기능 사용 시) |

## 시크릿 재생성 (필요 시)

```bash
node -e "const c=require('crypto'); console.log('JWT_SECRET='+c.randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET='+c.randomBytes(32).toString('hex'))"
```

## 반영 후 API 재기동

`tsx watch`는 `.env.local` 변경을 자동 감지하지 않습니다 — **반드시 수동 재기동**.

```bash
# 기존 dev 터미널에서
Ctrl + C

# 다시 시작
pnpm dev
```

## 검증

```bash
node --env-file=/Users/edell/Project/AI-Project/makrflow/.env.local \
  -e "['DATABASE_URL','JWT_SECRET','JWT_REFRESH_SECRET'].forEach(k => console.log(k, process.env[k] ? 'OK('+process.env[k].length+')' : 'MISS'))"
```

기대 출력:
```
DATABASE_URL OK(57)
JWT_SECRET OK(64)
JWT_REFRESH_SECRET OK(64)
```

## 보안 주의

- `.env.local`은 `.gitignore`에 반드시 포함 (커밋 금지)
- `password`는 로컬 전용 — 운영 환경에서는 강한 비밀번호 사용
- JWT 시크릿은 샘플 값 재사용 금지 — 운영 배포 시 새로 생성
