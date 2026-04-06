# 이미지 업로드 설정 가이드

> Cloudflare R2 Worker를 통한 이미지 업로드 설정 절차 및 화면 구성

---

## 개요

MarkFlow 에디터와 프로필 아바타에서 이미지를 업로드하려면 Cloudflare R2 저장소를 연결해야 합니다.
업로드 흐름은 **클라이언트 → R2 Worker → R2 버킷** 구조이며, Worker URL을 앱에 등록하면 즉시 사용할 수 있습니다.

### 아키텍처

```
브라우저 (에디터/아바타)
  │  FormData POST (file)
  ▼
R2 Worker (apps/worker)
  │  R2 PUT
  ▼
Cloudflare R2 Bucket (markflow-images)
  │
  ▼
Public URL 반환 → 마크다운/DB에 저장
```

### 검증 규칙

| 구분 | 허용 형식 | 최대 크기 |
|------|----------|----------|
| 에디터 이미지 | PNG, JPEG, GIF, WebP, SVG | 10MB |
| 아바타 | JPG, PNG, WebP | 5MB |

---

## 설정 절차

### Step 1. Cloudflare 가입

Cloudflare 무료 계정을 생성합니다.

- https://dash.cloudflare.com/sign-up

### Step 2. Wrangler CLI 로그인

```bash
npx wrangler login
```

브라우저에서 Cloudflare 계정 인증 후 CLI가 연동됩니다.

### Step 3. R2 버킷 생성

```bash
npx wrangler r2 bucket create markflow-images
```

> **참고:** 이후 단계에서 `bucket not found` 에러가 발생하면 이 단계를 먼저 실행하세요.

### Step 4. 퍼블릭 액세스 활성화 + PUBLIC_URL 설정

1. [Cloudflare 대시보드](https://dash.cloudflare.com)에 로그인
2. 좌측 메뉴 **Storage & Databases** → **R2 Object Storage**
3. 생성한 **markflow-images** 버킷 선택 → **Settings** 탭
4. **Public Development URL** → **Allow Access** 활성화
5. 표시된 URL을 `apps/worker/wrangler.toml`의 `PUBLIC_URL`에 입력

```toml
# apps/worker/wrangler.toml

[vars]
PUBLIC_URL = "https://pub-YOUR_BUCKET_ID.r2.dev"
```

### Step 5. Worker 배포

```bash
cd apps/worker
npx wrangler deploy
```

배포 완료 후 터미널에 Worker URL이 출력됩니다.

```
ex) https://markflow-r2-uploader.account-id.workers.dev
```

### Step 6. 앱에 Worker URL 등록

두 가지 방법 중 하나를 선택합니다.

#### 방법 A — 환경 변수 (권장, 팀 공유 시)

`.env.local` 파일에 추가:

```env
NEXT_PUBLIC_R2_WORKER_URL=https://markflow-r2-uploader.account-id.workers.dev
```

> 환경 변수가 설정되면 앱 UI에서 URL 입력이 비활성화되고 "환경 변수로 설정 완료됨"이 표시됩니다.

#### 방법 B — 앱 UI에서 직접 입력 (개인 사용 시)

1. 문서 에디터 상단 툴바에서 **HardDrive 아이콘** (이미지 저장소) 클릭
2. 또는 에디터에서 이미지 업로드 시도 시 자동으로 설정 패널이 열림
3. Step 6 "Worker URL 입력"에 URL 붙여넣기
4. **연결 테스트** 클릭 → 성공 토스트 확인
5. **저장** 클릭

> URL은 `localStorage`의 `mf-cf-worker-url` 키에 저장됩니다.
> 우선순위: 환경 변수 > localStorage

---

## 화면 구성

### 이미지 저장소 설정 패널 (StorageGuidePanel)

문서 에디터 우측에 독립 오버레이로 열리는 420px 폭의 사이드 패널입니다.

```
파일: apps/web/components/storage-guide-panel.tsx
위치: 문서 에디터 페이지 (apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx)
```

#### 진입 경로

| 경로 | 동작 |
|------|------|
| 에디터 상단 툴바 HardDrive 아이콘 | 패널 토글 (열기/닫기) |
| 에디터 툴바 "Upload image" 버튼 (Worker 미설정 시) | 패널 열기 |
| 에디터에서 이미지 드래그/붙여넣기 (Worker 미설정 시) | 패널 열기 |
| "이미지 업로드를 사용하려면 저장소 설정이 필요합니다" 배너 | 패널 열기 |

#### 패널 구성

```
┌─────────────────────────────────┐
│ 🔵 이미지 업로드 설정  R2 무료  ✕ │  ← 헤더 (1줄)
├─────────────────────────────────┤
│ 이미지를 에디터에 업로드하려면...  │  ← 설명
│                                 │
│ ① Cloudflare 가입               │  ← Step 1
│   무료 계정 생성 → cloudflare.com│
│                                 │
│ ② Wrangler 로그인               │  ← Step 2
│   ┌──────────────────────┐ [복사]│
│   │ npx wrangler login   │      │
│   └──────────────────────┘      │
│                                 │
│ ③ R2 버킷 생성                  │  ← Step 3
│   ┌──────────────────────┐ [복사]│
│   │ npx wrangler r2 ...  │      │
│   └──────────────────────┘      │
│   ⚠ bucket not found 시 ...     │
│                                 │
│ ④ 퍼블릭 액세스 + PUBLIC_URL     │  ← Step 4
│   1. Cloudflare 대시보드 로그인  │
│   2. Storage & Databases → R2   │
│   3. markflow-images → Settings │
│   4. Public Dev URL 활성화      │
│   5. URL → wrangler.toml        │
│   ⚠ apps/worker/ 폴더에 있습니다│
│   ex) PUBLIC_URL = "https://..."│
│                                 │
│ ⑤ Worker 배포                   │  ← Step 5
│   ┌──────────────────────┐ [복사]│
│   │ cd apps/worker       │      │
│   │ npx wrangler deploy  │      │
│   └──────────────────────┘      │
│   ex) https://...workers.dev    │
│                                 │
│ ⑥ Worker URL 입력               │  ← Step 6
│   ┌──────────────────────┐      │
│   │ https://...workers.dev│      │
│   └──────────────────────┘      │
│   [연결 테스트] [저장]           │
└─────────────────────────────────┘
```

#### 상태별 동작

| 상태 | 동작 |
|------|------|
| 환경 변수 설정됨 | "환경 변수로 설정 완료됨" 표시, 입력 비활성화 |
| URL 미입력 | 연결 테스트 버튼 비활성화 |
| 테스트 중 | 스피너 + "테스트 중" 표시 |
| 테스트 성공 | 토스트 "연결 테스트 성공 — 저장 버튼을 눌러주세요" |
| 테스트 실패 | 토스트에 에러 메시지 표시 |
| 저장 완료 | 토스트 "이미지 저장소가 설정되었습니다" + 패널 닫힘 |

#### 연결 테스트 로직

1x1 투명 PNG (67 bytes)를 Worker `/upload` 엔드포인트로 POST → 200 응답 + URL 반환이면 성공.

---

## 업로드 모듈

```
파일: apps/web/lib/image-upload.ts
```

### Worker URL 해석 우선순위

1. 환경 변수 `NEXT_PUBLIC_R2_WORKER_URL`
2. localStorage `mf-cf-worker-url`
3. 미설정 (빈 문자열)

### 에러 코드

| 코드 | 의미 | 발생 시점 |
|------|------|----------|
| `NO_WORKER_URL` | Worker URL 미설정 | 업로드 시도 시 |
| `VALIDATION_FAILED` | 파일 형식/크기 검증 실패 | 업로드 전 클라이언트 검증 |
| `UPLOAD_FAILED` | Worker 업로드 실패 | 네트워크 오류, Worker 에러 등 |

### 에디터 연동

```
onImageUpload prop 있음 → 외부 업로더 사용
onImageUpload prop 없음 + Worker URL 있음 → 내장 R2 업로더
onImageUpload prop 없음 + Worker URL 없음 → onImageUploadGuide 콜백 → StorageGuidePanel 열기
```

---

## R2 Worker 상세

```
파일: apps/worker/src/index.ts
설정: apps/worker/wrangler.toml
```

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/` `/health` | 헬스 체크 |
| POST | `/upload` | 이미지 업로드 (FormData, field: `file`) |
| OPTIONS | `*` | CORS preflight |

### 업로드 응답

```json
// 성공
{ "success": true, "url": "https://pub-xxx.r2.dev/images/1712345678-uuid.png" }

// 실패
{ "success": false, "error": "Invalid file type: text/plain. Allowed: png, jpg, gif, webp, svg" }
```

### R2 키 생성 규칙

```
images/{timestamp}-{uuid}.{ext}
```

### CORS 설정

`wrangler.toml`의 `ALLOWED_ORIGINS`로 제어합니다. 기본값은 전체 허용(`*`).

```toml
# 특정 도메인만 허용하려면:
ALLOWED_ORIGINS = "https://markflow.dev,http://localhost:3002"
```

### R2 무료 티어 한도

| 항목 | 한도 |
|------|------|
| 저장 | 10GB |
| 읽기 | 1,000만 요청/월 |
| 쓰기 | 100만 요청/월 |
| 아웃바운드 | 무제한 (egress free) |
