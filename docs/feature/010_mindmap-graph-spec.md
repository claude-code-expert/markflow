# 010 — 마인드맵 그래프 시각화 명세 (MindMap Graph Specification)

> **버전:** 1.0.0
> **최종 수정:** 2026-04-06
> **구현 파일:** `graph-mindmap.html` → 향후 `apps/web/components/graph/MindMapView.tsx`
> **렌더링 엔진:** HTML5 Canvas 2D API (라이브러리 의존성 없음)
> **상태:** 🚧 프로토타입 구현 완료 · 📋 React 컴포넌트 이식 계획됨
> **연관 문서:** `004_data-model_v1_3.md` · `005_api-spec_v1_3.md` · `002_component_v1_4.md`

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [JSON 데이터 구조](#2-json-데이터-구조)
3. [레이아웃 알고리즘](#3-레이아웃-알고리즘)
4. [렌더링 파이프라인](#4-렌더링-파이프라인)
5. [애니메이션 시스템](#5-애니메이션-시스템)
6. [인터랙션 시스템](#6-인터랙션-시스템)
7. [API 연동 명세](#7-api-연동-명세)
8. [React 컴포넌트 이식 가이드](#8-react-컴포넌트-이식-가이드)
9. [확장 로드맵](#9-확장-로드맵)

---

## 1. 시스템 개요

### 1.1 개념

MarkFlow 마인드맵은 **선택된 문서(Center Node)** 를 기준으로 그 문서와 연결된 모든 관계를 **5개 브랜치** 로 방사형 시각화하는 인터랙티브 그래프입니다.

```
                    ⬡ 상위 카테고리
                   (top, -90°)
                        │
       ◀ 이전 문서      │       ▶ 다음 문서
      (top-left, -150°) │    (top-right, -30°)
                  ┌─────┴──────┐
                  │  선택 문서  │
                  └─────┬──────┘
                        │
       # 태그 연결       │     ↔ 연관 문서
      (bottom-left, 150°)│   (bottom-right, 40°)
```

**방향성은 의미를 가집니다.**

| 방향 | 의미 | 연결 유형 |
|------|------|---------|
| 위 (−90°) | 계층 상위 | 카테고리 소속 |
| 왼쪽 위 (−150°) | 시간적 이전 | `prev` relation |
| 오른쪽 위 (−30°) | 시간적 이후 | `next` relation |
| 오른쪽 아래 (+40°) | 의미적 연관 | `related` relation |
| 왼쪽 아래 (+150°) | 태그 교집합 | 공유 tag 기반 자동 추론 |

### 1.2 노드 계층

```
Level 0 (Center)   선택 문서 — 반경 46px 원형 노드, 카테고리 색상 glow
Level 1 (Hub)      브랜치 허브 — 반경 20px 원형 노드, 브랜치 색상
Level 2 (Leaf)     연결 문서 — 32px 높이 rounded-rect 노드
```

거리 상수:

```
Center → Hub  : L1 = 155px
Hub → Leaf    : L2 = 125px
Leaf 간격     : VSPACE = 50px (허브 기준 수직 방향)
```

---

## 2. JSON 데이터 구조

### 2.1 입력 데이터 스키마

그래프를 렌더링하기 위해 API에서 받아와야 하는 데이터의 완전한 타입 정의입니다.

```typescript
// 전체 그래프 페이로드 — GET /documents/:id/graph 응답 형태
interface MindMapPayload {
  document:   CenterDocument;      // 선택된 중심 문서
  categories: Category[];          // 워크스페이스 전체 카테고리
  relations:  DocumentRelation[];  // 이 문서와 연결된 모든 relation
  tagLinks:   TagLink[];           // 태그 교집합으로 추론된 연결
}
```

#### `CenterDocument` — 중심 문서

```typescript
interface CenterDocument {
  id:          number;     // PK (documents.id)
  title:       string;     // 문서 제목
  slug:        string;     // URL slug
  cat:         string;     // 소속 카테고리 ID ("c1", "c2" ...)
  tags:        string[];   // 태그 배열 (예: ["ai", "llm", "claude"])
  updated_at:  string;     // ISO 8601 타임스탬프
  author:      string;     // 작성자 이름
}
```

**필드 상세:**

| 필드 | DB 컬럼 | 설명 |
|------|---------|------|
| `id` | `documents.id` | 그래프 내 노드 식별자 |
| `title` | `documents.title` | Leaf 노드 라벨 표시 (최대 16자, 초과 시 `…` truncate) |
| `slug` | `documents.slug` | 클릭 시 라우팅에 사용 (`/docs/:slug`) |
| `cat` | `documents.category_id` | 카테고리 lookup key (Category[] 배열과 join) |
| `tags` | `document_tags.tag` | 태그 연결 브랜치 자동 계산에 사용 |
| `updated_at` | `documents.updated_at` | 사이드바 정렬 기준 |
| `author` | `users.name` | 툴팁·상세 패널 표시용 |

#### `Category` — 카테고리

```typescript
interface Category {
  id:       string;         // 카테고리 식별자 (예: "c1")
  name:     string;         // 표시명 (예: "AI 도구")
  color:    string;         // HEX 색상 (예: "#ff6b6b")
  parent?:  string | null;  // 부모 카테고리 ID (없으면 null = root)
}
```

**필드 상세:**

| 필드 | 역할 |
|------|------|
| `id` | 문서의 `cat` 필드와 join, 브랜치 색상 결정의 기준 |
| `name` | 카테고리 브랜치 Leaf 노드 라벨 |
| `color` | Center 노드 glow 색상, Leaf 노드 stroke 색상의 원천 |
| `parent` | 계층 표현 (현재 그래프에서는 breadcrumb 표시에만 활용) |

**카테고리 색상 팔레트 (현재 정의):**

```typescript
const CATEGORY_COLORS = {
  "c1": "#ff6b6b",  // AI 도구     — 코랄 레드
  "c2": "#ff9f43",  // LLM 활용    — 오렌지
  "c3": "#ffd32a",  // AI 에이전트 — 옐로우
  "c4": "#00d2d3",  // 프론트엔드  — 청록
  "c5": "#48dbfb",  // 백엔드      — 라이트 블루
  "c6": "#a29bfe",  // DevOps      — 라벤더
} as const;
```

#### `DocumentRelation` — 문서 간 명시적 관계

```typescript
interface DocumentRelation {
  from:     number;                         // 출발 문서 ID (= 중심 문서 ID)
  to:       number;                         // 도착 문서 ID
  type:     "prev" | "next" | "related";    // 관계 유형
  doc: {                                    // 연결 문서 요약 (JOIN 데이터)
    id:     number;
    title:  string;
    slug:   string;
    cat:    string;
    tags:   string[];
  };
}
```

**`type` 값별 의미:**

| type | 방향각 | 브랜치 색상 | 의미 |
|------|--------|------------|------|
| `prev` | −150° | `#00d4ff` 청색 | 이 문서의 이전에 읽어야 할 문서. `document_relations.rel_type='prev'` |
| `next` | −30° | `#ffd700` 황금색 | 이 문서 이후에 읽어야 할 문서. `document_relations.rel_type='next'` |
| `related` | +40° | `#ff69b4` 핑크 | 주제가 연관된 문서. `document_relations.rel_type='related'` |

**DB 매핑:**

```sql
-- DocumentRelation[] 생성 쿼리
SELECT
  dr.doc_id   AS "from",
  dr.related_doc_id AS "to",
  dr.rel_type AS "type",
  d.id, d.title, d.slug, d.category_id AS cat
FROM document_relations dr
JOIN documents d ON d.id = dr.related_doc_id
WHERE dr.doc_id = :docId
  AND NOT d.is_deleted;
```

#### `TagLink` — 태그 교집합 기반 자동 연결

```typescript
interface TagLink {
  from:     number;       // 중심 문서 ID
  to:       number;       // 연결 문서 ID
  type:     "tag";        // 항상 "tag"
  sharedTags: string[];   // 공유하는 태그 목록 (예: ["llm", "ai"])
  doc: {
    id:     number;
    title:  string;
    slug:   string;
    cat:    string;
    tags:   string[];
  };
}
```

**필드 상세:**

| 필드 | 설명 |
|------|------|
| `sharedTags` | 두 문서가 공유하는 태그의 배열. UI 툴팁에 표시 가능 |
| `type` | 항상 `"tag"` — 브랜치 구분자로 사용 |

**DB 매핑:**

```sql
-- TagLink[] 생성 쿼리
-- 중심 문서의 태그와 교집합이 있는 다른 문서를 추론
SELECT
  :docId AS "from",
  d.id   AS "to",
  'tag'  AS "type",
  ARRAY_AGG(dt_center.tag) FILTER (WHERE dt_center.tag = dt_other.tag) AS "sharedTags",
  d.id, d.title, d.slug, d.category_id AS cat
FROM documents d
JOIN document_tags dt_other ON dt_other.doc_id = d.id
JOIN document_tags dt_center ON dt_center.doc_id = :docId
  AND dt_center.tag = dt_other.tag
WHERE d.id != :docId
  AND NOT d.is_deleted
  -- 이미 명시적 relation이 있는 문서는 제외
  AND d.id NOT IN (
    SELECT related_doc_id FROM document_relations WHERE doc_id = :docId
  )
GROUP BY d.id, d.title, d.slug, d.category_id
ORDER BY COUNT(*) DESC  -- 공유 태그 수 많은 순
LIMIT 7;
```

### 2.2 내부 런타임 구조 (computed)

API 데이터를 받아 클라이언트에서 계산하는 내부 상태 구조입니다.

#### `Branch` — 브랜치 런타임 객체

```typescript
interface Branch {
  key:   BranchKey;      // "cat" | "prev" | "next" | "related" | "tag"
  meta:  BranchMeta;     // 브랜치 고정 메타 (색상, 각도, 아이콘 등)
  hx:    number;         // Hub 노드 X 좌표 (canvas px)
  hy:    number;         // Hub 노드 Y 좌표 (canvas px)
  nodes: LeafNode[];     // 이 브랜치에 속한 리프 노드 배열
}

type BranchKey = "cat" | "prev" | "next" | "related" | "tag";

interface BranchMeta {
  label:  string;   // 허브 아래 표시 라벨 (예: "다음 문서")
  icon:   string;   // 허브 안 아이콘 문자 (예: "▶")
  color:  string;   // 브랜치 전체 테마 색상 HEX
  angle:  number;   // 중심에서 허브 방향각 (degree, 0=right, -90=top)
}

// BRANCH_META 상수 정의
const BRANCH_META: Record<BranchKey, BranchMeta> = {
  cat:     { label: "상위 카테고리", icon: "⬡", color: "#a78bfa", angle: -90  },
  prev:    { label: "이전 문서",     icon: "◀", color: "#00d4ff", angle: -150 },
  next:    { label: "다음 문서",     icon: "▶", color: "#ffd700", angle: -30  },
  related: { label: "연관 문서",     icon: "↔", color: "#ff69b4", angle: 40   },
  tag:     { label: "태그 연결",     icon: "#", color: "#7dd3fc", angle: 150  },
};
```

#### `LeafNode` — 리프 노드 런타임 객체

```typescript
interface LeafNode {
  id:      number | string;   // 문서 ID (카테고리 노드는 "c_c1" 형태의 string)
  label:   string;            // 표시 텍스트 (문서 제목 또는 카테고리명)
  docId:   number | null;     // 클릭 시 이동할 문서 ID. null이면 클릭 불가 (cat 허브)
  catId?:  string;            // 카테고리 노드인 경우 카테고리 ID
  tx:      number;            // Target X — 이 노드가 위치할 최종 canvas X 좌표
  ty:      number;            // Target Y — 이 노드가 위치할 최종 canvas Y 좌표
}
```

#### `Particle` — 흐름 파티클

```typescript
interface Particle {
  branch:   BranchKey;   // 소속 브랜치 (next/prev/related만 생성)
  progress: number;      // 베지어 곡선상 위치 [0, 1]
  speed:    number;      // 프레임당 progress 증가량 (0.006 ~ 0.010)
  fromHub:  boolean;     // true: Hub→Center 방향(prev), false: Center→Leaf 방향(next)
}
```

#### `ClickTarget` — 히트 영역 레지스트리

```typescript
interface ClickTarget {
  x:      number;         // Leaf 노드 bounding box 좌상단 X
  y:      number;         // Leaf 노드 bounding box 좌상단 Y
  w:      number;         // bounding box 너비 (텍스트 길이에 따라 동적)
  h:      number;         // bounding box 높이 (32px 고정)
  docId:  number | null;  // 클릭 시 selectDoc()에 전달할 문서 ID
}
```

> **설계 메모:** Canvas는 DOM 히트 테스트가 없으므로 매 프레임 `clickTargets[]` 배열을 재계산하고 `mousemove`/`click` 이벤트에서 AABB(Axis-Aligned Bounding Box) 검사를 수행합니다.

---

## 3. 레이아웃 알고리즘

### 3.1 전체 흐름

```
computeBranches(docId)
    ↓
  API 데이터 기반으로 Branch[] 배열 구성
  (cat 1개 고정 + prev/next/related/tag 조건부)
    ↓
positionBranches(branches, cx, cy)
    ↓
  각 Branch의 Hub 좌표 및 Leaf 좌표 계산
    ↓
  render loop에서 좌표 소비
```

### 3.2 `computeBranches` — 브랜치 구성

```typescript
function computeBranches(docId: number): Branch[] {
  const doc = DM[docId];
  const branches: Branch[] = [];

  // 1. 카테고리 브랜치 (항상 존재)
  branches.push({
    key: "cat",
    nodes: [{
      id:    "c_" + doc.cat,
      label: CM[doc.cat].name,
      docId: null,           // 카테고리는 클릭 불가
      catId: doc.cat,
    }],
  });

  // 2. 이전 문서 브랜치 (prev relation이 있을 때만)
  const prevDocs = RELS
    .filter(r => r.from === docId && r.type === "prev")
    .map(r => DM[r.to])
    .filter(Boolean);
  if (prevDocs.length > 0) {
    branches.push({
      key: "prev",
      nodes: prevDocs.map(d => ({ id: d.id, label: d.title, docId: d.id })),
    });
  }

  // 3. 다음 문서 브랜치 (next relation이 있을 때만)
  const nextDocs = RELS
    .filter(r => r.from === docId && r.type === "next")
    .map(r => DM[r.to])
    .filter(Boolean);
  if (nextDocs.length > 0) {
    branches.push({
      key: "next",
      nodes: nextDocs.map(d => ({ id: d.id, label: d.title, docId: d.id })),
    });
  }

  // 4. 연관 문서 브랜치 (related relation이 있을 때만)
  const relDocs = RELS
    .filter(r => r.from === docId && r.type === "related")
    .map(r => DM[r.to])
    .filter(Boolean);
  if (relDocs.length > 0) {
    branches.push({
      key: "related",
      nodes: relDocs.map(d => ({ id: d.id, label: d.title, docId: d.id })),
    });
  }

  // 5. 태그 연결 브랜치 (중복 제거 후 최대 7개)
  const skip = new Set([
    docId,
    ...prevDocs.map(d => d.id),
    ...nextDocs.map(d => d.id),
    ...relDocs.map(d => d.id),
  ]);
  const tagSet = new Set<number>();
  doc.tags.forEach(tag =>
    (TM[tag] || []).forEach(id => { if (!skip.has(id)) tagSet.add(id); })
  );
  if (tagSet.size > 0) {
    branches.push({
      key: "tag",
      nodes: [...tagSet].slice(0, 7).map(id => ({
        id, label: DM[id].title, docId: id,
      })),
    });
  }

  return branches;
}
```

**중복 제거 로직:** 이미 `prev`, `next`, `related`로 포함된 문서는 `skip` Set으로 태그 브랜치에서 제외합니다. 따라서 한 문서가 두 브랜치에 동시에 나타나지 않습니다.

### 3.3 `positionBranches` — 좌표 계산

```typescript
const L1 = 155;   // Center → Hub 거리 (px)
const L2 = 125;   // Hub → Leaf 거리 (px)
const VSPACE = 50; // Leaf 간 수직 간격 (px)

function positionBranches(
  branches: Branch[],
  cx: number,  // canvas 중심 X
  cy: number   // canvas 중심 Y
): void {
  branches.forEach(b => {
    const meta = BRANCH_META[b.key];
    const rad = meta.angle * (Math.PI / 180);  // degree → radian

    // Hub 좌표
    b.meta = meta;
    b.hx = cx + Math.cos(rad) * L1;
    b.hy = cy + Math.sin(rad) * L1;

    // 수직 방향 (허브 방향의 90° 회전)
    const perpRad = rad + Math.PI / 2;
    const count = b.nodes.length;

    b.nodes.forEach((node, i) => {
      // 중앙 정렬된 오프셋: -((n-1)/2)*VSPACE ~ +((n-1)/2)*VSPACE
      const offset = (i - (count - 1) / 2) * VSPACE;
      node.tx = b.hx + Math.cos(rad) * L2 + Math.cos(perpRad) * offset;
      node.ty = b.hy + Math.sin(rad) * L2 + Math.sin(perpRad) * offset;
    });
  });
}
```

**좌표 계산 시각화:**

```
Hub 기준, next 브랜치 (angle = -30°), 리프 3개일 때:

         (-30° 방향으로 L2=125px)
              Leaf[0]  ← offset = -50px (수직 방향)
Hub ────────► Leaf[1]  ← offset =   0px (중앙)
              Leaf[2]  ← offset = +50px (수직 방향)

수직 방향 = (-30° + 90°) = 60° 방향
```

---

## 4. 렌더링 파이프라인

### 4.1 프레임 렌더링 순서 (Z-order)

```
frame(timestamp)
  │
  ├── 1. clearRect (전체 초기화)
  ├── 2. fillRect  (배경 #05080e)
  ├── 3. Grid 선   (50px 간격 점선, opacity 0.012)
  │
  ├── 4. Branch 루프 (각 브랜치별)
  │     ├── 4a. Center → Hub  bezier 연결선
  │     ├── 4b. Hub → Leaf    bezier 연결선들
  │     ├── 4c. Hub 원형 노드
  │     └── 4d. Leaf 라운드렉트 노드들
  │
  ├── 5. Particle 이동 및 렌더링
  └── 6. Center 노드 (최상위 레이어)
```

> **중요:** Center 노드를 마지막에 그려 항상 모든 연결선 위에 렌더링되도록 합니다.

### 4.2 `drawBezier` — Center-to-Hub 연결선

```typescript
function drawBezier(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,   // 시작점 (Center)
  x2: number, y2: number,   // 끝점 (Hub)
  mx: number, my: number,   // 제어점 (중간점)
  color: string,
  lineWidth: number,        // 1.8px
  alpha: number             // 0 ~ 1 (애니메이션 진행도 × 0.4)
): void {
  ctx.save();

  // 그라디언트: 투명 → 반색 → 브랜치 색상
  const grd = ctx.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0,   rgba("#ffffff", 0.05));
  grd.addColorStop(0.4, rgba(color, alpha * 0.5));
  grd.addColorStop(1,   rgba(color, alpha));

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);  // 이차 베지어
  ctx.strokeStyle = grd;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}
```

**제어점:** `mx = (x1+x2)/2`, `my = (y1+y2)/2` — 두 점의 중간에 제어점을 두어 완만한 S자 곡선을 만듭니다.

### 4.3 `drawConnection` — Hub-to-Leaf 연결선

```typescript
function drawConnection(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,   // Hub 좌표
  x2: number, y2: number,   // Leaf 좌표
  hx: number, hy: number,   // 중간 제어점 힌트 (현재 = 두 점의 중간)
  color: string,
  e: number                  // easeOut(animT), 애니메이션 진행도
): void {
  const alpha = e * 0.55;

  // 삼차 베지어 제어점
  const cp1x = x1 + (hx - x1) * 0.5;
  const cp1y = y1 + (hy - y1) * 0.5;
  const cp2x = hx + (x2 - hx) * 0.4;
  const cp2y = hy + (y2 - hy) * 0.4;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);

  const grd = ctx.createLinearGradient(x1, y1, x2, y2);
  grd.addColorStop(0,   "rgba(255,255,255,0.04)");
  grd.addColorStop(0.5, rgba(color, alpha * 0.6));
  grd.addColorStop(1,   rgba(color, alpha));

  ctx.strokeStyle = grd;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}
```

### 4.4 `drawHub` — 브랜치 허브 노드

```typescript
function drawHub(
  ctx: CanvasRenderingContext2D,
  branch: Branch,
  e: number   // 애니메이션 진행도
): void {
  const { hx, hy, meta } = branch;
  const scale = 0.5 + e * 0.5;  // 0.5x → 1.0x (등장 애니메이션)

  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(scale, scale);

  // Radial glow (반경 28px)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
  g.addColorStop(0, rgba(meta.color, 0.2));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // 원형 배경 (반경 20px)
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fillStyle = rgba(meta.color, 0.12);
  ctx.fill();
  ctx.strokeStyle = rgba(meta.color, 0.75);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 아이콘
  ctx.fillStyle = meta.color;
  ctx.font = "13px 'JetBrains Mono'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.icon, 0, 0);
  ctx.restore();

  // 라벨 (scale transform 밖에서 그려야 크기 정상)
  const labelOffset = meta.angle < 0 ? -34 : 34;
  ctx.fillStyle = rgba(meta.color, 0.65);
  ctx.font = "10px 'JetBrains Mono'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.label, hx, hy + labelOffset * e);
}
```

### 4.5 `drawLeaf` — 리프 노드 (연결 문서)

```typescript
function drawLeaf(
  ctx: CanvasRenderingContext2D,
  branch: Branch,
  node: LeafNode,
  e: number,        // 애니메이션 진행도 (globalAlpha로 사용)
  isHover: boolean  // 마우스 호버 상태
): void {
  const { tx: x, ty: y } = node;
  const col = branch.meta.color;

  // 텍스트 측정으로 동적 너비 결정
  const label = truncate(node.label, 16);
  ctx.font = "500 12px 'DM Sans'";
  const tw = ctx.measureText(label).width;
  const w = tw + 32;  // 좌우 패딩 각 16px
  const h = 32;
  const r = 10;       // border-radius
  const lx = x - w / 2;
  const ly = y - h / 2;

  ctx.save();
  ctx.globalAlpha = e;
  if (isHover) { ctx.shadowColor = col; ctx.shadowBlur = 14; }

  // 배경 roundRect
  roundRect(ctx, lx, ly, w, h, r);
  ctx.fillStyle = rgba(col, isHover ? 0.2 : 0.1);
  ctx.fill();
  ctx.strokeStyle = rgba(col, isHover ? 0.9 : 0.45);
  ctx.lineWidth = isHover ? 1.5 : 1;
  ctx.stroke();

  // 왼쪽 컬러 바 (카테고리/타입 구분자)
  roundRect(ctx, lx, ly + 6, 3, h - 12, 1.5);
  ctx.fillStyle = rgba(col, 0.9);
  ctx.fill();

  // 텍스트
  ctx.fillStyle = isHover ? "rgba(255,255,255,0.95)" : "rgba(210,220,235,0.85)";
  ctx.font = "500 12px 'DM Sans'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 2, y);

  ctx.restore();

  // 히트 영역 등록 (매 프레임 갱신)
  clickTargets.push({ x: lx, y: ly, w, h, docId: node.docId });
}
```

### 4.6 `drawCenter` — 중심 노드

```typescript
function drawCenter(
  ctx: CanvasRenderingContext2D,
  docId: number,
  e: number
): void {
  const doc = DM[docId];
  const cat = CM[doc.cat];
  const cx = getCx();
  const cy = getCy();
  const t = Date.now() / 1000;          // 절대 시간 (pulse 계산)
  const pulse = 1 + Math.sin(t * 1.8) * 0.04;  // ±4% 크기 진동
  const R = 46;

  // 외곽 3겹 링 (애니메이션 물결 효과)
  for (let i = 3; i >= 1; i--) {
    const rr = R + i * 13 + Math.sin(t + i * 0.7) * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(cat.color, 0.06 / i);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Radial glow
  const g = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, R * 1.5);
  g.addColorStop(0,   rgba(cat.color, 0.35));
  g.addColorStop(0.6, rgba(cat.color, 0.12));
  g.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, R * pulse * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // 메인 원
  const cg = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, R * pulse);
  cg.addColorStop(0, rgba(cat.color, 0.3));
  cg.addColorStop(1, rgba(cat.color, 0.08));
  ctx.beginPath();
  ctx.arc(cx, cy, R * pulse, 0, Math.PI * 2);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = cat.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 십자 디테일 (방향 표시)
  ctx.strokeStyle = rgba(cat.color, 0.25);
  ctx.lineWidth = 0.8;
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (R + 4),  cy + Math.sin(ang) * (R + 4));
    ctx.lineTo(cx + Math.cos(ang) * (R + 12), cy + Math.sin(ang) * (R + 12));
    ctx.stroke();
  }

  // 제목 (10자 기준 자동 줄바꿈)
  const words = doc.title.split(" ");
  const lines: string[] = [];
  let cur = "";
  words.forEach(w => {
    const test = cur ? cur + " " + w : w;
    if (test.length > 10 && cur) { lines.push(cur); cur = w; }
    else cur = test;
  });
  if (cur) lines.push(cur);

  const lineHeight = 15;
  ctx.font = "600 12px 'Sora'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lineHeight;
    // 드롭 섀도
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(line, cx + 1, y + 1);
    // 본문
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(line, cx, y);
  });

  // 카테고리명 (노드 하단)
  ctx.font = "10px 'JetBrains Mono'";
  ctx.fillStyle = rgba(cat.color, 0.8);
  ctx.fillText(cat.name, cx, cy + R * pulse + 14);
}
```

---

## 5. 애니메이션 시스템

### 5.1 전환 애니메이션 (Document Transition)

문서 선택이 변경될 때 이전 레이아웃에서 새 레이아웃으로 **부드럽게 이동**합니다.

```typescript
// 애니메이션 상태
let animT = 1;             // [0, 1] — 0=시작, 1=완료
const ANIM_DUR = 0.55;     // 초 단위 지속 시간
let lastTime = 0;          // 이전 프레임 타임스탬프
let fromBranches: Branch[] | null = null;  // 전환 시작 시점의 레이아웃 스냅샷

// easeOutCubic — 빠르게 시작 후 부드럽게 감속
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// 프레임마다 animT 진행
function frame(ts: number): void {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);  // 최대 50ms cap
  lastTime = ts;
  if (animT < 1) animT = Math.min(1, animT + dt / ANIM_DUR);
  const e = easeOut(animT);
  // ... 렌더링에 e 사용
}
```

**좌표 보간 (Lerp):**

```typescript
// Hub 좌표: 이전 위치 → 새 위치
const currentHx = fromBranch ? lerp(fromBranch.hx, branch.hx, e) : branch.hx;
const currentHy = fromBranch ? lerp(fromBranch.hy, branch.hy, e) : branch.hy;

// Leaf 좌표: 이전 위치 → 새 위치
const currentTx = fromNode ? lerp(fromNode.tx, node.tx, e) : node.tx;
const currentTy = fromNode ? lerp(fromNode.ty, node.ty, e) : node.ty;
```

**`interpolate` 함수** — 중간 전환 중에 다시 문서를 변경했을 때, 현재 보간 위치를 새 `fromBranches`로 캡처합니다:

```typescript
function interpolate(t: number): Branch[] {
  const e = easeOut(t);
  return branches.map(b => {
    const fb = fromBranches?.find(x => x.key === b.key);
    return {
      ...b,
      hx: fb ? lerp(fb.hx, b.hx, e) : b.hx,
      hy: fb ? lerp(fb.hy, b.hy, e) : b.hy,
      nodes: b.nodes.map((n, i) => {
        const fn = fb?.nodes[i];
        return { ...n, tx: fn ? lerp(fn.tx, n.tx, e) : n.tx, ty: fn ? lerp(fn.ty, n.ty, e) : n.ty };
      }),
    };
  });
}
```

이 함수 덕분에 애니메이션 도중 다른 노드를 클릭해도 **끊김 없이 연속 전환**이 가능합니다.

### 5.2 파티클 시스템 (Particle Flow)

`next`, `prev`, `related` 브랜치의 연결선 위로 **흐르는 빛점**을 표현합니다.

```typescript
// 파티클 생성 (문서 선택 변경 시 재생성)
function updateParticles(): void {
  particles = [];
  branches.forEach(b => {
    if (!["next", "prev", "related"].includes(b.key)) return;
    b.nodes.forEach(() => {
      for (let i = 0; i < 2; i++) {          // 연결선당 2개
        particles.push({
          branch:   b.key as BranchKey,
          progress: Math.random(),             // 초기 위치 분산
          speed:    0.006 + Math.random() * 0.004,
          fromHub:  b.key === "prev",          // prev는 역방향
        });
      }
    });
  });
}

// 베지어 위 위치 계산 (삼차 베지어 공식)
function bezierPoint(
  t: number,
  x1: number, y1: number,
  cpx1: number, cpy1: number,
  cpx2: number, cpy2: number,
  x2: number, y2: number
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*x1 + 3*mt*mt*t*cpx1 + 3*mt*t*t*cpx2 + t*t*t*x2,
    y: mt*mt*mt*y1 + 3*mt*mt*t*cpy1 + 3*mt*t*t*cpy2 + t*t*t*y2,
  };
}
```

**파티클 렌더링 로직:**

- `progress` 0.0 ~ 0.5 → Center-to-Hub 구간
- `progress` 0.5 ~ 1.0 → Hub-to-Leaf 구간
- `alpha = sin(progress × π)` → 양 끝에서 fade in/out
- `prev` 브랜치는 `fromHub: true` → `1 - progress` 방향으로 역행

### 5.3 Center 노드 Pulse

```typescript
const t = Date.now() / 1000;
const pulse = 1 + Math.sin(t * 1.8) * 0.04;  // 1.8 rad/s ≈ 0.29Hz
```

- **주기:** 약 3.5초마다 1회 맥동
- **진폭:** ±4% 크기 변화
- `requestAnimationFrame` 루프와 독립적으로 `Date.now()` 기반이므로 애니메이션 상태와 무관하게 항상 동작

---

## 6. 인터랙션 시스템

### 6.1 이벤트 목록

| 이벤트 | 동작 |
|--------|------|
| `click` Leaf 노드 | `selectDoc(docId)` — 새 문서를 중심으로 재계산 |
| `mousemove` Leaf 노드 위 | `hoverId = docId`, `cursor: pointer`, glow 강조 |
| `mousedown` + drag | 캔버스 패닝 (`offX`, `offY` 오프셋 갱신) |
| `dblclick` | 패닝 초기화 (`offX = offY = 0`) |
| `◀ ▶ 버튼` | `prev`/`next` 브랜치의 첫 번째 문서로 이동 |
| 사이드바 `doc-item` 클릭 | `selectDoc(docId)` |
| 카테고리 필터 칩 클릭 | 사이드바 문서 목록 카테고리 필터링 |

### 6.2 히트 테스트 — AABB (Axis-Aligned Bounding Box)

```typescript
// 매 프레임 clickTargets[] 재계산 (drawLeaf 안에서 push)
// 이벤트 핸들러에서 선형 탐색
canvas.addEventListener("click", (e) => {
  // 드래그 임계값: 4px 이상 이동 시 click 무시
  const wasDrag =
    Math.abs(e.clientX - (panStartX + offX)) > 4 ||
    Math.abs(e.clientY - (panStartY + offY)) > 4;
  if (wasDrag) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  clickTargets.forEach(target => {
    if (
      mx >= target.x && mx <= target.x + target.w &&
      my >= target.y && my <= target.y + target.h &&
      target.docId !== null &&
      target.docId !== selId
    ) {
      selectDoc(target.docId);
    }
  });
});
```

### 6.3 캔버스 패닝

```typescript
let isPanning = false;
let panStartX = 0, panStartY = 0;

canvas.addEventListener("mousedown", e => {
  isPanning = true;
  panStartX = e.clientX - offX;
  panStartY = e.clientY - offY;
});

window.addEventListener("mousemove", e => {
  if (isPanning) {
    offX = e.clientX - panStartX;
    offY = e.clientY - panStartY;
    rebuild();  // 좌표 재계산 후 렌더링
  }
});

window.addEventListener("mouseup", () => isPanning = false);
```

> **설계 메모:** `offX`/`offY` 오프셋은 `getCx()`/`getCy()`에서 `W/2 + offX`, `H/2 + offY + 26`으로 사용되어 Center 노드 위치를 이동시킵니다. 노드 좌표가 offset 기반으로 재계산되므로 히트 영역도 자동으로 이동합니다.

---

## 7. API 연동 명세

### 7.1 그래프 데이터 엔드포인트

```
GET /workspaces/:workspaceId/documents/:docId/graph
```

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `tagLimit` | number | 7 | 태그 연결 브랜치 최대 노드 수 |
| `relatedLimit` | number | 20 | related 브랜치 최대 노드 수 |

**Response Body:**

```json
{
  "document": {
    "id": 3,
    "title": "로컬 LLM 구축 가이드",
    "slug": "local-llm-guide",
    "cat": "c2",
    "tags": ["llm", "local", "ollama", "ai"],
    "updated_at": "2026-04-04T09:30:00Z",
    "author": "codevillain"
  },
  "categories": [
    { "id": "c1", "name": "AI 도구",    "color": "#ff6b6b", "parent": null },
    { "id": "c2", "name": "LLM 활용",   "color": "#ff9f43", "parent": "c1" },
    { "id": "c3", "name": "AI 에이전트","color": "#ffd32a", "parent": "c1" },
    { "id": "c4", "name": "프론트엔드", "color": "#00d2d3", "parent": null },
    { "id": "c5", "name": "백엔드",     "color": "#48dbfb", "parent": null },
    { "id": "c6", "name": "DevOps",     "color": "#a29bfe", "parent": null }
  ],
  "relations": [
    {
      "from": 3, "to": 2, "type": "prev",
      "doc": { "id": 2, "title": "GPT-4 프롬프트 엔지니어링", "slug": "gpt4-prompt", "cat": "c1", "tags": ["ai","llm","gpt","prompt"] }
    },
    {
      "from": 3, "to": 4, "type": "next",
      "doc": { "id": 4, "title": "RAG 시스템 설계", "slug": "rag-system", "cat": "c3", "tags": ["ai","rag","vector","llm"] }
    },
    {
      "from": 3, "to": 5, "type": "related",
      "doc": { "id": 5, "title": "AI 에이전트 패턴", "slug": "ai-agent-patterns", "cat": "c3", "tags": ["ai","agent","llm","automation"] }
    }
  ],
  "tagLinks": [
    {
      "from": 3, "to": 1, "type": "tag",
      "sharedTags": ["llm", "ai"],
      "doc": { "id": 1, "title": "Claude Code 완전 정복", "slug": "claude-code", "cat": "c1", "tags": ["ai","llm","claude","coding"] }
    }
  ]
}
```

### 7.2 클라이언트 데이터 변환

API 응답 → 내부 런타임 구조 변환:

```typescript
function transformPayload(payload: MindMapPayload): void {
  // 카테고리 맵 구성
  const CM: Record<string, Category> = {};
  payload.categories.forEach(c => CM[c.id] = c);

  // 문서 맵 구성 (center + 연결 문서들)
  const DM: Record<number, CenterDocument> = {
    [payload.document.id]: payload.document,
  };
  [...payload.relations, ...payload.tagLinks].forEach(r => {
    DM[r.doc.id] = r.doc as CenterDocument;
  });

  // RELS 배열 구성
  const RELS = payload.relations.map(r => ({
    from: r.from,
    to:   r.to,
    type: r.type,
  }));

  // 태그 맵 구성 (태그 → 문서 ID 배열)
  const TM: Record<string, number[]> = {};
  Object.values(DM).forEach(d => {
    d.tags.forEach(tag => {
      if (!TM[tag]) TM[tag] = [];
      TM[tag].push(d.id);
    });
  });

  // tagLinks를 RELS에 병합하지 않고 별도 처리
  // (computeBranches의 tag 섹션에서 TM으로 재계산)
}
```

---

## 8. React 컴포넌트 이식 가이드

### 8.1 컴포넌트 트리

```
MindMapView                          (페이지 레벨 컴포넌트)
├── MindMapCanvas                    (Canvas 렌더링 담당)
│   └── useCanvasRenderer(hook)      (렌더 루프, 이벤트 바인딩)
├── MindMapTopBar                    (브레드크럼, 네비게이션 버튼)
├── MindMapSidebar                   (문서 목록, 카테고리 필터)
└── MindMapLegend                    (하단 범례)
```

### 8.2 핵심 훅 설계

```typescript
// useMindMap.ts — 데이터 및 상태 관리
export function useMindMap(workspaceId: number, initialDocId: number) {
  const [selId, setSelId] = useState(initialDocId);
  const [payload, setPayload] = useState<MindMapPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 문서 변경 시 API 호출
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/workspaces/${workspaceId}/documents/${selId}/graph`)
      .then(r => r.json())
      .then(data => { setPayload(data); setIsLoading(false); });
  }, [selId, workspaceId]);

  const selectDoc = useCallback((docId: number) => {
    setSelId(docId);
  }, []);

  return { selId, payload, isLoading, selectDoc };
}
```

```typescript
// useCanvasRenderer.ts — Canvas 렌더 루프 관리
export function useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  payload: MindMapPayload | null,
  selId: number,
  onNodeClick: (docId: number) => void
) {
  const animState = useRef({ animT: 1, lastTime: 0, fromBranches: null });
  const branches = useRef<Branch[]>([]);
  const clickTargets = useRef<ClickTarget[]>([]);

  useEffect(() => {
    if (!payload) return;
    // branches 재계산 + 애니메이션 시작
    const newBranches = computeBranches(selId, payload);
    positionBranches(newBranches, canvas.width / 2, canvas.height / 2);
    animState.current.fromBranches = [...branches.current];
    branches.current = newBranches;
    animState.current.animT = 0;
  }, [selId, payload]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      // ... 렌더링 로직
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 클릭 이벤트 등록
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      clickTargets.current.forEach(t => {
        if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h && t.docId) {
          onNodeClick(t.docId);
        }
      });
    };
    canvas.addEventListener("click", handler);
    return () => canvas.removeEventListener("click", handler);
  }, [onNodeClick]);
}
```

### 8.3 파일 구조

```
apps/web/
└── components/
    └── graph/
        ├── MindMapView.tsx          ← 최상위 컴포넌트
        ├── MindMapCanvas.tsx        ← Canvas 래퍼
        ├── MindMapTopBar.tsx        ← 상단 바
        ├── MindMapSidebar.tsx       ← 우측 문서 목록
        ├── MindMapLegend.tsx        ← 하단 범례
        ├── hooks/
        │   ├── useMindMap.ts        ← 데이터 페칭 훅
        │   └── useCanvasRenderer.ts ← 렌더 루프 훅
        ├── lib/
        │   ├── layout.ts            ← computeBranches, positionBranches
        │   ├── draw.ts              ← drawCenter, drawHub, drawLeaf, ...
        │   ├── animate.ts           ← easeOut, lerp, interpolate
        │   ├── particles.ts         ← Particle 시스템
        │   └── hitTest.ts           ← ClickTarget AABB 검사
        └── types.ts                 ← 모든 타입 정의
```

### 8.4 성능 최적화 포인트

| 항목 | 현재 (프로토타입) | 개선 방안 |
|------|----------------|---------|
| 브랜치 데이터 | 매 프레임 RELS 선형 탐색 | `useMemo`로 캐시 |
| 폰트 렌더링 | 매 텍스트마다 `font` 설정 | 동일 스타일 묶어서 처리 |
| 히트 테스트 | 전체 `clickTargets` 순회 | R-tree 또는 공간 해시 |
| 그라디언트 | 매 프레임 재생성 | 정적 브랜치는 캐시 |
| Canvas 크기 | `devicePixelRatio` 미적용 | HiDPI 지원 (`scale(dpr, dpr)`) |
| 노드 수 증가 | 제한 없음 | tag 브랜치 최대 7개 → 페이지네이션 |

**HiDPI 대응 코드:**

```typescript
function setupHiDPICanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return ctx;
}
```

---

## 9. 확장 로드맵

### 9.1 Phase 2 우선 구현 항목

| 기능 | 설명 | 난이도 |
|------|------|--------|
| **Zoom (스크롤 휠)** | `ctx.scale()` 기반 확대/축소, `offX`/`offY`와 연동 | 중 |
| **노드 툴팁** | hover 시 floating tooltip (제목 전체, 태그 목록, 작성일) | 하 |
| **검색 하이라이트** | 검색어 매칭 노드만 강조, 나머지 dim | 중 |
| **태그 필터** | 특정 태그 선택 시 해당 태그 연결 브랜치만 표시 | 하 |
| **HiDPI 지원** | `devicePixelRatio` 적용 | 하 |

### 9.2 Phase 3 고도화 항목

| 기능 | 설명 | 난이도 |
|------|------|--------|
| **Depth-2 확장** | Leaf 노드를 클릭할 때 해당 문서의 relations를 추가 전개 | 상 |
| **전체 그래프 뷰** | 워크스페이스 전체 문서를 DAG/Force graph로 시각화 | 상 |
| **편집 모드** | 마인드맵 위에서 바로 관계 추가/제거 drag & drop | 상 |
| **공유 스냅샷** | 현재 뷰를 PNG/SVG로 export | 중 |
| **임베드 모드** | `<iframe>` 또는 `<markdown-mindmap>` 웹 컴포넌트 | 중 |

### 9.3 디자인 토큰 (CSS 변수 → 테마 연동)

```typescript
// 워크스페이스 테마와 마인드맵 색상 연동
interface MindMapTheme {
  bg:          string;   // 캔버스 배경색
  gridColor:   string;   // 그리드 선 색상
  textPrimary: string;   // 제목 텍스트
  textDim:     string;   // 보조 텍스트
  // 브랜치 색상은 BRANCH_META에서 관리
}

const DEFAULT_THEME: MindMapTheme = {
  bg:          "#05080e",
  gridColor:   "rgba(255,255,255,0.012)",
  textPrimary: "rgba(255,255,255,0.95)",
  textDim:     "rgba(100,116,139,1)",
};
```

워크스페이스의 `theme_css` / `theme_preset` 컬럼 값을 파싱하여 `MindMapTheme`으로 매핑하면 워크스페이스 단위 테마 적용이 가능합니다.

---

## 부록 A. 유틸리티 함수 전체 목록

```typescript
// 색상
function rgba(hex: string, alpha: number): string
// hex → "rgba(r,g,b,a)" 변환. "rgba(...)" 입력 시 alpha만 교체

// 수학
function lerp(a: number, b: number, t: number): number
// 선형 보간: a + (b - a) * t

function easeOut(t: number): number
// easeOutCubic: 1 - (1 - t)^3

function bezierPoint(t, x1, y1, cpx1, cpy1, cpx2, cpy2, x2, y2): {x, y}
// 삼차 베지어 위의 t지점 좌표 반환

// 텍스트
function wrapText(text: string, maxLen: number): string
// maxLen 초과 시 "…" truncate

// Canvas
function roundRect(ctx, x, y, w, h, r): void
// ctx.beginPath()로 rounded rectangle path 생성 (stroke/fill은 호출부에서)
```

---

## 부록 B. 브랜치 각도 참조

```
           -90° (top)
            ⬡ 카테고리

◀ -150°               -30° ▶
  이전 문서           다음 문서

                [중심]

# +150°               +40° ↔
  태그 연결          연관 문서

           +90° (bottom)
            (미사용)
```

**각도 → 라디안 변환:**

| 각도 | 라디안 | 브랜치 |
|------|--------|--------|
| −90° | −π/2 | 카테고리 |
| −150° | −5π/6 | 이전 문서 |
| −30° | −π/6 | 다음 문서 |
| +40° | +2π/9 | 연관 문서 |
| +150° | +5π/6 | 태그 연결 |
