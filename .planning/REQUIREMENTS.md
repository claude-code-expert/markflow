# Requirements: MarkFlow KMS Phase 2 MVP

**Defined:** 2026-04-11
**Core Value:** 팀이 마크다운으로 지식을 체계적으로 관리하고 공유할 수 있어야 한다

## v1 Requirements

Requirements for Phase 2 MVP. Each maps to roadmap phases.

### Auth

- [ ] **AUTH-01**: 로그인한 사용자가 현재 비밀번호 확인 후 새 비밀번호로 변경할 수 있다

### Security

- [ ] **SEC-01**: R2 Worker가 ALLOWED_ORIGINS 환경변수로 허용된 origin만 CORS 응답한다
- [ ] **SEC-02**: R2 Worker가 API_SECRET 환경변수 설정 시 Bearer 토큰 없는 업로드를 거부한다
- [ ] **SEC-03**: SECURITY.md에 Avatar(SVG 거부)/Editor(SVG 허용) 분리 근거와 렌더링 규칙이 문서화되어 있다
- [ ] **SEC-04**: graph-service.ts가 워크스페이스 소속 문서의 relation만 조회한다 (전체 풀 스캔 제거)
- [ ] **SEC-05**: relation-service.ts의 N+1 쿼리가 JOIN 기반 배치 쿼리로 리팩터링되어 있다

### Test

- [ ] **TEST-01**: 댓글 CRUD 통합 테스트가 생성/조회/수정/삭제/해결/권한/스레딩을 검증한다
- [ ] **TEST-02**: 이미지 업로드 테스트가 타입 검증/크기 제한/CORS/성공 업로드/에러 처리를 검증한다

### Search

- [ ] **SRCH-01**: 워크스페이스 내 문서를 제목과 본문으로 검색할 수 있다 (pg_trgm GIN 인덱스 가속)
- [ ] **SRCH-02**: 검색 결과가 관련성 순으로 정렬되고 매칭 스니펫을 포함한다

### Version

- [ ] **VER-01**: 서버 API로 두 버전 간 구조화된 diff를 조회할 수 있다
- [ ] **VER-02**: diff 응답이 추가/삭제/변경된 라인을 구분하여 반환한다

### Category

- [ ] **CAT-01**: 특정 카테고리의 모든 조상(ancestors)을 단일 API 호출로 조회할 수 있다 (breadcrumb용)
- [ ] **CAT-02**: 특정 카테고리의 모든 하위(descendants)를 단일 API 호출로 조회할 수 있다

### Document

- [ ] **DOC-01**: 단일 문서의 전후방 관계(incoming/outgoing)를 단일 API로 조회할 수 있다 (DAG context)
- [ ] **DOC-02**: DAG context가 관련 문서 메타데이터(제목, 카테고리)를 포함한다

### Embed

- [ ] **EMBD-01**: 유효한 embed 토큰으로 문서를 인증 없이 렌더링할 수 있다
- [ ] **EMBD-02**: 만료/취소된 토큰은 접근이 거부된다
- [ ] **EMBD-03**: embed 페이지가 CSP 헤더(script-src 'none')로 XSS를 방어한다

### LinkPreview

- [ ] **LINK-01**: URL의 OG 메타데이터(title, description, image)를 서버 프록시로 가져올 수 있다
- [ ] **LINK-02**: 사설 IP/내부 네트워크 URL 요청이 차단된다 (SSRF 방어)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Email

- **EMAIL-01**: 이메일 재발송 API (POST /auth/resend-verification) -- 이메일 서비스 연동과 함께 구현
- **EMAIL-02**: 실제 이메일 발송 서비스 연동 (Resend/SendGrid) -- logger.info() 대체

### Collaboration

- **COLLAB-01**: 실시간 동시 편집 (y-websocket CRDT)
- **COLLAB-02**: 편집 중 다른 사용자 커서 표시

### SearchAdvanced

- **SRCH-03**: 한국어 fuzzy 검색 (pg_bigm 또는 외부 검색 엔진)
- **SRCH-04**: 필터 조합 검색 (태그, 작성자, 날짜 범위)

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth 2.0 (Google/GitHub) | Phase 3 -- 소셜 로그인은 베타 후 결정 |
| Activity Feed & 알림 | Phase 3 -- 현재 사용자 수에서 불필요 |
| Public Pages & 커스텀 도메인 | Phase 3 -- embed로 기본 공유 충족 |
| AI Writing Assistant | Phase 3 -- 핵심 기능 안정화 우선 |
| 수익화 (Stripe) | Phase 3 -- 베타 피드백 후 결정 |
| Split diff 뷰 | 리서치에서 차별화 기능으로 분류, MVP에 불필요 |
| Embed 브랜딩 커스터마이징 | 차별화 기능, MVP에 불필요 |
| 외부 검색 엔진 (Meilisearch) | 10팀 규모에서 과도한 인프라 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| TEST-01 | Phase 2 | Pending |
| TEST-02 | Phase 2 | Pending |
| CAT-01 | Phase 3 | Pending |
| CAT-02 | Phase 3 | Pending |
| DOC-01 | Phase 3 | Pending |
| DOC-02 | Phase 3 | Pending |
| SRCH-01 | Phase 4 | Pending |
| SRCH-02 | Phase 4 | Pending |
| VER-01 | Phase 4 | Pending |
| VER-02 | Phase 4 | Pending |
| EMBD-01 | Phase 5 | Pending |
| EMBD-02 | Phase 5 | Pending |
| EMBD-03 | Phase 5 | Pending |
| LINK-01 | Phase 5 | Pending |
| LINK-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after roadmap creation*
