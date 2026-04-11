# Research Summary — MarkFlow KMS Phase 2 MVP

**Synthesized:** 2026-04-11
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Executive Summary

MarkFlow Phase 2는 이미 작동하는 KMS 위에 검색, 버전 관리, 외부 공유 기능의 "last mile"을 완성하는 단계다. category_closure, embed_tokens, document_relations, 클라이언트 diff 로직이 모두 존재하지만 REST endpoint나 서버 연산이 빠져있는 상태다. **대부분의 작업은 새 기능 발명이 아니라 기존 인프라를 노출시키는 것이다.**

## Stack — 신규 추가

| 기술 | 용도 | 신뢰도 |
|------|------|--------|
| `pg_trgm` (PostgreSQL 내장) | GIN 인덱스 ILIKE 가속 | MEDIUM — 한국어 fuzzy 미지원 |
| `diff` v8.0.4 → apps/api | 서버사이드 라인 diff | HIGH — 이미 apps/web에 존재 |
| `open-graph-scraper` v6.11.0 | OG 메타데이터 추출 | MEDIUM-HIGH |
| Cloudflare Workers Secrets | Worker 인증 | HIGH — 단일 소비자, JWT 불필요 |
| Next.js App Router 공개 라우트 | embed 페이지 | HIGH — 기존 스택 재활용 |

## Table Stakes Features (필수)

- **T1+T2**: 검색 관련성 랭킹 + 서버사이드 스니펫 (현재 ILIKE만, 랭킹/하이라이트 없음)
- **T3**: 버전 diff 서버 API (클라이언트 diff는 대용량 문서에서 UI 블로킹)
- **T4**: 공개 embed 렌더링 페이지 (토큰 CRUD 완성, 렌더링 없음)
- **T5**: 카테고리 ancestors REST API (closure 스키마 있으나 endpoint 없음)
- **T6**: 문서 컨텍스트 집계 API (N+1 관계 조회를 단일 endpoint로)

## Defer to Phase 3+

- Split diff 뷰, Embed 브랜딩, 로컬 그래프, External 검색 엔진, CRDT 협업, AI 검색

## Architecture — 핵심 결정

1. **publicRoutes** Fastify 플러그인 분리 (authMiddleware 비상속)
2. 모든 신규 서비스는 기존 `createXxxService(db)` 팩토리 패턴 준수
3. **Layer 1**(보안+read-only) → **Layer 2**(pg_trgm+diff) → **Layer 3**(공개 서비스) 순서

## Top 5 Pitfalls

| # | 위험 | 심각도 | 대응 |
|---|------|--------|------|
| 1 | pg_trgm 한국어 미지원 | CRITICAL | GIN 가속 ILIKE 사용, fuzzy는 영문 한정. Phase 3에서 pg_bigm 검토 |
| 2 | OG 프리뷰 SSRF | HIGH | HTTPS 한정, DNS resolve 후 사설 IP 재검증, 5초 타임아웃 |
| 3 | graph-service.ts 전체 relation 풀 스캔 | HIGH | WHERE source_id = ANY($1) 수정 필수 |
| 4 | R2 Worker 인증 시 기존 업로드 파괴 | HIGH | 프론트엔드 먼저 배포, API_SECRET 없으면 검증 스킵 |
| 5 | embed 페이지 XSS | HIGH | parseMarkdown() 재사용 강제 + CSP script-src 'none' |

## Suggested Phases (3개)

| Phase | 목표 | 핵심 작업 | 위험 |
|-------|------|-----------|------|
| 1 | 보안 기반 강화 + 읽기 전용 API 완성 | Worker 인증 + category/context endpoint + graph N+1 수정 + P1 긴급 API | LOW |
| 2 | 검색 강화 + 버전 Diff API | pg_trgm 마이그레이션 + 검색 랭킹/스니펫 + diff 서버 API | MEDIUM |
| 3 | 공개 서비스 (Embed + OG 프리뷰) | publicRoutes 플러그인 + embed 렌더링 + OG 스크래퍼 | MEDIUM (보안 심사 필요) |

## Open Questions

- 한국어 pg_trgm 실제 동작 런타임 검증 필요 (`similarity('마크다운', '마크다운')` 값 확인)
- embed-token-service.ts의 hashPassword()가 bcrypt인지 확인 후 SHA-256 전환 결정
- 배포 환경에서 pg_trgm/pg_bigm 확장 설치 가능 여부 확인

---
*Synthesized: 2026-04-11 from 4 parallel research agents*
