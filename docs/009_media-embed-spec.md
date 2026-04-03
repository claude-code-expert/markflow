# 009 — 링크 프리뷰 & 미디어 임베드 (Link Preview & Media Embed Specification)

> **버전:** 1.0.0  
> **최종 수정:** 2026-04-02  
> **우선순위:** P1 (Phase 2 — MVP)  
> **관련 요구사항:** B6 (001_requirement_v1_2), Section 7 (005_api-spec_v1_2)  
> **상태 범례:** ✅ 구현 완료 · 🚧 진행 중 · 📋 계획됨

---

## 1. 개요

마크다운은 미디어 임베드를 기본 문법으로 지원하지 않는다. MarkFlow는 URL 붙여넣기만으로 링크 프리뷰 카드와 인라인 비디오 플레이어를 자동 생성하여, 마크다운 문서의 표현력을 확장한다.

**핵심 원칙**

- **Zero-syntax:** 사용자가 URL만 붙여넣으면 자동 감지. 별도 문법 학습 불요
- **Graceful Degradation:** Export 시 원본 URL 또는 이미지 링크로 폴백하여 마크다운 호환성 유지
- **캐시 우선:** OG 메타데이터를 서버에서 캐싱하여 반복 렌더링 비용 최소화
- **보안:** iframe 렌더링은 허용된 도메인(allowlist) 기반으로 제한

---

## 2. 지원 미디어 타입

### 2.1 비디오 임베드 (인라인 플레이어)

| 플랫폼 | URL 패턴 | 임베드 방식 | 우선순위 |
|--------|----------|------------|---------|
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/` | iframe (`youtube.com/embed/{VIDEO_ID}`) | P1 |
| Vimeo | `vimeo.com/{VIDEO_ID}` | iframe (`player.vimeo.com/video/{VIDEO_ID}`) | P1 |
| Loom | `loom.com/share/{VIDEO_ID}` | iframe (`loom.com/embed/{VIDEO_ID}`) | P2 |

### 2.2 OG 링크 프리뷰 카드

비디오 플랫폼이 아닌 모든 URL에 대해 OG(Open Graph) 메타데이터를 수집하여 카드 형태로 렌더링한다.

| 필드 | OG 태그 | 폴백 |
|------|---------|------|
| 제목 | `og:title` | `<title>` 태그 |
| 설명 | `og:description` | `<meta name="description">` |
| 이미지 | `og:image` | 첫 번째 `<img>` 또는 favicon |
| 사이트명 | `og:site_name` | 도메인명 |

### 2.3 내부 문서 링크

MarkFlow 내부 문서 URL(`app.markflow.io/*/docs/*`) 감지 시, 해당 문서의 제목·첫 줄·태그를 카드로 표시한다.

---

## 3. URL 감지 & 파싱

### 3.1 감지 조건

에디터에서 다음 조건을 모두 충족하는 텍스트를 미디어 URL로 인식한다:

1. **독립 행(bare URL):** 해당 줄에 URL 외 다른 텍스트가 없음
2. **유효한 URL 형식:** `https://` 또는 `http://`로 시작
3. **마크다운 링크 문법이 아님:** `[text](url)` 또는 `![alt](url)` 형태가 아님

```
✅ 감지됨 (bare URL — 줄에 URL만 존재)
https://www.youtube.com/watch?v=dQw4w9WgXcQ

❌ 감지 안됨 (인라인 텍스트 내부)
이 영상을 참고하세요: https://www.youtube.com/watch?v=dQw4w9WgXcQ

❌ 감지 안됨 (마크다운 링크 문법)
[영상 링크](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
```

### 3.2 비디오 ID 추출 정규식

```typescript
// YouTube
const YOUTUBE_REGEX = /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&].*)?$/;

// Vimeo
const VIMEO_REGEX = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[?#].*)?$/;

// Loom (P2)
const LOOM_REGEX = /^https?:\/\/(?:www\.)?loom\.com\/share\/([a-zA-Z0-9]+)(?:\?.*)?$/;
```

### 3.3 YouTube 파라미터 보존

YouTube URL의 유용한 파라미터를 임베드 URL에 전달한다:

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `t` / `start` | 시작 시간(초) | `?t=120` → `?start=120` |
| `list` | 플레이리스트 ID | `?list=PL...` |
| `end` | 종료 시간(초) | `?end=300` |

```typescript
function buildYouTubeEmbedUrl(videoId: string, params: URLSearchParams): string {
  const embedParams = new URLSearchParams();
  
  // 시작 시간
  const time = params.get('t') || params.get('start');
  if (time) embedParams.set('start', time.replace('s', ''));
  
  // 종료 시간
  const end = params.get('end');
  if (end) embedParams.set('end', end);
  
  // 플레이리스트
  const list = params.get('list');
  if (list) embedParams.set('list', list);
  
  const qs = embedParams.toString();
  return `https://www.youtube.com/embed/${videoId}${qs ? '?' + qs : ''}`;
}
```

---

## 4. 프론트엔드 구현

### 4.1 렌더링 파이프라인 확장

기존 `PreviewPane` 렌더링 파이프라인(002_component_v1_2 Section 5)에 미디어 변환 단계를 추가한다:

```
markdown (string)
  → remark-parse             (CommonMark AST)
  → remark-gfm              (Tables, TaskList, Strikethrough)
  → remark-math             ($...$ / $$...$$)
  → ★ remark-media-embed     (bare URL → embed node 변환)   ← 신규
  → remark-rehype            (HAST)
  → rehype-highlight         (코드 구문 강조)
  → rehype-katex             (수식 렌더링)
  → rehype-sanitize          (XSS 방어 — iframe allowlist 포함)
  → rehype-stringify          (HTML string)
```

### 4.2 커스텀 remark 플러그인: `remark-media-embed`

```typescript
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Paragraph, Text } from 'mdast';

interface MediaEmbedOptions {
  enableVideo?: boolean;       // default: true
  enableLinkPreview?: boolean; // default: true
  allowedDomains?: string[];   // iframe 허용 도메인
  fetchPreview?: (url: string) => Promise<OGData | null>;
}

const remarkMediaEmbed: Plugin<[MediaEmbedOptions?]> = (options = {}) => {
  const { enableVideo = true, enableLinkPreview = true } = options;

  return (tree) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      // 단일 텍스트 노드 + URL만 있는 paragraph인지 확인
      if (node.children.length !== 1 || node.children[0].type !== 'text') return;
      
      const text = (node.children[0] as Text).value.trim();
      if (!isValidUrl(text)) return;

      // 비디오 URL 매칭
      if (enableVideo) {
        const videoEmbed = matchVideoUrl(text);
        if (videoEmbed) {
          // paragraph를 커스텀 embed 노드로 교체
          (node as any).data = {
            hName: 'div',
            hProperties: { 
              className: ['mf-media-embed', 'mf-video-embed'],
              'data-embed-type': 'video',
              'data-provider': videoEmbed.provider,
              'data-video-id': videoEmbed.videoId,
            },
            hChildren: [{
              type: 'element',
              tagName: 'iframe',
              properties: {
                src: videoEmbed.embedUrl,
                width: '100%',
                height: '400',
                frameBorder: '0',
                allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                allowFullScreen: true,
                loading: 'lazy',
              },
              children: [],
            }],
          };
          return;
        }
      }

      // 일반 URL → OG 프리뷰 카드 (비동기 로딩은 클라이언트에서 처리)
      if (enableLinkPreview) {
        (node as any).data = {
          hName: 'div',
          hProperties: {
            className: ['mf-media-embed', 'mf-link-preview'],
            'data-embed-type': 'link',
            'data-url': text,
          },
        };
      }
    });
  };
};
```

### 4.3 비디오 임베드 컴포넌트

```typescript
// VideoEmbed.tsx
interface VideoEmbedProps {
  provider: 'youtube' | 'vimeo' | 'loom';
  videoId: string;
  embedUrl: string;
  title?: string;
}

// 렌더링 결과
<div class="mf-video-embed" data-provider="youtube">
  <div class="mf-video-wrapper">              <!-- 16:9 비율 유지 -->
    <iframe
      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
  <div class="mf-video-meta">                 <!-- 선택적: 제목 표시 -->
    <span class="mf-video-provider">YouTube</span>
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
       target="_blank" rel="noopener noreferrer">
      원본 링크로 이동 ↗
    </a>
  </div>
</div>
```

### 4.4 OG 링크 프리뷰 카드 컴포넌트

```typescript
// LinkPreviewCard.tsx
interface LinkPreviewCardProps {
  url: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  loading?: boolean;
  error?: boolean;
}

// 렌더링 결과
<a class="mf-link-preview-card" href="https://example.com" target="_blank" rel="noopener noreferrer">
  <div class="mf-link-preview-image">
    <img src="og-image-url" alt="" loading="lazy" />
  </div>
  <div class="mf-link-preview-body">
    <div class="mf-link-preview-title">페이지 제목</div>
    <div class="mf-link-preview-desc">페이지 설명 텍스트...</div>
    <div class="mf-link-preview-site">
      <img src="favicon" class="mf-link-preview-favicon" />
      example.com
    </div>
  </div>
</a>
```

### 4.5 CSS 스타일

```css
/* ── 비디오 임베드 ── */
.mf-video-embed {
  margin: 16px 0;
  border-radius: var(--mf-radius, 8px);
  overflow: hidden;
  border: 1px solid var(--mf-border, #e2e8f0);
}

.mf-video-wrapper {
  position: relative;
  padding-bottom: 56.25%;    /* 16:9 비율 */
  height: 0;
  overflow: hidden;
}

.mf-video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.mf-video-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--mf-surface, #f8fafc);
  font-size: 12px;
  color: var(--mf-text-secondary, #64748b);
}

.mf-video-provider {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 10px;
}

/* ── OG 링크 프리뷰 카드 ── */
.mf-link-preview-card {
  display: flex;
  margin: 16px 0;
  border: 1px solid var(--mf-border, #e2e8f0);
  border-radius: var(--mf-radius, 8px);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  max-height: 130px;
}

.mf-link-preview-card:hover {
  border-color: var(--mf-accent, #f59e0b);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.mf-link-preview-image {
  width: 200px;
  min-width: 200px;
  overflow: hidden;
  background: var(--mf-surface, #f8fafc);
}

.mf-link-preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mf-link-preview-body {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.mf-link-preview-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mf-link-preview-desc {
  font-size: 12px;
  color: var(--mf-text-secondary, #64748b);
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mf-link-preview-site {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--mf-text-tertiary, #94a3b8);
}

.mf-link-preview-favicon {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

/* ── 로딩 상태 ── */
.mf-link-preview-card.loading {
  background: var(--mf-surface, #f8fafc);
}

.mf-link-preview-card.loading .mf-link-preview-title,
.mf-link-preview-card.loading .mf-link-preview-desc {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: mf-shimmer 1.5s infinite;
  border-radius: 4px;
  color: transparent;
}

@keyframes mf-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 에러 상태 ── */
.mf-link-preview-card.error {
  border-style: dashed;
  opacity: 0.7;
}
```

---

## 5. 에디터 측 UX 흐름

### 5.1 URL 붙여넣기 → 프리뷰 변환

```
┌─────────────────────────────────────────────────────────────────┐
│  1. 사용자가 URL을 새 줄에 붙여넣기                                │
│     https://www.youtube.com/watch?v=dQw4w9WgXcQ                 │
├─────────────────────────────────────────────────────────────────┤
│  2. 에디터(Source)에는 URL 텍스트가 그대로 유지됨                    │
│     → 마크다운 원본 보존 (portable)                                │
├─────────────────────────────────────────────────────────────────┤
│  3. 프리뷰(Preview)에서 remark-media-embed 플러그인이 동작          │
│     ├── YouTube URL 매칭 → iframe 인라인 플레이어 렌더링            │
│     └── 일반 URL → POST /link-preview 호출 → OG 카드 렌더링        │
├─────────────────────────────────────────────────────────────────┤
│  4. OG 카드의 경우 비동기 로딩                                      │
│     ├── 로딩 중: skeleton shimmer 카드 표시                        │
│     ├── 성공: OG 데이터로 카드 업데이트                              │
│     └── 실패: 단순 URL 링크로 폴백                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 에디터 소스 ↔ 프리뷰 동작 비교

| 위치 | 표시 내용 |
|------|----------|
| **에디터 (Source)** | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (원본 URL 텍스트) |
| **프리뷰 (Preview)** | 16:9 YouTube 인라인 플레이어 (iframe) |
| **MD Export** | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (원본 URL) |
| **HTML Export** | `<iframe src="...embed/..." ...>` (인라인 플레이어 HTML) |
| **PDF Export** | YouTube 썸네일 이미지 + 원본 URL 텍스트 |

---

## 6. 백엔드 구현

### 6.1 OG 메타데이터 수집 서비스

```
┌─────────┐     POST /link-preview     ┌─────────────┐
│ Client  │ ──────────────────────────▶ │  API Server │
└─────────┘                            └──────┬──────┘
                                              │
                           ┌──────────────────┼──────────────────────┐
                           │  1. Redis 캐시 확인                      │
                           │     key: `lp:{sha256(url)}`              │
                           │     TTL: 24시간                          │
                           ├──────────────────┼──────────────────────┤
                           │  2. 캐시 미스 → BullMQ 큐에 작업 추가     │
                           │     (비동기 처리)                         │
                           ├──────────────────┼──────────────────────┤
                           │  3. Worker: 대상 URL fetch               │
                           │     → HTML 파싱 → OG 메타 추출            │
                           │     → DB 저장 + Redis 캐시               │
                           └──────────────────┴──────────────────────┘
```

### 6.2 OG 메타데이터 수집 Worker

```typescript
// workers/linkPreviewWorker.ts
import { Worker } from 'bullmq';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

interface LinkPreviewJob {
  url: string;
  urlHash: string;
}

const worker = new Worker<LinkPreviewJob>('link-preview', async (job) => {
  const { url, urlHash } = job.data;

  // 1. URL fetch (서버사이드 — CORS 무관)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MarkFlow-Bot/1.0 (+https://markflow.io)' },
    signal: AbortSignal.timeout(10_000),  // 10초 타임아웃
    redirect: 'follow',
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  // 2. OG 메타데이터 추출
  const ogData = {
    ogTitle:       $('meta[property="og:title"]').attr('content') 
                   || $('title').text() || null,
    ogDescription: $('meta[property="og:description"]').attr('content')
                   || $('meta[name="description"]').attr('content') || null,
    ogImage:       $('meta[property="og:image"]').attr('content') || null,
    ogSiteName:    $('meta[property="og:site_name"]').attr('content')
                   || new URL(url).hostname,
    previewType:   detectPreviewType($, url),
  };

  // 3. DB 저장 (link_previews 테이블 — UPSERT)
  await db.query(`
    INSERT INTO link_previews (url_hash, original_url, og_title, og_description, og_image, og_site_name, preview_type, cached_at, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '24 hours')
    ON CONFLICT (url_hash) DO UPDATE SET
      og_title = EXCLUDED.og_title,
      og_description = EXCLUDED.og_description,
      og_image = EXCLUDED.og_image,
      og_site_name = EXCLUDED.og_site_name,
      cached_at = NOW(),
      expires_at = NOW() + INTERVAL '24 hours'
  `, [urlHash, url, ogData.ogTitle, ogData.ogDescription, ogData.ogImage, ogData.ogSiteName, ogData.previewType]);

  // 4. Redis 캐시 갱신
  await redis.setex(`lp:${urlHash}`, 86400, JSON.stringify(ogData));

  return ogData;
});

function detectPreviewType($: cheerio.Root, url: string): 'website' | 'video' | 'internal' {
  const ogType = $('meta[property="og:type"]').attr('content');
  if (ogType === 'video' || ogType === 'video.other') return 'video';
  if (url.includes('markflow.io')) return 'internal';
  return 'website';
}
```

### 6.3 기존 API 스펙 보완 (005_api-spec Section 7)

```
POST /link-preview
```

**Request**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response `200`** (캐시 히트 또는 즉시 반환 가능한 비디오 URL)
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "ogTitle": "Rick Astley - Never Gonna Give You Up",
  "ogDescription": "The official video for...",
  "ogImage": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "ogSiteName": "YouTube",
  "previewType": "video",
  "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "provider": "youtube",
  "videoId": "dQw4w9WgXcQ",
  "cached": true
}
```

**Response `200`** (일반 URL)
```json
{
  "url": "https://example.com/article",
  "ogTitle": "Example Article",
  "ogDescription": "This is a sample article...",
  "ogImage": "https://example.com/og-image.jpg",
  "ogSiteName": "Example",
  "previewType": "website",
  "embedUrl": null,
  "provider": null,
  "videoId": null,
  "cached": false
}
```

**Response `202`** (캐시 미스 — 비동기 처리 중)
```json
{
  "url": "https://example.com/article",
  "status": "processing",
  "retryAfter": 2
}
```

**Error `422`**
```json
{
  "error": {
    "code": "NO_OG_DATA",
    "message": "OG 메타데이터를 추출할 수 없습니다."
  }
}
```

**Error `400`**
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "유효하지 않은 URL 형식입니다."
  }
}
```

**Error `403`**
```json
{
  "error": {
    "code": "BLOCKED_DOMAIN",
    "message": "차단된 도메인입니다."
  }
}
```

---

## 7. 데이터 모델

### 7.1 기존 테이블 활용 (004_data-model Section 2.10)

`link_previews` 테이블을 그대로 사용하되, 비디오 전용 컬럼을 추가한다:

```sql
-- 기존 link_previews 테이블에 비디오 관련 컬럼 추가
ALTER TABLE link_previews ADD COLUMN IF NOT EXISTS
  provider       TEXT;           -- 'youtube' | 'vimeo' | 'loom' | null

ALTER TABLE link_previews ADD COLUMN IF NOT EXISTS
  video_id       TEXT;           -- 플랫폼별 영상 ID

ALTER TABLE link_previews ADD COLUMN IF NOT EXISTS
  embed_url      TEXT;           -- iframe src URL

ALTER TABLE link_previews ADD COLUMN IF NOT EXISTS
  thumbnail_url  TEXT;           -- 영상 썸네일 (PDF export용)

ALTER TABLE link_previews ADD COLUMN IF NOT EXISTS
  duration       INTEGER;        -- 영상 길이 (초) — oEmbed API에서 취득
```

### 7.2 최종 테이블 스키마

```sql
CREATE TYPE preview_type AS ENUM ('website', 'video', 'internal');

CREATE TABLE link_previews (
    url_hash        TEXT          PRIMARY KEY,    -- SHA-256(original_url)
    original_url    TEXT          NOT NULL,
    og_title        TEXT,
    og_description  TEXT,
    og_image        TEXT,
    og_site_name    TEXT,
    preview_type    preview_type  NOT NULL DEFAULT 'website',
    -- 비디오 전용 필드
    provider        TEXT,                         -- youtube | vimeo | loom
    video_id        TEXT,
    embed_url       TEXT,
    thumbnail_url   TEXT,
    duration        INTEGER,                      -- 초 단위
    -- 캐시 관리
    cached_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ   NOT NULL
);

CREATE INDEX idx_lp_expires   ON link_previews(expires_at);
CREATE INDEX idx_lp_provider  ON link_previews(provider) WHERE provider IS NOT NULL;
```

---

## 8. Export 처리

각 Export 포맷별로 미디어 임베드를 어떻게 변환하는지 정의한다.

### 8.1 MD Export

마크다운 원본을 그대로 출력한다. URL은 bare URL로 유지.

```markdown
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 8.2 HTML Export

인라인 CSS를 포함한 임베드 HTML로 변환한다.

```html
<div class="mf-video-embed" data-provider="youtube">
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
    <iframe 
      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy">
    </iframe>
  </div>
</div>
```

### 8.3 PDF Export

iframe은 PDF로 렌더링할 수 없으므로, 썸네일 이미지 + 링크로 폴백한다.

```html
<!-- Puppeteer 렌더링 전 변환 -->
<div class="mf-video-pdf-fallback">
  <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" 
       alt="YouTube: Never Gonna Give You Up" 
       style="width:100%;border-radius:8px;" />
  <p style="font-size:12px;color:#64748b;margin-top:8px;">
    ▶ https://www.youtube.com/watch?v=dQw4w9WgXcQ
  </p>
</div>
```

### 8.4 Export 변환 매트릭스

| 원본 | MD Export | HTML Export | PDF Export |
|------|----------|-------------|------------|
| YouTube bare URL | bare URL 유지 | iframe 인라인 플레이어 | 썸네일 이미지 + URL |
| Vimeo bare URL | bare URL 유지 | iframe 인라인 플레이어 | 썸네일 이미지 + URL |
| 일반 URL (OG 카드) | bare URL 유지 | OG 카드 HTML | 제목 + URL 텍스트 |
| 내부 문서 URL | bare URL 유지 | 내부 링크 카드 HTML | 문서 제목 + URL 텍스트 |

---

## 9. 보안

### 9.1 iframe 허용 도메인 (allowlist)

`rehype-sanitize` 설정에서 iframe `src`를 화이트리스트 방식으로 제한한다:

```typescript
const ALLOWED_IFRAME_DOMAINS = [
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'www.loom.com',
];

// rehype-sanitize 설정 확장
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'iframe'],
  attributes: {
    ...defaultSchema.attributes,
    iframe: [
      'src', 'width', 'height', 'frameBorder',
      'allow', 'allowFullScreen', 'loading',
    ],
  },
  // src 속성 값 검증
  protocols: {
    ...defaultSchema.protocols,
    src: ['https'],
  },
};

// 추가 검증: iframe src 도메인 확인
function validateIframeSrc(src: string): boolean {
  try {
    const url = new URL(src);
    return ALLOWED_IFRAME_DOMAINS.includes(url.hostname);
  } catch {
    return false;
  }
}
```

### 9.2 서버사이드 URL fetch 보안

| 위협 | 대응 |
|------|------|
| SSRF (내부 네트워크 접근) | private IP 대역 차단 (`10.x`, `172.16.x`, `192.168.x`, `127.x`, `::1`) |
| 무한 리다이렉트 | 최대 5회 리다이렉트 제한 |
| 대용량 응답 | 응답 본문 최대 5MB 제한 |
| 타임아웃 | 10초 AbortSignal |
| 도메인 차단 | 악성 도메인 블랙리스트 관리 |

```typescript
function isPrivateUrl(url: string): boolean {
  const hostname = new URL(url).hostname;
  const privatePatterns = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^0\./,
    /^localhost$/i,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ];
  return privatePatterns.some(p => p.test(hostname));
}
```

### 9.3 Rate Limiting

`POST /link-preview` 엔드포인트는 기존 Rate Limit 설정(005_api-spec Section 11)을 따른다:

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| POST /link-preview | 30 req | 1분/User |

---

## 10. 프로토타입 구현 가이드

프로토타입(`markflow-prototype.html`)에서 `marked` 라이브러리 기반으로 간략히 구현하는 방법:

### 10.1 marked 커스텀 renderer

```javascript
// marked v9+ 확장 방식 (use)
const mediaExtension = {
  renderer: {
    paragraph(text) {
      const trimmed = text.trim();
      
      // YouTube 감지
      const ytMatch = trimmed.match(
        /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:[?&].*)?$/
      );
      if (ytMatch) {
        return `
          <div class="mf-video-embed">
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">
              <iframe src="https://www.youtube.com/embed/${ytMatch[1]}"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                allowfullscreen loading="lazy"></iframe>
            </div>
          </div>`;
      }

      // Vimeo 감지
      const vmMatch = trimmed.match(
        /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[?#].*)?$/
      );
      if (vmMatch) {
        return `
          <div class="mf-video-embed">
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">
              <iframe src="https://player.vimeo.com/video/${vmMatch[1]}"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                allow="autoplay;fullscreen;picture-in-picture"
                allowfullscreen loading="lazy"></iframe>
            </div>
          </div>`;
      }

      // 일반 bare URL → 간단 링크 카드 (프로토타입 수준)
      const urlMatch = trimmed.match(/^(https?:\/\/[^\s]+)$/);
      if (urlMatch) {
        const domain = new URL(urlMatch[1]).hostname;
        return `
          <a class="mf-link-preview-card" href="${urlMatch[1]}" target="_blank" rel="noopener noreferrer"
             style="display:flex;border:1px solid var(--border,#e2e8f0);border-radius:8px;overflow:hidden;text-decoration:none;color:inherit;margin:16px 0;">
            <div style="padding:12px 16px;flex:1;">
              <div style="font-size:13px;font-weight:600;color:var(--text,#1e293b);">${urlMatch[1]}</div>
              <div style="font-size:11px;color:var(--text-3,#94a3b8);margin-top:4px;">${domain}</div>
            </div>
          </a>`;
      }

      return `<p>${text}</p>`;
    }
  }
};

// 적용
marked.use(mediaExtension);
```

---

## 11. 툴바 확장

### 11.1 미디어 삽입 버튼 (Phase 2)

기존 툴바 Insert 그룹(001_requirement A3)에 미디어 버튼을 추가한다:

| 그룹 | 기존 버튼 | 추가 버튼 |
|------|----------|----------|
| Insert | Link, Image, Table | **Video** (Phase 2) |

**Video 버튼 동작:**
1. 클릭 → 모달 오픈 (URL 입력 필드)
2. URL 입력 → 유효성 검증 (지원 플랫폼 매칭)
3. 유효한 비디오 URL → 에디터에 bare URL 삽입 (새 줄)
4. 유효하지 않은 URL → 에러 메시지 표시

### 11.2 ToolbarAction 확장

```typescript
type ToolbarAction =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'bold' | 'italic' | 'strikethrough' | 'code' }
  | { type: 'codeblock'; lang?: string }
  | { type: 'blockquote' | 'ul' | 'ol' | 'task' }
  | { type: 'link' | 'image' | 'table' | 'hr' }
  | { type: 'math-inline' | 'math-block' }
  | { type: 'video'; url: string }   // ← 신규
```

---

## 12. 테스트 케이스

### 12.1 단위 테스트

| ID | 테스트 | 기대 결과 |
|----|--------|----------|
| ME-U-01 | YouTube 표준 URL 파싱 | videoId `dQw4w9WgXcQ` 추출 |
| ME-U-02 | YouTube 단축 URL 파싱 | `youtu.be/xxx` → videoId 추출 |
| ME-U-03 | YouTube Shorts URL 파싱 | `shorts/xxx` → videoId 추출 |
| ME-U-04 | YouTube 타임스탬프 보존 | `?t=120` → `?start=120` |
| ME-U-05 | Vimeo URL 파싱 | `vimeo.com/123456` → videoId `123456` |
| ME-U-06 | 인라인 URL 비감지 | `텍스트 https://... 텍스트` → 일반 paragraph |
| ME-U-07 | 마크다운 링크 비감지 | `[text](https://...)` → 일반 링크 |
| ME-U-08 | Private IP URL 차단 | `https://192.168.1.1` → SSRF 차단 |
| ME-U-09 | OG 메타데이터 추출 | 테스트 HTML에서 og:title, og:image 추출 |
| ME-U-10 | iframe src 도메인 검증 | 허용 도메인만 통과 |

### 12.2 통합 테스트

| ID | 테스트 | 기대 결과 |
|----|--------|----------|
| ME-I-01 | YouTube URL 붙여넣기 → 프리뷰 | 인라인 플레이어 iframe 렌더링 |
| ME-I-02 | 일반 URL → OG 프리뷰 | POST /link-preview 호출 → 카드 표시 |
| ME-I-03 | OG 캐시 히트 | Redis 캐시에서 즉시 반환 |
| ME-I-04 | OG 캐시 미스 | BullMQ 큐 → Worker 처리 → 202 → 재요청 시 200 |
| ME-I-05 | MD Export | bare URL 그대로 출력 |
| ME-I-06 | HTML Export | iframe 인라인 플레이어 HTML 포함 |
| ME-I-07 | PDF Export | 썸네일 이미지 + URL 텍스트 |
| ME-I-08 | Rate Limit 초과 | 30회 이후 429 응답 |

### 12.3 E2E 테스트

| ID | 시나리오 | 기대 결과 |
|----|---------|----------|
| ME-E-01 | 에디터에 YouTube URL 입력 → 프리뷰 확인 → MD export → 재 import → 프리뷰 확인 | 전 과정 일관된 동작 |
| ME-E-02 | 에디터에 일반 URL 입력 → OG 카드 로딩 → 캐시 확인 → 24시간 후 만료 확인 | 캐시 라이프사이클 정상 |

---

## 13. 로드맵 연동

| 항목 | Phase | 상태 |
|------|-------|------|
| YouTube iframe 렌더링 (프리뷰) | Phase 2 (W6-7) | 📋 |
| Vimeo iframe 렌더링 (프리뷰) | Phase 2 (W6-7) | 📋 |
| OG 링크 프리뷰 카드 | Phase 2 (W6-7) | 📋 |
| POST /link-preview API | Phase 2 (W6-7) | 📋 |
| BullMQ 비동기 OG 수집 Worker | Phase 2 (W6-7) | 📋 |
| Redis 캐시 (24h TTL) | Phase 2 (W6-7) | 📋 |
| HTML Export 임베드 변환 | Phase 2 (W6-7) | 📋 |
| PDF Export 썸네일 폴백 | Phase 2 (W6-7) | 📋 |
| 프로토타입 marked 확장 | 즉시 가능 | 📋 |
| 내부 문서 링크 카드 | Phase 2 (W8) | 📋 |
| Loom 임베드 | Phase 3 | 📋 |
| 툴바 Video 버튼 | Phase 2 | 📋 |
| oEmbed API 연동 (영상 메타데이터) | Phase 3 | 📋 |

---

## 14. 관련 문서 참조

| 문서 | 관련 섹션 |
|------|----------|
| 001_requirement_v1_2 | B6. 링크 URL 프리뷰, A3. 툴바, A7. 렌더링 파이프라인 |
| 002_component_v1_2 | Section 5. PreviewPane, Section 7. 유틸리티 |
| 004_data-model_v1_2 | Section 2.10. link_previews |
| 005_api-spec_v1_2 | Section 7. 링크 프리뷰, Section 11. Rate Limiting |
| 006_test-spec_v1_2 | (ME-* 테스트 시리즈 추가 필요) |
| 008_roadmap_v1_2 | Phase 2 P1 체크리스트: YouTube/Vimeo 임베드 |
