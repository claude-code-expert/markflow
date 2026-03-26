# Research: KMS 프론트엔드 버그 수정 및 UI 재정비

**Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)

## 1. /undefined 리다이렉트 버그 — 근본 원인

### Decision: API 응답 구조 불일치 수정

**근본 원인**: `workspace-store.ts`가 API 응답을 잘못 파싱하고 있다.

- API 실제 응답: `{ workspaces: Workspace[] }`
- 스토어 타입 선언: `apiFetch<Workspace[]>('/workspaces')` (배열 직접 기대)
- 결과: 전체 응답 객체 `{ workspaces: [...] }`가 `state.workspaces`에 저장됨
- `.map()` 호출 시 객체 프로퍼티를 순회하면서 `ws.slug`가 `undefined`
- `Link href={/${workspace.slug}}`가 `/undefined`로 렌더링

**연쇄 영향**:
1. 워크스페이스 목록 페이지(`/(app)/page.tsx`)에 워크스페이스가 표시되지 않음
2. 사이드바(`sidebar.tsx`)에서 워크스페이스 네비게이션 링크가 `/undefined`로 생성
3. 워크스페이스 진입 자체가 불가능하여 모든 하위 기능(문서 CRUD 등) 접근 불가

**수정 방법**:
```typescript
// Before (bug)
const data = await apiFetch<Workspace[]>('/workspaces');
set({ workspaces: data, isLoading: false });

// After (fix)
const response = await apiFetch<{ workspaces: Workspace[] }>('/workspaces');
set({ workspaces: response.workspaces, isLoading: false });
```

**Rationale**: API 응답 형식은 `{ workspaces: [...] }` wrapper 패턴을 사용하고 있으며, 이는 백엔드의 모든 엔드포인트에서 일관된 패턴이다. 프론트엔드 타입을 백엔드 응답 형식에 맞춰야 한다.

**Alternatives considered**: API 서버에서 배열을 직접 반환하도록 변경 — 거부. 백엔드 변경 없이 프론트엔드만 수정하는 것이 스펙 범위.

---

## 2. 폰트 로딩 전략

### Decision: `next/font/google` + CSS 변수

- DM Sans (본문), Sora (헤딩), JetBrains Mono (코드)
- `next/font/google`로 자동 최적화 (서브셋, 프리로드, CLS 방지)
- CSS 변수로 노출: `--font-dm-sans`, `--font-sora`, `--font-jetbrains-mono`
- Tailwind CSS v4의 `@theme inline`에서 참조

**Rationale**: 동일 프로젝트의 `apps/demo`에서 이미 `next/font/google` 패턴을 사용 중. Next.js 16.2.1에서 공식 지원되며 외부 CDN 의존성 없음.

**Alternatives considered**:
- Google Fonts CDN `<link>` 태그 — 거부. FOUT/CLS 문제, Next.js 최적화 미활용
- 로컬 폰트 파일 — 거부. 추가 에셋 관리 불필요, next/font/google이 자동 처리

---

## 3. 디자인 토큰 적용 전략

### Decision: globals.css에 CSS 커스텀 프로퍼티 + Tailwind 확장

프로토타입의 디자인 토큰을 CSS 커스텀 프로퍼티로 정의하고, Tailwind v4의 `@theme` 지시자로 연동한다.

**핵심 토큰 (프로토타입에서 추출)**:

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg` | #F8F7F4 | 배경 기본 |
| `--surface` | #FFFFFF | 카드/패널 배경 |
| `--surface-2` | #F1F0EC | 호버/보조 면 |
| `--surface-3` | #E8E7E1 | 3차 면 |
| `--border` | #E2E0D8 | 기본 테두리 |
| `--border-2` | #CBC9C0 | 진한 테두리 |
| `--text` | #1A1916 | 주요 텍스트 |
| `--text-2` | #57564F | 보조 텍스트 |
| `--text-3` | #9A9890 | 약한 텍스트 |
| `--accent` | #1A56DB | 프라이머리 블루 |
| `--accent-2` | #EEF3FF | 액센트 배경 |
| `--accent-dk` | #1343B0 | 액센트 다크 |
| `--teal` | #0D9488 | 틸 액센트 |
| `--green` | #16A34A | 성공 |
| `--amber` | #D97706 | 경고 |
| `--red` | #DC2626 | 에러 |
| `--purple` | #7C3AED | 퍼플 |
| `--radius-sm` | 6px | 작은 모서리 |
| `--radius` | 10px | 기본 모서리 |
| `--radius-lg` | 14px | 큰 모서리 |
| `--radius-xl` | 18px | 모달 모서리 |
| `--sidebar-w` | 260px | 사이드바 폭 |
| `--header-h` | 56px | 헤더 높이 |

**Rationale**: CSS 커스텀 프로퍼티는 Tailwind 유틸리티 클래스와 공존 가능하며, 프로토타입의 디자인 시스템을 1:1 매핑할 수 있다. Tailwind의 기본 색상 팔레트(gray-50, blue-600 등)를 대체하여 프로토타입 일치도를 높인다.

**Alternatives considered**:
- Tailwind 기본 팔레트만 사용 — 거부. 프로토타입 색상과 정확히 일치하지 않음
- CSS-in-JS (styled-components 등) — 거부. 추가 의존성, 기존 Tailwind 스택과 충돌

---

## 4. 앱 셸 레이아웃 전략

### Decision: CSS Grid 기반 앱 셸 (`(app)/layout.tsx`)

프로토타입의 `.app-shell` 구조를 따른다:

```
┌──────────────────────────────────────────┐
│  Header (56px, full width)               │
├────────────┬─────────────────────────────┤
│  Sidebar   │  Content                    │
│  (260px)   │  (flex-1, auto-scroll)      │
│            │                             │
└────────────┴─────────────────────────────┘
```

- Grid: `grid-template-columns: var(--sidebar-w) 1fr`, `grid-template-rows: var(--header-h) 1fr`
- 헤더: 새 `AppHeader` 컴포넌트 (로고, 브레드크럼, 검색, 사용자 아바타)
- 사이드바: 기존 `Sidebar` 컴포넌트 대폭 수정 (워크스페이스 셀렉터, 검색, 폴더 트리, 네비게이션)
- 사이드바 접기: `grid-template-columns: 0 1fr` + transition

**Rationale**: 프로토타입이 정확히 이 구조를 사용하고 있으며, CSS Grid가 가장 자연스러운 구현 방법.

---

## 5. 워크스페이스 1개 자동 리다이렉트

### Decision: `(app)/page.tsx`에서 조건부 리다이렉트

워크스페이스 목록 페이지에서 `fetchWorkspaces` 결과가 정확히 1개일 때 `router.replace(/${workspace.slug})`로 자동 이동.

**Rationale**: UX 편의성. 개인 사용자(My Notes 워크스페이스만 보유)에게 불필요한 선택 화면을 건너뛴다.

**Edge case**: 워크스페이스 0개 — 빈 상태 UI + "워크스페이스 만들기" CTA 표시.

---

## 6. 자동 저장 구현 전략

### Decision: 에디터 페이지에서 1초 디바운스 PATCH

- `editor-store.ts`의 `content` 변경 감지
- 1초 디바운스 후 `PATCH /workspaces/:wsId/documents/:docId` 호출
- `saveStatus` 상태: `unsaved` → `saving` → `saved` (또는 `error`)
- 에디터 상단에 저장 상태 표시

**Rationale**: 스펙 FR-009 요구사항. 1초 디바운스는 타이핑 중 과도한 API 호출 방지와 데이터 유실 리스크의 균형점.

---

## 7. API 응답 래핑 패턴 확인

### Discovery: 모든 API 엔드포인트가 래핑된 응답 반환

| Endpoint | Response wrapper |
|----------|-----------------|
| GET /workspaces | `{ workspaces: [...] }` |
| GET /workspaces/:id | `{ workspace: {...} }` |
| POST /workspaces | `{ workspace: {...} }` |
| GET /workspaces/:wsId/documents | `{ documents: [...], total, page }` |
| GET /workspaces/:wsId/documents/:id | `{ document: {...} }` |
| POST /workspaces/:wsId/documents | `{ document: {...} }` |
| PATCH /workspaces/:wsId/documents/:id | `{ document: {...} }` |
| GET /workspaces/:wsId/categories | `{ categories: [...] }` |
| POST /workspaces/:wsId/categories | `{ category: {...} }` |
| GET /users/me | `{ user: {...} }` |
| POST /auth/login | `{ accessToken, user: {...} }` |

**영향**: 프론트엔드의 모든 `apiFetch` 호출에서 응답 타입을 래핑 형식에 맞게 수정해야 한다. 현재 `workspace-store.ts` 외에도 동일 패턴의 버그가 있을 수 있으므로 전수 점검 필요.

---

## 8. Next.js 16 App Router 고려사항

### Discovery: 서버/클라이언트 컴포넌트 경계

- 현재 `(app)/layout.tsx`가 `'use client'`로 선언 — 인증 가드 로직 때문
- `(app)/page.tsx`(워크스페이스 목록)도 `'use client'` — Zustand 스토어 사용
- `[workspaceSlug]/page.tsx`는 서버 컴포넌트 — 하지만 기능이 부족하여 클라이언트 컴포넌트로 전환 필요

**Decision**: 인증 가드, 스토어 연동, 라우터 사용이 필요한 모든 페이지는 `'use client'`로 유지. Phase 1에서는 서버 컴포넌트 최적화보다 기능 완성을 우선.
