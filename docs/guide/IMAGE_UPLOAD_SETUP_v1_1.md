# 이미지 업로드 설정 가이드

> **버전:** 1.5.0
> **최종 수정:** 2026-04-29
> Cloudflare R2 Worker를 통한 이미지 업로드 설정 절차 및 화면 구성
> **변경 이력:**
> - v1.5.0 — CORS 동작(fail-closed) 정정, 운영 도메인(Vercel 등) 등록 절차, 트러블슈팅 섹션 추가
> - v1.4.0 — 이미지 업로드 사용/미사용 토글 추가, 설정 페이지 UX 개선 (인라인 가이드 → 우측 패널), 에디터 연동 토글 제어
> - v1.3.0 — 초판 작성

---

## 개요

MarkFlow 에디터와 프로필 아바타에서 이미지를 업로드하려면 **이미지 업로드 기능을 활성화**하고 Cloudflare R2 저장소를 연결해야 합니다.
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

## 이미지 업로드 토글

이미지 업로드 기능은 설정 페이지에서 사용/미사용을 토글할 수 있습니다.

```
파일: apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx
상태 저장: localStorage `mf-image-upload-enabled`
유틸 함수: apps/web/lib/image-upload.ts → isImageUploadEnabled(), setImageUploadEnabled()
```

### 토글 동작

| 상태 | 설정 페이지 | 에디터 |
|------|-----------|--------|
| OFF (기본값) | 토글 카드만 표시, R2 설정 UI 숨김 | 이미지 업로드 비활성화 (드래그/붙여넣기/툴바), 업로드 버튼 클릭 시 설정 페이지(`/settings/storage`)로 이동 |
| ON + Worker 미설정 | 사용법 도움말 + 연결 상태(미설정) + CTA → 우측 가이드 패널 | 업로드 시도 시 StorageGuidePanel 열기 |
| ON + Worker 설정됨 | 사용법 도움말 + 연결 상태(연동 완료) + URL 관리 | 정상 업로드 동작 |

> **참고:** 토글을 OFF로 전환해도 기존 Worker URL 설정은 삭제되지 않습니다.
> 이미지 URL 직접 삽입(`![](url)`)은 토글 상태와 무관하게 항상 사용 가능합니다.

---

## 화면 구성

### 이미지 저장소 설정 페이지 (`/settings/storage`)

워크스페이스 설정 하위의 이미지 저장소 관리 페이지입니다.

```
파일: apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx
```

#### 페이지 구성

```
┌─────────────────────────────────────────────┐ ┌──────────────────────────┐
│  이미지 저장소                               │ │ StorageGuidePanel (420px) │
│  ─────────────────────────────────────────── │ │ (CTA 클릭 시 우측에 열림) │
│  ┌─────────────────────────────────────────┐ │ │                          │
│  │ 🖼 이미지 업로드  [토글 ON/OFF]          │ │ │ ① Cloudflare 가입        │
│  └─────────────────────────────────────────┘ │ │ ② Wrangler 로그인        │
│                                              │ │ ③ R2 버킷 생성           │
│  ┌─────────────────────────────────────────┐ │ │ ④ 퍼블릭 액세스          │
│  │ ☁ 이미지 업로드 사용법 (3단계 도움말)     │ │ │ ⑤ Worker 배포            │
│  └─────────────────────────────────────────┘ │ │ ⑥ Worker URL 입력        │
│                                              │ │   [연결 테스트] [저장]    │
│  ┌─────────────────────────────────────────┐ │ └──────────────────────────┘
│  │ 연결 상태: ⚠ 미설정                      │ │
│  │ [📖 Cloudflare R2 설정 가이드 →]         │ │  ← CTA 클릭 → 우측 패널
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ 업로드 서버 URL                          │ │
│  │ [_________________________] [테스트][저장]│ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 이미지 저장소 설정 패널 (StorageGuidePanel)

문서 에디터 및 설정 페이지 우측에 독립 오버레이로 열리는 420px 폭의 사이드 패널입니다.
**에디터와 설정 페이지에서 동일한 컴포넌트를 사용**하여 UX 일관성을 유지합니다.

```
파일: apps/web/components/storage-guide-panel.tsx
사용 위치:
  - 문서 에디터 페이지 (apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx)
  - 이미지 저장소 설정 페이지 (apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx)
```

#### 진입 경로

| 경로 | 위치 | 동작 |
|------|------|------|
| 에디터 상단 툴바 HardDrive 아이콘 | 에디터 | 패널 토글 (열기/닫기) |
| 에디터 툴바 "Upload image" 버튼 (Worker 미설정 시) | 에디터 | 패널 열기 |
| 에디터에서 이미지 드래그/붙여넣기 (Worker 미설정 시) | 에디터 | 패널 열기 |
| "이미지 업로드를 사용하려면 저장소 설정이 필요합니다" 배너 | 에디터 | 패널 열기 |
| "Cloudflare R2 설정 가이드" CTA 버튼 (연결 상태 미설정 시) | 설정 페이지 | 패널 열기 |
| "설정 가이드 다시 보기" 링크 (연결 완료 후) | 설정 페이지 | 패널 열기 |

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

### 이미지 업로드 토글 상태

- 키: localStorage `mf-image-upload-enabled` (`'true'` | 미설정)
- 유틸: `isImageUploadEnabled()`, `setImageUploadEnabled(boolean)`
- 기본값: `false` (비활성화)

### 에러 코드

| 코드 | 의미 | 발생 시점 |
|------|------|----------|
| `NO_WORKER_URL` | Worker URL 미설정 | 업로드 시도 시 |
| `VALIDATION_FAILED` | 파일 형식/크기 검증 실패 | 업로드 전 클라이언트 검증 |
| `UPLOAD_FAILED` | Worker 업로드 실패 | 네트워크 오류, Worker 에러 등 |

### 에디터 연동

```
이미지 업로드 토글 OFF → onImageUpload 미전달, 업로드 버튼 클릭 시 /settings/storage로 이동
이미지 업로드 토글 ON + onImageUpload prop 있음 → 외부 업로더 사용
이미지 업로드 토글 ON + onImageUpload prop 없음 + Worker URL 있음 → 내장 R2 업로더
이미지 업로드 토글 ON + onImageUpload prop 없음 + Worker URL 없음 → onImageUploadGuide 콜백 → StorageGuidePanel 열기
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

`wrangler.toml`의 `ALLOWED_ORIGINS`로 제어하며, 동작은 **fail-closed**입니다.

- `ALLOWED_ORIGINS` 미설정 시 모든 Origin이 차단됩니다(전체 허용 아님).
- 와일드카드 `*`는 **지원하지 않습니다.** 허용할 Origin을 쉼표로 구분해 명시해야 합니다.
- 매칭은 **정확 일치**(scheme + host + port)입니다. Vercel 프리뷰처럼 도메인이 가변인 경우 production 도메인만 명시하는 정책을 권장합니다.

```toml
# apps/worker/wrangler.toml
ALLOWED_ORIGINS = "http://localhost:3002,https://markflow.dev,https://markflow-web.vercel.app"
```

> 코드 위치: `apps/worker/src/helpers.ts` `corsHeaders()`

#### 운영 도메인 추가 절차

1. `apps/worker/wrangler.toml`의 `ALLOWED_ORIGINS`에 새 Origin을 쉼표로 구분해 추가
2. **재배포 필수** (`[vars]`는 정적 변수라 파일 수정만으로는 반영되지 않음)
   ```bash
   cd apps/worker
   npx wrangler deploy
   ```
3. preflight로 검증 (응답에 `access-control-allow-origin` 헤더가 보이면 정상)
   ```bash
   curl -i -X OPTIONS https://<worker-host>/upload \
     -H "Origin: https://<your-domain>" \
     -H "Access-Control-Request-Method: POST"
   ```

### R2 무료 티어 한도

| 항목 | 한도 |
|------|------|
| 저장 | 10GB |
| 읽기 | 1,000만 요청/월 |
| 쓰기 | 100만 요청/월 |
| 아웃바운드 | 무제한 (egress free) |

---

## 트러블슈팅

### `CORS policy: No 'Access-Control-Allow-Origin' header is present` / `Failed to fetch`

브라우저 콘솔에서 위 에러가 보이고 Worker 응답이 200인데 차단되는 경우.

#### 원인

- 요청 Origin이 Worker의 `ALLOWED_ORIGINS`에 등록돼 있지 않음. fail-closed 로직이 빈 `Access-Control-Allow-Origin` 헤더를 내려보내 브라우저가 응답을 차단합니다.
- 또는 `wrangler.toml`은 수정했지만 Worker가 재배포되지 않은 상태.

#### 점검 순서

1. **현재 배포된 Worker가 어떤 Origin을 허용하는지 직접 확인**
   ```bash
   curl -i -X OPTIONS https://<worker-host>/upload \
     -H "Origin: https://<your-domain>" \
     -H "Access-Control-Request-Method: POST"
   ```
   응답에 `access-control-allow-origin: https://<your-domain>` 줄이 없으면 미허용 상태입니다.

2. **`apps/worker/wrangler.toml`의 `ALLOWED_ORIGINS` 확인** — 운영 도메인이 들어 있는지.

3. **재배포** — `cd apps/worker && npx wrangler deploy`. `[vars]`는 빌드 타임 정적 변수이므로 wrangler.toml 수정 후 반드시 재배포해야 적용됩니다.

4. **재검증** — 1번의 curl을 다시 실행해 헤더가 정상 노출되는지 확인 후 브라우저 새로고침.

### `net::ERR_FAILED 200 (OK)`

Worker는 200을 반환했지만 브라우저가 CORS 단계에서 차단한 흔적입니다. 위 절차로 동일하게 해결됩니다.

### `Unauthorized: invalid or missing bearer token`

Worker에 `API_SECRET` Cloudflare Workers Secret이 설정돼 있는데 클라이언트가 Bearer 토큰을 함께 보내지 않거나 값이 다른 경우. Secret을 일치시키거나(필요하다면) 서버측 Secret을 unset해 주세요.

### `bucket not found`

R2 버킷 미생성. Step 3(`npx wrangler r2 bucket create markflow-images`)을 먼저 실행하세요.
