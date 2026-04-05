# 007 — 시스템 아키텍처 & 확장성 (Architecture & Scalability)

> **최종 수정:** 2026-04-04 (v1.3.0 반영)
> **상태 범례:** ✅ 구현 완료 · 📋 계획됨
> **변경 이력:** v1.3.0 — Phase 1 구현 완료 기준 아키텍처 동기화, 기술 스택 확정(Fastify/Next.js 16/React 19/Zustand 5), cleanup-trash 잡 반영, 미들웨어 구조 문서화, 포트 배정(API:4000, Web:3002) 반영

---

## 1. 현재 프로젝트 구조 ✅

```
markflow/                        (Turborepo monorepo)
├── packages/
│   └── editor/                  ← @markflow/editor (독립 에디터 패키지)
│       ├── src/
│       │   ├── MarkdownEditor.tsx
│       │   ├── toolbar/Toolbar.tsx, SettingsModal.tsx
│       │   ├── editor/EditorPane.tsx
│       │   ├── preview/PreviewPane.tsx
│       │   ├── utils/parseMarkdown.ts, markdownActions.ts, cloudflareUploader.ts
│       │   ├── types/index.ts
│       │   └── styles/*.css
│       ├── dist/                ← 빌드 출력 (ESM + CJS + CSS + DTS)
│       └── tsup.config.ts
├── apps/
│   └── demo/                    ← Next.js 데모 앱
│       ├── app/page.tsx
│       └── next.config.ts
├── standalone/                  ← 단독 배포용 빌드
└── package.json                 ← Turborepo root
```

---

## 2. 기술 스택

### 2.1 에디터 패키지 (`@markflow/editor`) ✅

> 상태: ✅ 완료, npm 배포 준비 완료 (`private: false` 변경만 필요)

| 영역 | 기술 | 버전 | 용도 |
|------|------|------|------|
| UI | React | 19.2.4 | 컴포넌트 |
| 언어 | TypeScript | 5+ (strict) | 타입 안전성 |
| 에디터 엔진 | CodeMirror 6 | 6.x | Markdown 소스 편집, 확장성 |
| MD 파서 | unified + remark + rehype | 11.x | CommonMark 준수, 플러그인 |
| 수식 | KaTeX | 0.16+ | 클라이언트 사이드 수식 렌더링 |
| 코드 하이라이팅 | rehype-highlight | 7.x | 구문 강조 |
| XSS 방어 | rehype-sanitize | 6.x | HTML 필터링 |
| 아이콘 | lucide-react | 0.460+ | 툴바 아이콘 |
| 빌드 | tsup | 8+ | ESM/CJS 번들링 |

### 2.2 클라이언트 (Web App) ✅

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.2.1 |
| UI 라이브러리 | React | 19.2.4 |
| 언어 | TypeScript | 5+ (strict) |
| 상태 관리 | Zustand | 5.0.0 |
| 서버 상태 | @tanstack/react-query | 5.72.0 |
| 스타일링 | Tailwind CSS | 4 |
| 모노레포 | Turborepo | — |
| 포트 | — | 3002 |

### 2.3 API 서버 ✅

| 영역 | 기술 | 버전 | 비고 |
|------|------|------|------|
| 웹 프레임워크 | Fastify | 4+ | REST API |
| ORM | Drizzle ORM | — | TypeScript 네이티브, 경량 |
| 인증 | JWT | — | Access Token (15min) + Refresh Token (7day, HttpOnly Cookie) |
| 메일 | Resend | — | 개발자 친화적 API |
| PDF 생성 | Puppeteer | — | 서버사이드, 워크스페이스 CSS 테마 반영 |
| HTML→MD 변환 | Turndown | — | HTML Import 처리 |
| 버전 Diff | fast-diff (Myers) | — | 경량, 순수 JS |
| 포트 | — | 4000 | — |

### 2.4 데이터 ✅

| 영역 | 기술 | 스펙 |
|------|------|------|
| 기본 DB | PostgreSQL | 16 |
| 스키마 규모 | Drizzle ORM | 15 tables, 78 columns, 16 indexes |
| 이미지 스토리지 | Cloudflare R2 | S3 호환 |

### 2.5 인프라

| 영역 | 기술 |
|------|------|
| 캐시/큐 | Redis 7 |
| 컨테이너 | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| 호스팅 | Vercel (FE) + Railway/Fly.io (BE) |

---

## 3. KMS SaaS 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser) :3002                    │
│  Next.js 16.2.1 App Router · React 19.2.4 · TypeScript 5+   │
│  Zustand 5.0.0 · @tanstack/react-query 5.72.0 · Tailwind 4  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │MarkdownEditor│  │  Doc Manager │  │  Auth / Profile   │  │
│  │ @markflow/    │  │  Folder Tree │  │  JWT + OAuth      │  │
│  │ editor       │  │  Link Graph  │  │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                    API Layer (Fastify) :4000                  │
│  REST API · JWT Auth Middleware · RBAC · CSRF                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Docs ✅ │ │ Users ✅ │ │ Search 📋│ │ OG Preview 📋│  │
│  │  API     │ │  API     │ │  API     │ │  Proxy API    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Workspace✅│ │Category✅│ │Comments✅│ │  Tags ✅      │  │
│  │  API     │ │  API     │ │  API     │ │  API          │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Relations✅│ │ Graph ✅ │ │ Theme ✅ │ │  Embed ✅     │  │
│  │  API     │ │  API     │ │  API     │ │  API          │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │Import/Export ✅   │  │  Trash ✅  │  │ BullMQ 📋      │  │
│  │  API              │  │  API       │  │ Job Queue       │  │
│  └──────────────────┘  └────────────┘  └─────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         y-websocket 📋 (Collaboration Server)         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────┬────────────────────────┬─────────────────────┘
               │                        │
┌──────────────▼──────────┐  ┌─────────▼──────────────────────┐
│      PostgreSQL 16       │  │          Redis                  │
│  15 tables, 78 columns   │  │  Sessions · OG Cache           │
│  16 indexes              │  │  Real-time Pub/Sub             │
│  Full-Text Search Index  │  └────────────────────────────────┘
└─────────────────────────┘
               │
┌──────────────▼──────────┐
│    Cloudflare R2 (S3)    │
│  Images · File Uploads   │
│  Export Archives (ZIP)   │
└─────────────────────────┘
```

### API 구현 상태

| API | 상태 | 비고 |
|-----|------|------|
| Docs API | ✅ | CRUD, 버전, Diff, Export |
| Users API | ✅ | 프로필, 비밀번호 변경 |
| Workspace API | ✅ | CRUD, 멤버 관리 |
| Category API | ✅ | CRUD, Closure Table 계층 구조 |
| Comments API | ✅ | CRUD, 중첩 스레드 |
| Tags API | ✅ | CRUD, 문서 연결 |
| Relations API | ✅ | 문서 간 연관 관계 |
| Graph API | ✅ | 관계 그래프 조회, 노드 통계 |
| Theme API | ✅ | 프리셋, CSS 변수 오버라이드 |
| Embed API | ✅ | 토큰 발급·폐기·만료 |
| Import/Export API | ✅ | HTML/PDF/Markdown |
| Trash API | ✅ | 소프트 삭제, 복원, 영구 삭제 |
| Search API (고급 필터) | 📋 | PostgreSQL FTS 기반 고급 검색 |
| OG Preview Proxy | 📋 | 링크 프리뷰 메타데이터 |
| BullMQ Job Queue | 📋 | PDF/ZIP 비동기 생성 |
| y-websocket | 📋 | CRDT 기반 실시간 공동 편집 |
| OAuth Provider | 📋 | 소셜 로그인 (Google, GitHub) |

---

## 4. 미들웨어 스택 ✅

Fastify 요청 파이프라인에 적용되는 미들웨어 순서:

```
Request
  │
  ├─→ cors.ts              CORS 검증 (환경 변수 기반 origin 허용)
  │
  ├─→ csrf.ts              CSRF 방어 (Origin 헤더 검증 + SameSite=Strict)
  │
  ├─→ auth.ts              Bearer token 검증 (JWT Access Token 파싱)
  │
  ├─→ workspace-scope.ts   워크스페이스 컨텍스트 검증 (workspace_id 범위 강제)
  │
  ├─→ rbac.ts              역할 기반 접근 제어 (owner > admin > editor > viewer)
  │
  └─→ Route Handler
```

| 미들웨어 | 파일 | 역할 |
|----------|------|------|
| CORS | `cors.ts` | 환경 변수 기반 origin 화이트리스트 |
| CSRF | `csrf.ts` | Origin 헤더 검증 + SameSite=Strict 쿠키 |
| Auth | `auth.ts` | Bearer token (JWT Access Token) 검증 및 사용자 컨텍스트 주입 |
| RBAC | `rbac.ts` | 역할 기반 접근 제어: `owner > admin > editor > viewer` |
| Workspace Scope | `workspace-scope.ts` | 모든 쿼리에 `workspace_id` 범위 강제 (데이터 격리) |

---

## 5. 백그라운드 잡 ✅

| 잡 | 파일 | 스케줄 | 설명 |
|----|------|--------|------|
| cleanup-trash | `cleanup-trash.ts` | 주기적 실행 | 만료된 휴지통 항목(soft-delete 후 일정 기간 경과) 자동 영구 삭제 |

> **📋 계획됨:** BullMQ 기반 비동기 잡 큐 (PDF 생성, ZIP Export 등)

---

## 6. 보안 원칙

- **인증:** JWT Access Token(15분) + Refresh Token(7일, HttpOnly Cookie)
- **권한:** 모든 API에 Role 기반 미들웨어
- **XSS:** rehype-sanitize (에디터), DOMPurify (KMS)
- **CSRF:** SameSite=Strict 쿠키, Origin 검증
- **데이터 격리:** 모든 쿼리에 `workspace_id` 범위 강제 (RLS)
- **Rate Limit:** IP + User 기준 요청 제한
- **Secrets:** 환경 변수 관리, 하드코딩 금지

## 7. Embed 연동 아키텍처 (M5) ✅

> 원 요구사항: "어떤 프로젝트에도 embed될 수 있도록 독립 구동 환경, 연동 방식에 대한 해법 제시"

### 7.1 연동 방식 3종

```
┌──────────────────────────────────────────────────────────────┐
│                    외부 프로젝트 (External App)                │
│                                                              │
│  ① NPM 패키지          ② iframe embed         ③ REST API    │
│  ─────────────         ─────────────────       ───────────  │
│  npm install           <iframe src=            fetch(        │
│  @markflow/editor       "/embed/doc/:id         "/api/v1/    │
│                          ?token=GUEST">          docs/:id",  │
│  onSave prop 주입       postMessage             { headers:   │
│  (자체 저장 로직)        이벤트 통신              Bearer token})│
└──────┬─────────────────────────┬──────────────────┬─────────┘
       │ (독립 동작)              │ Guest Token      │ Guest Token
       │                         ▼                  ▼
       │              ┌──────────────────────────────────────┐
       │              │         MarkFlow KMS API             │
       │              │  /embed/doc/:id · /api/v1/documents  │
       └──────────────└──────────────────────────────────────┘
```

### 7.2 방식별 특성 비교

| 항목 | ① NPM 패키지 | ② iframe | ③ REST API |
|------|-------------|---------|-----------|
| KMS 백엔드 필요 | 선택사항 | 필수 | 필수 |
| 인증 방식 | 없음 (standalone) | Guest Token (URL param) | Guest Token (Bearer header) |
| 커스터마이징 | 완전 자유 (React props) | query param 제한 | 완전 자유 |
| 구현 난이도 (외부 개발자) | 낮음 | 매우 낮음 | 중간 |
| 보안 격리 | 완전 통합 (호스트 앱과 동일 origin) | iframe sandbox | 토큰 권한 범위 |
| 적합한 use case | React/Next.js 앱 | 어떤 환경이든 | 헤드리스 CMS |

### 7.3 Guest Token 흐름

```
Admin (KMS)                   외부 앱 서버              외부 앱 브라우저
    │                              │                          │
    │ POST /embed-tokens           │                          │
    │ { scope, expiresAt, ... }    │                          │
    │──────────────────────────────┤                          │
    │ ← { token: "mf_gt_..." }     │                          │
    │                              │                          │
    │                              │ GET /embed/doc/:id       │
    │                              │ ?token=mf_gt_...         │
    │                              │──────────────────────────│
    │                              │ ← HTML (에디터 페이지)    │
```

### 7.4 iframe postMessage 프로토콜

```typescript
// 부모 → iframe
iframe.contentWindow.postMessage({ type: 'mf:set-content', content: '# Hello' }, origin)

// iframe → 부모
window.parent.postMessage({ type: 'mf:ready' }, '*')
window.parent.postMessage({ type: 'mf:content-changed', content: '...' }, '*')
window.parent.postMessage({ type: 'mf:saved', documentId: '...', version: 5 }, '*')
```

---

## 8. CSS 테마 로딩 메커니즘 (M6) ✅

> 원 요구사항: "CSS import로 변경된 CSS가 워크스페이스 단위로 적용"

### 적용 방식: 동적 `<style>` 주입

```typescript
// 워크스페이스 진입 시 실행 (apps/kms/src/hooks/useWorkspaceTheme.ts)
function applyWorkspaceTheme(themeCss: string, workspaceId: string) {
  const styleId = `mf-ws-theme-${workspaceId}`
  let el = document.getElementById(styleId) as HTMLStyleElement | null

  if (!el) {
    el = document.createElement('style')
    el.id = styleId
    document.head.appendChild(el)
  }
  el.textContent = themeCss   // DB에서 받아온 CSS 텍스트 그대로 주입
}

// 워크스페이스 이탈 시 정리
function removeWorkspaceTheme(workspaceId: string) {
  document.getElementById(`mf-ws-theme-${workspaceId}`)?.remove()
}
```

### CSS 범위 격리 전략

| 방식 | 적용 범위 | 보안 | 권장 상황 |
|------|-----------|------|-----------|
| `<style>` 동적 주입 | 전체 페이지 | 낮음 (악성 CSS 가능) | 내부 팀 워크스페이스 |
| CSS 변수 오버라이드만 허용 | Preview 패널 | 높음 | 외부 공개 워크스페이스 |
| Shadow DOM iframe | 완전 격리 | 매우 높음 | 공개 embed 페이지 |

> **Phase 1 구현:** CSS 변수(`--mf-*`) 오버라이드만 허용하는 화이트리스트 방식으로 시작.  
> **Phase 2+:** Admin 이상은 전체 CSS 편집 허용 + 서버사이드 CSS linting으로 악성 코드 차단.

### CSS 변수 네임스페이스 (Preview 패널 적용 범위)

```css
/* 워크스페이스 테마 CSS가 오버라이드할 수 있는 변수 목록 */
.mf-preview-content {
  --mf-font-body:        'Pretendard', sans-serif;
  --mf-font-code:        'JetBrains Mono', monospace;
  --mf-color-heading:    #1a1a1a;
  --mf-color-body:       #374151;
  --mf-color-link:       #2563EB;
  --mf-color-code-bg:    #f3f4f6;
  --mf-color-blockquote: #6b7280;
  --mf-line-height:      1.75;
  --mf-max-width:        720px;
}
```

---

## 9. 배포 포트 배정

| 서비스 | 포트 | 비고 |
|--------|------|------|
| API 서버 (Fastify) | 4000 | REST API + 미들웨어 |
| Web 앱 (Next.js) | 3002 | App Router, SSR |

---

## 10. 개발 원칙

- **테스트 커버리지:** 유닛 80%+, 핵심 API 통합 100%
- **타입 안전성:** `any` 금지, strict 모드
- **코드 리뷰:** PR 당 최소 1인 승인
- **브랜치 전략:** `main` → `develop` → `feature/*`
- **커밋 컨벤션:** Conventional Commits
- **API 버저닝:** `/api/v1/` 프리픽스

---

## 11. 확장성 설계 (📋 계획됨)

### 11.1 단계별 규모

| 단계 | 사용자 | 문서 수 | 동시 접속 | 아키텍처 |
|------|--------|--------|-----------|---------|
| Prototype | ~50 | ~1,000 | ~10 | 단일 서버 |
| MVP Beta | ~500 | ~20,000 | ~100 | 단일 서버 + Read Replica |
| Launch | ~5,000 | ~500,000 | ~1,000 | 수평 확장 + CDN |
| Growth | ~50,000 | ~5M | ~10,000 | 마이크로서비스 분리 |

### 11.2 데이터베이스 확장

**인덱스 전략**
```sql
-- 문서 조회 (워크스페이스 + 카테고리 필터)
CREATE INDEX idx_doc_ws_cat_updated
    ON documents(workspace_id, category_id, updated_at DESC)
    WHERE is_deleted = FALSE;

-- 한국어 지원 (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_doc_trgm_title ON documents USING gin(title gin_trgm_ops);

-- Closure Table (카테고리 계층 조회)
CREATE TABLE category_closure (
    ancestor_id   BIGINT NOT NULL REFERENCES categories(id),
    descendant_id BIGINT NOT NULL REFERENCES categories(id),
    depth         INTEGER NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id)
);
```

**버전 아카이빙**
```
├── 최신 100개: 전체 스냅샷 (빠른 조회)
├── 100~1000개: 일별 최신 버전만 보관
└── 1000개 이상: 월별 최신 버전만 보관
```

**읽기 부하 분산:** Primary (Write) + Read Replica + Redis 캐시

### 11.3 캐싱 전략 (Redis)

| 대상 | TTL |
|------|-----|
| 세션 토큰 | 7일 |
| OG 링크 프리뷰 | 24시간 |
| 워크스페이스 멤버 목록 | 5분 |
| 카테고리 트리 | 1분 |
| 문서 조회 | 30초 |
| 검색 결과 | 10초 |

### 11.4 실시간 협업 확장 (Yjs)

| 설정 | 값 | 이유 |
|------|-----|------|
| 문서당 최대 연결 | 30 | awareness 메모리 |
| 업데이트 배치 간격 | 50ms | broadcast 최적화 |
| Idle 타임아웃 | 5분 | 리소스 정리 |

다중 서버 → Redis Pub/Sub으로 y-websocket 동기화

### 11.5 검색 확장

```
소규모 (< 10만) → PostgreSQL FTS + pg_trgm
중규모 (10~100만) → Meilisearch (자체 호스팅)
대규모 (100만+) → Elasticsearch 클러스터
```

### 11.6 CDN & 정적 자산

- Next.js 빌드 → Vercel Edge Network
- 이미지 → Cloudflare R2 + CDN (WebP 자동 변환)
- 코드 스플리팅: CodeMirror → lazy load, KaTeX → 수식 포함 시만 로드

---

## 12. 모니터링

| 카테고리 | 지표 | 임계값 |
|---------|------|--------|
| API | p95 응답 시간 | > 500ms |
| API | 에러율 (5xx) | > 1% |
| DB | 쿼리 응답 | > 100ms |
| WebSocket | 연결 수 | > 80% 용량 |

**도구:** Sentry (APM) · Prometheus + Grafana (메트릭) · Loki (로그) · Betterstack (Uptime)

---

## 13. 재해 복구

| 항목 | 설정 | 목표 |
|------|------|------|
| DB 백업 | 매일 전체 + 1시간 WAL | RPO < 1시간 |
| 백업 보관 | 30일 | — |
| 복구 테스트 | 월 1회 | RTO < 4시간 |
| Multi-AZ | Phase 2+ | 가용성 99.9% |

---

## 14. 비기능 요구사항

| 항목 | 목표치 | 측정 방법 |
|------|--------|-----------|
| 페이지 초기 로드 | < 2초 (LCP) | Lighthouse |
| 에디터 입력 지연 | < 16ms (60fps) | Chrome DevTools |
| API 응답 시간 (p95) | < 200ms | APM |
| 가용성 | 99.5% | Uptime 모니터링 |
| 동시 편집 | 최대 30인/문서 | 부하 테스트 |
| 문서 수 (워크스페이스) | 최대 50,000건 | 스트레스 테스트 |
