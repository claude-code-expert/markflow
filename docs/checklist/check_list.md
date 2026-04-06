# MarkFlow KMS -- 전체 Phase 체크리스트

> **작성일:** 2026-04-05
> **기준:** develop 브랜치, checklist-04-04 감사 결과 + 코드베이스 분석
> **범위:** Phase 0 ~ Phase 3 전체

---

## 현황 요약

| Phase | 상태 | 완성도 | 주요 지표 |
|-------|------|--------|----------|
| Phase 0 (Editor) | ✅ 완료 | 100% | npm 배포 가능, 24개 의존성, ESM+CJS |
| Phase 1 (Prototype) | ✅ 완료 (잔여 작업 있음) | ~90% | API 40/56, 프론트 14/14 페이지, DB 13/15 |
| Phase 2 (MVP) | 📋 계획 (일부 진행 중) | ~5% | 이미지 업로드 모듈 진행 중 |
| Phase 3 (Launch) | 📋 계획 | 0% | 미착수 |

---

## Phase 0 -- Editor Package ✅

> **기간:** 2026-03-10 ~ 2026-03-26 | **패키지:** `@markflow/editor`

- [x] CodeMirror 6 Dual View (에디터 + 프리뷰)
- [x] CommonMark 0.28 + GFM 문법 지원
- [x] 전체 툴바 (H1-H6, Bold/Italic/Strikethrough, 리스트, 코드, 링크, 이미지, 테이블, HR, Math)
- [x] Light/Dark 테마 전환 + 스크롤 동기화
- [x] KaTeX 수식 렌더링 + rehype 구문 강조
- [x] Cloudflare R2 이미지 업로드 지원 (createCloudflareUploader)
- [x] ESM + CJS 듀얼 빌드, CSS export
- [x] Next.js App Router 호환 (`use client`)
- [x] `.mf-` CSS 클래스 / `--mf-` CSS 변수 네임스페이스
- [x] peerDependencies: React ^18 || ^19 만 요구

### Phase 0 잔여

- [ ] `package.json` → `"private": false` 변경 (npm publish 준비)

---

## Phase 1 -- Prototype ✅ (잔여 작업 있음)

> **기간:** 2026-04-01 ~ 2026-04-04 | **목표:** 내부 팀 사용 가능 수준

### 1.1 인증 (Auth)

| 항목 | API | Frontend | 상태 |
|------|-----|----------|------|
| 회원가입 | POST /auth/register | /register | ✅ |
| 로그인 | POST /auth/login | /login | ✅ |
| 토큰 갱신 | POST /auth/refresh | — | ✅ |
| 로그아웃 | POST /auth/logout | — | ✅ |
| 이메일 인증 | GET /auth/verify-email | /verify-email | ✅ |
| 계정 잠금 | 5회 실패 → 15분 락 | — | ✅ |
| 속도 제한 | 10 req/15min | — | ✅ |

### 1.2 사용자 (Users)

| 항목 | API | 상태 |
|------|-----|------|
| 내 정보 조회 | GET /users/me | ✅ |
| 프로필 수정 | PATCH /users/me | ✅ |
| 아바타 업로드 | PUT /users/me/avatar | ⏳ 파일 검증만 (R2 미연동) |

### 1.3 워크스페이스 (Workspaces)

| 항목 | API | Frontend | 상태 |
|------|-----|----------|------|
| CRUD | GET/POST/PATCH/DELETE | /workspaces | ✅ |
| 소유권 이전 | POST /transfer | 설정 페이지 | ✅ |
| 공개 목록 | GET /workspaces/public | 검색 모달 | ✅ |
| 멤버 관리 | GET/PATCH/DELETE /members | /settings/members | ✅ |
| 초대 | POST /invitations, GET/POST /invitations/:token | /invite/[token] | ✅ |
| 가입 요청 | POST/GET/PATCH /join-requests (+ batch) | JoinRequestPanel | ✅ |

### 1.4 카테고리 (Categories)

| 항목 | API | 상태 |
|------|-----|------|
| CRUD | POST/GET/PATCH/DELETE | ✅ |
| 트리 조회 | GET /categories/tree | ✅ |
| 재정렬 | PUT /categories/reorder | ✅ |

### 1.5 문서 (Documents)

| 항목 | API | Frontend | 상태 |
|------|-----|----------|------|
| CRUD | POST/GET/PATCH/DELETE | /[ws]/doc/[id] | ✅ |
| 자동 저장 | PATCH (1s debounce) | 에디터 | ✅ |
| 소프트 삭제 | DELETE (soft) | — | ✅ |
| 버전 목록 | GET /versions | VersionHistoryPanel | ✅ |
| 버전 복원 | POST /restore-version | — | ✅ |
| 태그 | GET/PUT /tags | TagInput | ✅ |
| 관계 (DAG) | PUT/GET /relations | DocumentLinksModal | ✅ |
| 댓글 | GET/POST/DELETE /comments | CommentPanel | ✅ |
| 휴지통 | GET/POST/DELETE /trash | /[ws]/trash | ✅ |
| Import/Export | POST /import, GET /export | ImportExportModal | ✅ |

### 1.6 추가 기능

| 항목 | 상태 |
|------|------|
| 테마 커스텀 (프리셋 5종 + CSS 변수) | ✅ |
| 임베드 토큰 CRUD | ✅ |
| 프레젠테이션 모드 (TOC 네비게이션) | ✅ |
| 검색 모달 (Cmd+/) | ✅ |
| 그래프 뷰 (DAG 시각화) | ✅ |
| 랜딩 페이지 (Hero + Features + Pricing + Footer) | ✅ |
| 토스트 알림 시스템 | ✅ |

### 1.7 인프라 & 미들웨어

- [x] JWT 인증 미들웨어
- [x] RBAC (Owner/Admin/Editor/Viewer)
- [x] CSRF 방어 (Origin + SameSite)
- [x] 워크스페이스 스코프 미들웨어
- [x] CORS 설정
- [x] 휴지통 정리 잡 (30일 자동 삭제)

### 1.8 Phase 1 잔여 작업

> Phase 1에서 구현되지 않은 항목. Phase 2 시작 전 또는 병행 처리 필요.

- [ ] **`documents.start_mode`** — 스키마/API 모두 미구현. Spec에서 제거할지 구현할지 결정 필요
- [ ] **Spec 문서 v1_3 동기화** — 9개 문서 불일치 (아래 §문서 섹션 참조)
- [ ] **ERD 업데이트** — 7건 불일치 (ID 타입, theme/embed 테이블 누락 등)
- [ ] **이메일 재발송** — POST /auth/resend-verification (프론트에서 호출 중이나 API 미구현)

---

## Phase 2 -- MVP 📋

> **예상 기간:** 2026-04-14 ~ 2026-06-09 (6~8주)
> **목표:** 베타 사용자 10팀 온보딩

### 2.1 P1 우선순위 -- 핵심 완성

#### 2.1.1 비밀번호 재설정 플로우

- [ ] POST /auth/forgot-password — 비밀번호 리셋 이메일 발송
- [ ] POST /auth/reset-password — 토큰 기반 비밀번호 재설정
- [ ] PATCH /users/me/password — 비밀번호 변경 (로그인 상태)
- [ ] 비밀번호 리셋 요청 페이지 UI
- [ ] 비밀번호 재설정 페이지 UI
- [ ] 이메일 서비스 연동 (Resend, console.log 대체)
- [ ] 테스트: 유효/만료 토큰, 비밀번호 강도 검증

#### 2.1.2 이미지 업로드 통합 (Avatar + Editor R2)

> **진행 중** — 설정 페이지 + 에디터 연동 완료, Avatar 연동 남음 (2026-04-06 업데이트)

- [x] 통합 업로드 모듈 (`image-upload.ts`) 완성
  - [x] Avatar 검증: JPG/PNG/WebP, 5MB
  - [x] Editor 검증: PNG/JPEG/GIF/WebP/SVG, 10MB
  - [x] Worker URL 해석: env var (`NEXT_PUBLIC_R2_WORKER_URL`) > localStorage (`mf-cf-worker-url`)
  - [x] 이미지 업로드 토글: `isImageUploadEnabled()` / `setImageUploadEnabled()` (localStorage `mf-image-upload-enabled`)
- [ ] Avatar 업로드 흐름 변경: R2 Worker → URL 획득 → PATCH /users/me
  - [ ] 프로필 편집 모달 (profile-edit-modal.tsx) 카메라 버튼 연동
  - [ ] Worker 미설정 시 StorageGuidePanel 표시
- [x] 이미지 저장소 설정 페이지 (`/settings/storage`)
  - [x] 이미지 업로드 사용/미사용 토글 (ON/OFF)
  - [x] 이미지 업로드 사용법 도움말 패널 (3단계)
  - [x] 연결 상태 표시 (연동 완료/미설정)
  - [x] Worker URL 입력 (env var 설정 시 비활성화)
  - [x] 연결 테스트 (테스트 이미지 업로드 + URL 반환 검증)
  - [x] 설정 가이드 → StorageGuidePanel 우측 패널로 열기 (에디터와 동일 UX)
  - [x] 미설정 시 CTA 버튼으로 가이드 패널 열기 유도
- [x] 에디터 이미지 업로드 연동
  - [x] 드래그앤드롭, 붙여넣기, 파일 선택 3가지 입력 경로
  - [x] Worker 미설정 시 에디터 내장 ImageUploadGuide 모달 / StorageGuidePanel
  - [x] 업로드 토글 OFF 시 업로드 비활성화, 버튼 클릭 시 설정 페이지로 이동
  - [x] 플레이스홀더 → 완료 URL 교체 패턴
- [x] 에러 처리: NO_WORKER_URL, VALIDATION_FAILED, UPLOAD_FAILED
- [x] R2 Worker CORS 설정 (ALLOWED_ORIGINS)
- [ ] 테스트: 업로드 성공/실패, 네트워크 단절, 미설정 상태

#### 2.1.3 댓글 수정/해결 API

- [ ] PATCH /comments/:commentId — 댓글 내용 수정
- [ ] PATCH /comments/:commentId — 해결 상태 토글 (resolved)
- [ ] CommentPanel UI 업데이트 (수정/해결 버튼)
- [ ] 테스트: 권한 체크, 수정 이력

### 2.2 P2 우선순위 -- 기능 확장

#### 2.2.1 워크스페이스 전체 검색

- [ ] GET /workspaces/:id/search — 풀텍스트 검색 API
  - [ ] 필터: category, tag, author, date range
  - [ ] PostgreSQL `ts_vector` / `ts_query` 활용
- [ ] 검색 모달 고도화 (현재 title LIKE만 지원)
  - [ ] 필터 UI (카테고리, 태그, 작성자, 날짜)
  - [ ] 검색 결과 하이라이팅
  - [ ] 키보드 네비게이션 (↑↓ Enter)
- [ ] 테스트: 한글 검색, 필터 조합, 0건 결과

#### 2.2.2 버전 Diff

- [ ] GET .../versions/:versionNum — 특정 버전 내용 조회
- [ ] GET .../versions/diff — Myers 알고리즘 기반 diff API
- [ ] VersionHistoryModal 2-패널 UI (버전 목록 + diff 프리뷰)
  - [ ] 추가(녹색) / 삭제(빨간색) 라인 표시
  - [ ] 버전 복원 (미저장 경고 포함)
- [ ] 클라이언트 diff: `fast-diff` 라이브러리 활용
- [ ] 테스트: 긴 문서 diff 성능, 복원 후 상태

#### 2.2.3 OG Link Preview 프록시

- [ ] POST /link-preview — OG 메타데이터 프록시 API
  - [ ] title, description, image, favicon 추출
  - [ ] 타임아웃 설정 (3초 제안)
  - [ ] 캐싱 전략 (1시간 제안)
- [ ] 에디터 프리뷰에서 링크 카드 렌더링
- [ ] 테스트: 유효/무효 URL, 타임아웃, CORS

#### 2.2.4 퍼블릭 임베드 페이지

- [ ] GET /embed/doc/:documentId — 임베드용 HTML 렌더링
  - [ ] Guest Token 인증
  - [ ] iframe-safe 헤더 (X-Frame-Options, CSP)
- [ ] 임베드 프리뷰 페이지 UI
- [ ] 임베드 설정 가이드 문서 (NPM / iframe / REST API)
- [ ] 테스트: 유효/만료/취소 토큰, XSS 방어

#### 2.2.5 카테고리 Graph API

- [ ] GET /categories/:id/ancestors — Breadcrumb 경로
- [ ] GET /categories/:id/descendants — 하위 전체 조회
- [ ] 사이드바 Breadcrumb UI 적용
- [ ] 테스트: 깊은 트리, 순환 참조 방어

#### 2.2.6 단일 문서 DAG 컨텍스트

- [ ] GET /documents/:id/dag-context — 단일 문서 중심 그래프
- [ ] MiniDagDiagram (문서 메타 패널 인라인 SVG)
- [ ] DagStructureModal (전체 인터랙티브 뷰, 줌 컨트롤)
- [ ] 테스트: 고립 문서, 순환 참조

#### 2.2.7 실시간 협업

- [ ] y-websocket CRDT 서버 설정
- [ ] CodeMirror y-codemirror.next 확장 연동
- [ ] 동시 편집자 커서/선택 표시
- [ ] 충돌 해결 전략 정의
- [ ] 테스트: 2+ 동시 편집, 네트워크 단절 복구

#### 2.2.8 드래그앤드롭 폴더 이동

- [ ] 사이드바 카테고리 트리 D&D 구현
- [ ] 이동 API (PATCH /categories/:id with parentId)
- [ ] 드롭 대상 하이라이트 + 유효성 검증
- [ ] 테스트: 중첩 이동, 자기 자신으로 이동 방지

### 2.3 프론트엔드 미완성 기능

| 페이지 | 미완료 항목 | 우선순위 |
|--------|-----------|---------|
| 랜딩 `/` | 소셜 로그인 버튼 (OAuth 연동 전 비활성) | P3 (Phase 3) |
| 로그인/가입 | Google/GitHub OAuth | P3 (Phase 3) |
| 문서 목록 `/[ws]/doc` | 드래그앤드롭 폴더 이동 | P2 |
| 문서 에디터 | 실시간 협업, 고급 검색 필터 | P2 |
| 그래프 뷰 | 필터링/검색 | P2 |
| 프레젠테이션 | Export/Share 기능 | P3 |
| 설정 - 멤버 | 일괄 작업 (batch) | P3 |
| 설정 - 테마 | 커스텀 테마 Import | P3 |
| 설정 - 임베드 | 임베드 가이드 문서, 프리뷰 | P2 |

### 2.4 Phase 2 QA & 출시 기준

- [ ] 베타 온보딩: 10팀
- [ ] 팀당 평균 20+ 문서
- [ ] 주간 활성 사용자 60%+
- [ ] NPS 30+
- [ ] Critical 버그 0건

---

## Phase 3 -- Launch 📋

> **예상 시작:** 2026-07-01+
> **목표:** 정식 출시 + 수익화

### 3.1 OAuth 2.0 소셜 로그인

- [ ] `oauth_accounts` 테이블 생성 (마이그레이션)
- [ ] Google OAuth 2.0 연동 (Client ID/Secret, callback)
- [ ] GitHub OAuth 2.0 연동
- [ ] 기존 이메일 계정과 소셜 계정 연결 (linking)
- [ ] 랜딩/로그인/가입 페이지 소셜 버튼 활성화
- [ ] 테스트: 신규 가입, 기존 계정 연결, 토큰 갱신

### 3.2 Activity Feed & 알림

- [ ] `activity_logs` 테이블 설계 및 생성
- [ ] 활동 이벤트 수집 (문서 생성/수정, 멤버 변경, 댓글 등)
- [ ] 활동 피드 API (GET /workspaces/:id/activity)
- [ ] 알림 UI (벨 아이콘, 드롭다운)
- [ ] 이메일 알림 (멘션, 초대 등)
- [ ] 테스트: 이벤트 기록, 필터링, 읽음 표시

### 3.3 Public Pages & 커스텀 도메인

- [ ] 문서 공개 발행 기능 (publish toggle)
- [ ] 공개 문서 전용 렌더링 페이지
- [ ] 커스텀 도메인 연결 지원
- [ ] SEO 메타 태그 (OG, Twitter Card)
- [ ] 테스트: 공개/비공개 전환, 도메인 매핑

### 3.4 AI Writing Assistant

- [ ] Claude API 연동 (Anthropic SDK)
- [ ] 에디터 내 AI 패널 / 인라인 제안
- [ ] 기능: 문서 요약, 번역, 문법 교정, 자동 완성
- [ ] 사용량 제한 정책 (플랜별 토큰 한도)
- [ ] 테스트: API 호출, 응답 스트리밍, 에러 처리

### 3.5 성능 최적화 & 부하 테스트

- [ ] API p95 응답 시간 < 200ms 달성
- [ ] 데이터베이스 쿼리 최적화 (N+1 제거, 인덱스 점검)
- [ ] CDN 캐싱 전략 (정적 자산, 이미지)
- [ ] 부하 테스트 (k6 또는 Artillery)
- [ ] 모니터링: Sentry 에러 트래킹, 성능 대시보드
- [ ] 테스트: 동시 100 사용자 시나리오

### 3.6 수익화 (Pricing)

| 플랜 | 가격 | 워크스페이스 | 멤버 | 저장소 |
|------|------|-----------|------|--------|
| Free | $0 | 1 (Root) | 5 | 1GB |
| Team | $12/월/멤버 | 무제한 | 무제한 | 50GB |
| Enterprise | 별도 협의 | 무제한 | 무제한 + SSO | 무제한 |

- [ ] 결제 시스템 연동 (Stripe)
- [ ] 플랜별 기능 제한 미들웨어
- [ ] 구독 관리 UI
- [ ] 사용량 대시보드 (저장소, 멤버 수)

---

## 문서 & 인프라 잔여 작업

### Spec 문서 v1_3 동기화 (9건)

| # | 문서 | 주요 변경 필요 내용 |
|---|------|-------------------|
| 1 | 001_requirement | Phase 1 "완료" 반영, 댓글/임베드/테마/프레젠테이션 추가 |
| 2 | 002_component | 38개 컴포넌트 목록 반영, Zustand 5개 스토어 |
| 3 | 003_user-flow | 프레젠테이션/초대/가입요청/임베드 플로우 추가 |
| 4 | 004_data-model | ID bigserial, slug 제거, theme/embed 테이블, comments 상세 |
| 5 | 005_api-spec | /relations 경로, ✅/⏳/📋 상태, 추가 엔드포인트 |
| 6 | 006_test-spec | 26개 테스트 파일 현황, 팩토리 함수 문서화 |
| 7 | 007_architecture | Fastify/Next.js 16/Zustand 5, 배포 포트, cleanup-trash |
| 8 | 008_roadmap | Phase 1 ✅ 완료 반영 |
| 9 | 009_media-embed | POST /link-preview 미구현 명시 |

### ERD 불일치 수정 (7건)

- [ ] 전체 ID 타입: uuid → bigserial
- [ ] workspaces.slug 제거
- [ ] workspaces.theme_preset, theme_css 추가
- [ ] categories.order_index 추가
- [ ] document_versions.author_id 추가
- [ ] comments 테이블 추가
- [ ] embed_tokens 테이블 추가

### 보안 잔여

- [ ] R2 Worker CORS 정책 문서화 (SECURITY.md)
- [ ] R2 Worker public POST 보안 검토 (인증 없는 업로드)
- [ ] SVG 업로드 보안 (에디터 허용, Avatar 거부 — 근거 문서화)
- [ ] Cloudflare R2 무료 티어 한도 (10GB, 1000만 읽기/월) 대응 계획

---

## 진행 중 작업 (2026-04-05 기준)

| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| `apps/web/lib/image-upload.ts` | 통합 이미지 업로드 모듈 + 토글 유틸 | ✅ 완료 |
| `apps/web/components/storage-guide-panel.tsx` | R2 설정 가이드 패널 (에디터+설정 공유) | ✅ 완료 |
| `apps/web/app/.../settings/storage/page.tsx` | 이미지 저장소 설정 페이지 (토글+가이드 패널) | ✅ 완료 |
| `apps/web/app/.../doc/[docId]/page.tsx` | 에디터 이미지 업로드 토글 연동 | ✅ 완료 |
| `apps/web/components/profile-edit-modal.tsx` | Avatar R2 업로드 연동 (수정) | 🔄 진행 중 |
| `apps/web/components/app-header.tsx` | 헤더 수정 | 🔄 진행 중 |

---

## 우선순위 요약 (실행 순서)

### 즉시 (Phase 1 잔여 + Phase 2 P1)

1. **이미지 업로드 통합** — 현재 진행 중, Avatar + Editor R2 연동
2. **비밀번호 재설정 플로우** — forgot/reset/change 3개 엔드포인트 + UI
3. **이메일 서비스 연동** — Resend (console.log 대체)
4. **댓글 수정/해결** — PATCH /comments/:id
5. **Spec 문서 v1_3 동기화** — 9건 불일치 해소

### 단기 (Phase 2 P2, 4~6주)

6. **워크스페이스 전체 검색** — PostgreSQL 풀텍스트 + 필터 UI
7. **버전 Diff** — Myers 알고리즘 + 2-패널 UI
8. **카테고리 Graph API** — ancestors/descendants
9. **단일 문서 DAG 컨텍스트** — 메타 패널 인라인
10. **퍼블릭 임베드 페이지** — Guest Token + iframe
11. **OG Link Preview** — 프록시 API + 에디터 카드
12. **D&D 폴더 이동** — 사이드바 카테고리 트리

### 중기 (Phase 2 마무리, 2~4주)

13. **실시간 협업** — y-websocket CRDT
14. **ERD & 문서 최종 동기화**
15. **베타 온보딩 & QA**

### 장기 (Phase 3)

16. **OAuth 2.0** — Google + GitHub
17. **Activity Feed & 알림**
18. **Public Pages** — 커스텀 도메인
19. **AI Writing Assistant** — Claude API
20. **성능 최적화 & 부하 테스트**
21. **수익화** — Stripe 결제
