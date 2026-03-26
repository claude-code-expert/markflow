# MarkFlow R2 Image Uploader

MarkFlow Editor의 이미지 업로드를 위한 Cloudflare Worker입니다.
이미지를 Cloudflare R2에 저장하고 공개 URL을 반환합니다.

## 사전 준비

1. [Cloudflare 계정](https://dash.cloudflare.com/sign-up) (무료)
2. Node.js 18+

## 배포 방법

### 1. R2 버킷 생성

Cloudflare 대시보드 → **R2 Object Storage** → **Create bucket**

- 버킷 이름: `markflow-images` (또는 원하는 이름)
- 생성 후 **Settings** → **Public access** → **Allow Access** 활성화
- 공개 URL 확인 (예: `https://pub-xxxxxxxx.r2.dev`)

### 2. 설정 편집

`wrangler.toml`을 열고 아래 값들을 수정합니다:

```toml
# account_id = "YOUR_ACCOUNT_ID"  # 주석 해제 후 입력

[[r2_buckets]]
bucket_name = "markflow-images"    # 위에서 생성한 버킷 이름

[vars]
PUBLIC_URL = "https://pub-xxxxxxxx.r2.dev"  # 버킷 공개 URL
```

> **Account ID 확인:**
> Cloudflare 대시보드 → 아무 도메인 클릭 → 우측 하단 "API" 섹션

### 3. 의존성 설치 및 배포

```bash
npm install
npm run deploy
```

배포 완료 후 출력되는 URL을 복사합니다:
```
https://markflow-r2-uploader.YOUR_SUBDOMAIN.workers.dev
```

### 4. 에디터에 연결

MarkFlow Editor → **설정(⚙️)** → Worker URL에 위 주소를 붙여넣기 → **테스트 업로드** → 연동 완료!

## 로컬 테스트

```bash
npm run dev
# → http://localhost:8787 에서 실행

# 테스트 업로드
curl -F "file=@test.png" http://localhost:8787/upload
```

## API

### `POST /upload`

| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File (multipart) | 이미지 파일 (png, jpg, gif, webp, svg) |

**성공 응답:**
```json
{ "success": true, "url": "https://pub-xxx.r2.dev/images/1234-uuid.png" }
```

**에러 응답:**
```json
{ "success": false, "error": "File too large: 15.2MB. Max: 10MB" }
```

### `GET /` or `GET /health`

상태 확인용.

## 무료 한도

| 항목 | 무료 |
|------|------|
| R2 저장 | 10 GB |
| R2 읽기 | 1,000만 회/월 |
| R2 쓰기 | 100만 회/월 |
| Worker 요청 | 10만 회/일 |

개인 사용에는 충분합니다.
