# Phase 3: Category & Document Context API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 03-category-document-context-api
**Areas discussed:** Ancestors 응답 형태, Descendants 응답 형태, DAG 컨텍스트 응답 설계, 엔드포인트 설계

---

## Ancestors 응답 형태

| Option | Description | Selected |
|--------|-------------|----------|
| Root → Leaf (추천) | breadcrumb UI에서 바로 사용 가능. 프론트엔드 정렬 불필요 | ✓ |
| Leaf → Root | DB에서 depth DESC로 바로 나오는 순서. 서버 코드 단순하지만 프론트에서 reverse 필요 | |

**User's choice:** Root → Leaf
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| ID + 이름만 (추천) | breadcrumb에 필요한 최소 데이터. {id, name, depth} | |
| 풀 카테고리 객체 | id, name, parentId, depth, createdAt 포함. 추가 조회 없이 활용 가능 | ✓ |
| 이름 + 문서 수 | breadcrumb에 문서 수 배지 표시. 추가 JOIN 필요 | |

**User's choice:** 풀 카테고리 객체
**Notes:** None

---

## Descendants 응답 형태

| Option | Description | Selected |
|--------|-------------|----------|
| Nested tree (추천) | 기존 tree() 패턴과 동일한 재귀 구조. 사이드바 트리 렌더링에 바로 사용 | ✓ |
| Flat list + depth | 평탄한 배열, depth 필드 포함. 프론트에서 트리 조립 필요 | |

**User's choice:** Nested tree
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 (추천) | 각 카테고리에 소속된 문서(id, title, updatedAt) 포함. 기존 tree() 패턴과 동일 | ✓ |
| 미포함 | 카테고리 계층만 반환. 문서는 별도 API로 조회 | |
| documentCount만 | 문서 객체 대신 각 카테고리의 문서 수만 포함 | |

**User's choice:** 포함
**Notes:** None

---

## DAG 컨텍스트 응답 설계

| Option | Description | Selected |
|--------|-------------|----------|
| title + category (추천) | {id, title, categoryId, categoryName}. documents와 categories JOIN | |
| title만 (현재와 동일) | 기존 getRelations()과 동일하게 {id, title}만 | |
| title + category + tags | 태그까지 포함. 더 풍부한 그래프 노드 렌더링 가능하지만 추가 JOIN 필요 | ✓ |

**User's choice:** title + category + tags
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| incoming + outgoing + related (추천) | 3분류: incoming(이 문서를 참조하는), outgoing(이 문서가 참조하는), related(양방향) | ✓ |
| prev/next/related (현재 패턴) | 기존 getRelations() 구조 유지. 프론트엔드에서 이미 사용 중 | |

**User's choice:** incoming + outgoing + related
**Notes:** None

---

## 엔드포인트 설계

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 categories 라우트 (추천) | categories.ts에 ancestors/descendants 추가. URL 구조 직관적 | ✓ |
| 별도 context 라우트 | 새 context.ts 파일 생성. read-only 엔드포인트 분리 | |

**User's choice:** 기존 categories 라우트
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 graph 라우트에 추가 | graph.ts에 문서 DAG context 추가 | ✓ |
| 문서 라우트에 추가 (추천) | documents.ts에 추가. REST 자원 계층이 자연스러움 | |
| 별도 context 라우트 | categories와 함께 context.ts에서 관리 | |

**User's choice:** 기존 graph 라우트에 추가
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| viewer (추천) | read-only API이므로 기존 GET 엔드포인트와 동일한 viewer 권한 | ✓ |
| member | 워크스페이스 멤버면 누구나 조회 가능 | |

**User's choice:** viewer
**Notes:** None

---

## Claude's Discretion

- categoryClosure 쿼리 최적화 방식
- DAG context의 tags JOIN 구현 방식
- 응답 타입 정의 위치 및 네이밍
- 서비스 레이어 함수 분리 방식

## Deferred Ideas

None — discussion stayed within phase scope
