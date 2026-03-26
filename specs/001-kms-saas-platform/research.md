# Research: KMS SaaS Platform

**Date**: 2026-03-26
**Status**: Complete — 모든 기술 결정이 기존 설계 문서(007_architecture.md)에 이미 확정됨

## 1. Backend Framework

**Decision**: Fastify 4+
**Rationale**: Express 대비 2-3x 성능, TypeScript 네이티브 스키마 검증(JSON Schema), 플러그인 아키텍처
**Alternatives considered**:
- Express: 생태계 크지만 성능 열위, TypeScript 지원 부족
- Hono: 경량이지만 생태계 미성숙
- tRPC: 풀스택 타입 안전성이지만 REST API 요구사항과 불일치 (Embed API, 외부 연동 고려)

## 2. ORM

**Decision**: Drizzle ORM
**Rationale**: TypeScript 네이티브, 경량, SQL에 가까운 쿼리 빌더, drizzle-kit으로 마이그레이션 관리
**Alternatives considered**:
- Prisma: 타입 안전하지만 무겁고, 생성된 클라이언트 크기 문제
- Kysely: 쿼리 빌더만 제공, 마이그레이션 도구 별도 필요
- TypeORM: 데코레이터 기반, strict mode 호환성 문제

## 3. Authentication

**Decision**: JWT Access Token (15분) + Refresh Token (7일, HttpOnly Cookie)
**Rationale**: Stateless 수평 확장 가능, HttpOnly Cookie로 XSS 방어, Refresh Token으로 UX 유지
**Alternatives considered**:
- Session 기반: 상태 서버 필요, 수평 확장 시 sticky session 또는 Redis 세션 스토어 필요
- OAuth2 only: Phase 1에서는 이메일/비밀번호가 우선, 소셜 로그인은 Phase 2

## 4. Category Hierarchy

**Decision**: Closure Table (ancestor_id, descendant_id, depth)
**Rationale**: 서브트리 조회 O(1), 이동/삭제 시 정합성 유지 용이, 무제한 중첩 지원
**Alternatives considered**:
- Adjacency List (parent_id): 단순하지만 서브트리 조회에 재귀 쿼리 필요
- Nested Set: 읽기 빠르지만 삽입/이동 시 전체 재정렬 필요
- Materialized Path: 문자열 기반, 인덱스 효율 낮음

## 5. Frontend State Management

**Decision**: Zustand 4+ (클라이언트 상태) + TanStack Query 5+ (서버 상태)
**Rationale**: Zustand는 경량 hooks 친화, TanStack Query는 캐싱/낙관적 업데이트/재시도 내장
**Alternatives considered**:
- Redux Toolkit: 보일러플레이트 과다
- Jotai/Recoil: 원자적 상태에 적합하지만 서버 상태 캐싱 부재
- SWR: TanStack Query 대비 기능 부족 (낙관적 업데이트, 병렬 쿼리)

## 6. Styling (KMS App)

**Decision**: Tailwind CSS 4+
**Rationale**: 유틸리티 퍼스트, 빠른 프로토타이핑, Next.js 공식 지원, 에디터 `.mf-` 네임스페이스와 충돌 없음
**Alternatives considered**:
- CSS Modules: 에디터와 충돌 없지만 개발 속도 느림
- styled-components: SSR 설정 복잡, 런타임 오버헤드

## 7. Document Version Strategy

**Decision**: Phase 1에서는 매 저장 시 전체 스냅샷, 최대 20개 FIFO
**Rationale**: 구현 단순, Phase 1 규모(~1,000 문서)에서 스토리지 부담 낮음
**Alternatives considered**:
- Diff 기반: 스토리지 효율적이지만 복원 시 리빌드 필요, Phase 2에서 도입
- Event Sourcing: 과도한 복잡성, YAGNI 원칙 위반

## 8. Circular Reference Prevention (Document Links)

**Decision**: DFS 기반 순환 감지 (서버사이드)
**Rationale**: Prev/Next 체인의 깊이가 실용적 범위(~100 문서) 내이므로 DFS 충분
**Alternatives considered**:
- DB 제약 (CHECK): SQL로 그래프 순환 감지 불가
- 클라이언트 사이드 검증만: 우회 가능, 서버 검증 필수

## 9. Import/Export Format

**Decision**: .md 단일 파일 + .zip (폴더 구조 유지)
**Rationale**: Phase 1 최소 범위. 마크다운은 그 자체로 이식성 최고
**Alternatives considered**:
- HTML/PDF Export: Phase 2에서 서버사이드 Puppeteer로 구현
- JSON Export: 마크다운 사용자 기대와 불일치

## 10. Rate Limiting

**Decision**: Redis 기반 sliding window (IP 기준 10회/15분)
**Rationale**: Redis TTL로 자연 만료, 정밀한 윈도우 제어
**Alternatives considered**:
- 메모리 기반: 서버 재시작 시 초기화, 수평 확장 시 공유 불가
- Token Bucket: 구현 복잡, Phase 1에서는 과도
