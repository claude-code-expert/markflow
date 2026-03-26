# MarkFlow Design System

> **버전:** 1.0.0  
> **기준 파일:** `markflow-prototype.html`  
> **최종 수정:** 2026-03-26  
> **적용 범위:** 모든 MarkFlow 프론트엔드 화면 (Web SaaS + Embed 모드)

---

## 1. Design Principles

| 원칙 | 설명 |
|------|------|
| **Warm Minimal** | 순백이 아닌 따뜻한 오프화이트 베이스. 정보 밀도와 여백의 균형 |
| **Readable First** | 마크다운 문서를 읽고 쓰는 환경이므로 타이포그래피가 최우선 |
| **Consistent Density** | 사이드바 13.5px · 에디터 15px · 미리보기 15px 등 컨텍스트별 밀도 고정 |
| **Purposeful Color** | 색은 상태·역할·우선순위를 표현하는 데만 사용. 장식용 색상 금지 |
| **Flat & Bordered** | 그라디언트 없음. 모든 구분은 1px border + background-level 차이로 처리 |

---

## 2. Color System

### 2.1 Base Palette (Warm Neutral)

```css
:root {
  /* Backgrounds */
  --bg:        #F8F7F4;   /* Page background — warm off-white */
  --surface:   #FFFFFF;   /* Card, panel, modal surface */
  --surface-2: #F1F0EC;   /* Hover state, secondary surface */
  --surface-3: #E8E7E1;   /* Pressed state, skeleton */

  /* Borders */
  --border:    #E2E0D8;   /* Default border */
  --border-2:  #CBC9C0;   /* Hover / emphasis border */

  /* Text */
  --text:      #1A1916;   /* Primary — near-black warm */
  --text-2:    #57564F;   /* Secondary — medium warm gray */
  --text-3:    #9A9890;   /* Tertiary — hint, placeholder, caption */

  /* Accent (Brand Blue) */
  --accent:    #1A56DB;   /* Primary action, link, active state */
  --accent-2:  #EEF3FF;   /* Accent background — selected, hover */
  --accent-dk: #1343B0;   /* Hover on accent, darker variant */
}
```

### 2.2 Semantic Colors

```css
:root {
  /* Teal — info, embed, API */
  --teal:      #0D9488;
  --teal-lt:   #F0FDFA;

  /* Green — success, approved, saved */
  --green:     #16A34A;
  --green-lt:  #F0FDF4;

  /* Amber — warning, pending, caution */
  --amber:     #D97706;
  --amber-lt:  #FFFBEB;

  /* Red — error, danger, delete */
  --red:       #DC2626;
  --red-lt:    #FFF1F2;

  /* Purple — role badge, embed, special */
  --purple:    #7C3AED;
  --purple-lt: #F5F3FF;
}
```

### 2.3 Color Usage Rules

| 용도 | 토큰 |
|------|------|
| 페이지 배경 | `--bg` |
| 카드 / 모달 / 패널 배경 | `--surface` |
| 호버 배경 | `--surface-2` |
| 기본 텍스트 | `--text` |
| 보조 텍스트 (레이블, 메타) | `--text-2` |
| 힌트 / 플레이스홀더 | `--text-3` |
| 주요 액션 버튼 | `--accent` |
| 활성 사이드바 항목 | `--accent-2` (bg) + `--accent` (text) |
| 저장됨 상태 | `--green` |
| 저장 중 상태 | `--amber` |
| 오류 상태 | `--red` |
| 대기 / 승인 대기 | `--amber` |
| 역할 배지 Owner/Admin | `--purple` |
| 역할 배지 Editor | `--teal` |
| 역할 배지 Viewer | `--gray (surface-2)` |

---

## 3. Typography

### 3.1 Font Stack

```css
:root {
  --font:   'DM Sans', sans-serif;          /* UI 전반 — 본문, 레이블, 버튼 */
  --font-h: 'Sora', sans-serif;             /* 제목, 브랜드, 강조 헤딩 */
  --font-m: 'JetBrains Mono', monospace;    /* 에디터 소스, 코드 블록, 토큰 */
}
```

Google Fonts CDN:
```
https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap
```

### 3.2 Type Scale

| 용도 | 폰트 | 크기 | 굵기 | 비고 |
|------|------|------|------|------|
| Hero H1 | Sora | clamp(38px, 5vw, 58px) | 700 | letter-spacing: -.025em |
| Page Title | Sora | 22–26px | 700 | letter-spacing: -.02em |
| Section Title | Sora | 18–22px | 700 | |
| Card Title | Sora | 15px | 600 | |
| Modal Title | Sora | 17px | 600 | |
| Body Default | DM Sans | 15px | 400 | line-height: 1.6 |
| Body Small | DM Sans | 13.5px | 400 | 사이드바, 메타 정보 |
| Label | DM Sans | 13px | 500 | 폼 레이블 |
| Caption / Hint | DM Sans | 12–12.5px | 400 | color: --text-3 |
| Section Label | DM Sans | 11px | 600 | uppercase, letter-spacing: .07em |
| Editor Source | JetBrains Mono | 13.5px | 400 | line-height: 1.9 |
| Code Block | JetBrains Mono | 13px | 400 | |
| Embed Code | JetBrains Mono | 12.5px | 400 | |

### 3.3 Preview Content Typography

마크다운 프리뷰 패널 전용 스케일 (`.preview-content`):

| 요소 | 폰트 | 크기 | 기타 |
|------|------|------|------|
| H1 | Sora | 30px / 700 | letter-spacing: -.02em |
| H2 | Sora | 22px / 600 | margin-top: 28px |
| H3 | Sora | 18px / 600 | margin-top: 22px |
| Body | DM Sans | 15px / 400 | line-height: 1.8 |
| Code inline | JetBrains Mono | 12.5px | bg: --surface-2, color: --red |
| Code block | JetBrains Mono | 13px | bg: --text (dark), color: #e2e8f0 |
| Max width | — | 740px | margin: 0 auto |
| Padding | — | 32px 48px | |

---

## 4. Spacing & Sizing

### 4.1 Border Radius

```css
--radius-sm: 6px;    /* 버튼, 인풋, 작은 배지 */
--radius:    10px;   /* 카드-sm, 토스트, 토큰 행 */
--radius-lg: 14px;   /* 카드, 문서 카드 */
--radius-xl: 18px;   /* 모달, 워크스페이스 리스트 패널 */
```

### 4.2 Elevation (Shadow)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
--shadow:    0 4px 12px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.05);
--shadow-lg: 0 12px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06);
--shadow-xl: 0 24px 64px rgba(0,0,0,.15), 0 8px 24px rgba(0,0,0,.08);
```

사용 가이드:
- `shadow-sm` : hover 시 리스트 아이템 강조
- `shadow` : 카드 hover, 드롭다운
- `shadow-lg` : 인증 카드, 고정 패널
- `shadow-xl` : 모달, hero 미리보기

### 4.3 Spacing Scale

```
4px   gap 사이 최소 여백
6px   배지 내부 수직 패딩, 태그 gap
8px   btn-sm padding, 아이콘 gap
10px  sidebar-item padding, card-sm
12px  sidebar header padding
14px  설정 섹션 내부
16px  카드 padding, 섹션 gap
20px  toolbar height 기준 여백
24px  카드 기본 padding, 페이지 헤더
28px  섹션 간 여백
32px  페이지 콘텐츠 수평 패딩
40px  설정 페이지 padding
48px  인증 카드 padding, hero
```

---

## 5. Component Specifications

### 5.1 Button

| 종류 | 배경 | 텍스트 | 테두리 | 패딩 |
|------|------|--------|--------|------|
| `btn-primary` | `--accent` | #fff | 없음 | 9px 18px |
| `btn-secondary` | `--surface` | `--text-2` | 1.5px `--border-2` | 9px 18px |
| `btn-ghost` | transparent | `--text-2` | 없음 | 8px 14px |
| `btn-danger` | `--red` | #fff | 없음 | 9px 18px |
| `btn-icon` | transparent | `--text-3` | 없음 | 34×34px |
| `btn-sm` | — | — | — | 6px 13px, 12.5px |
| `btn-lg` | — | — | — | 12px 24px, 15px |

hover 시: primary → `--accent-dk`, secondary → `--surface-2`, icon → `--surface-2`

### 5.2 Form Input

```css
padding: 10px 13px;
border: 1.5px solid var(--border);
border-radius: var(--radius-sm);   /* 6px */
font-size: 14px;
background: var(--surface);
focus: border-color --accent, box-shadow 0 0 0 3px rgba(26,86,219,.1)
error: border-color --red
```

### 5.3 Badge

```
높이: 자동 (padding: 3px 9px)
border-radius: 100px (pill)
font-size: 11.5px / font-weight: 500
```

| 색상 | bg | text |
|------|-----|------|
| blue | `--accent-2` | `--accent-dk` |
| green | `--green-lt` | `--green` |
| amber | `--amber-lt` | `--amber` |
| red | `--red-lt` | `--red` |
| purple | `--purple-lt` | `--purple` |
| teal | `--teal-lt` | `--teal` |
| gray | `--surface-2` | `--text-2` |

### 5.4 Tag (inline)

```css
padding: 4px 10px;
border-radius: 100px;
background: --surface-2;
border: 1px solid --border;
font-size: 12px;
/* hover → background: --accent-2, color: --accent */
```

### 5.5 Modal

```css
background: --surface;
border-radius: --radius-xl;   /* 18px */
box-shadow: --shadow-xl;
max-width: 560px (default) | 800px (.modal-lg) | 1000px (.modal-xl)
overlay: rgba(0,0,0,.35) + backdrop-filter: blur(2px)
animation: scale(.96) → scale(1), 0.18s ease
```

### 5.6 Toast

```css
position: fixed;
bottom: 24px; right: 24px;
background: --text (기본) | --green (success) | --red (error)
color: #fff;
border-radius: --radius;
padding: 12px 18px;
auto-dismiss: 2600ms
```

### 5.7 Sidebar Item

```css
padding: 7px 10px;
border-radius: --radius-sm;
font-size: 13.5px;
color: --text-2;
/* active: background --accent-2, color --accent, font-weight 500 */
/* hover: background --surface-2, color --text */
/* indent (하위 항목): padding-left 28px */
```

---

## 6. Icon System

아이콘 라이브러리: **Lucide Icons** (SVG inline)  
기본 크기: `16×16` (툴바 `14×14`, 소형 UI `12×12`)  
stroke-width: `2` (강조 시 `2.5`)  
color: 부모 `currentColor` 상속

이모지 아이콘:
- 워크스페이스 아이콘: 이모지 (📝 🚀 🎨 등)
- 문서 카드 아이콘: 이모지 (📋 🏗 🗺 🧩 등)
- 기능 설명 카드: 이모지 (✏️ 🔗 👥 🎨 📦 📥)

---

## 7. Motion & Transition

```css
/* 기본 UI 트랜지션 */
transition: all .15s ease;      /* 버튼, 링크, hover 효과 */
transition: all .12s;           /* 사이드바 아이템 */
transition: all .2s;            /* 카드 hover, 레이아웃 전환 */

/* 모달 진입 */
@keyframes modal-in {
  from { opacity: 0; transform: scale(.96) translateY(6px); }
  to   { opacity: 1; transform: scale(1)  translateY(0); }
}
animation: modal-in .18s ease;

/* 토스트 */
opacity: 0 + translateY(8px) → opacity: 1 + translateY(0), .2s ease

/* SVG pulse (현재 문서 강조) */
animate: opacity 0.5→0.1→0.5, dur 2.5s, repeatCount indefinite
```

---

## 8. Dark Mode (계획)

Phase 2에서 구현 예정. CSS 변수 오버라이드 방식:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg:        #121210;
    --surface:   #1A1916;
    --surface-2: #222220;
    --surface-3: #2A2A27;
    --border:    #2E2D28;
    --border-2:  #3D3C37;
    --text:      #F1F0EC;
    --text-2:    #A8A79F;
    --text-3:    #6B6A63;
    --accent:    #4F80F7;
    --accent-2:  #1A2444;
    --accent-dk: #7AA0FF;
  }
}
```

---

## 9. Accessibility

- 최소 대비비: WCAG AA 기준 4.5:1 (텍스트), 3:1 (UI 컴포넌트)
- `--text` (#1A1916) on `--bg` (#F8F7F4): 대비비 약 16:1 ✓
- `--accent` (#1A56DB) on white: 대비비 약 5.5:1 ✓
- focus ring: `box-shadow: 0 0 0 3px rgba(26,86,219,.1)`
- 모든 인터랙티브 요소: `cursor: pointer` 명시
- 키보드 단축키: `Ctrl+/` 전역 검색, `Esc` 모달 닫기

---

## 10. CSS Namespace

에디터 패키지 (`@markflow/editor`)의 모든 CSS 클래스는 `.mf-` 프리픽스 사용:

```
.mf-root
.mf-panes-container
.mf-toolbar
.mf-editor-pane
.mf-preview-pane
.mf-preview-content
```

KMS SaaS 앱 CSS는 프리픽스 없이 BEM-lite 방식:
- 레이아웃: `app-shell`, `app-sidebar`, `app-header`, `app-content`
- 컴포넌트: `doc-card`, `sidebar-item`, `member-row` 등