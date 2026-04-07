# MarkFlow KMS -- 전체 Phase 체크리스트

> **최종 수정:** 2026-04-08
> **기준:** develop 브랜치
> **범위:** Phase 0 ~ Phase 3 전체

---

## 현황 요약

| Phase | 상태 | 완성도 | 주요 지표 |
|-------|------|--------|----------|
| Phase 0 (Editor) | ✅ 완료 | 100% | npm 배포 가능, 24개 의존성, ESM+CJS |
| Phase 1 (Prototype) | ✅ 완료 (잔여 1건) | ~98% | API 44/56, 프론트 15/15 페이지, DB 15/15 |
| Phase 2 (MVP) | 📋 계획 (일부 진행 중) | ~30% | 비밀번호 재설정 완료, 이미지 업로드 완료, 댓글 수정/해결 완료, D&D 완료 |
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
- [x] 마크다운 복사 버튼 (에디터 pane header)
- [x] 외부 링크 새 탭 열기 (`target="_blank"`, `rel="noopener noreferrer"`)
- [x] HTML 패스스루 (`rehype-raw` — `<details>`, `<kbd>`, `<mark>` 등 GitHub 스타일 HTML)

### Phase 0 잔여

- [ ] `package.json` → `"private": false` 변경 (npm publish 준비)

---

## Phase 1 -- Prototype ✅ (잔여 1건)

> **기간:** 2026-04-01 ~ 2026-04-07 | **목표:** 내부 팀 사용 가능 수준

### 1.1 인증 (Auth)

| 항목 | API | Frontend | 상태 |
|------|-----|----------|------|
| 회원가입 | POST /auth/register | /register | ✅ |
| 로그인 | POST /auth/login | /login | ✅ |
| 토큰 갱신 | POST /auth/refresh | — | ✅ |
| 로그아웃 | POST /auth/logout | — | ✅ |
| 이메일 인증 | GET /auth/verify-email | /verify-email | ✅ |
| 비밀번호 찾기 | POST /auth/forgot-password | /forgot-password | ✅ |
| 비밀번호 재설정 | POST /auth/reset-password | /reset-password | ✅ |
| 계정 잠금 | 5회 실패 → 15분 락 | — | ✅ |
| 속도 제한 | 10 req/15min (register, login), 5/15min (forgot-password) | — | ✅ |

### 1.2 사용자 (Users)

| 항목 | API | 상태 |
|------|-----|------|
| 내 정보 조회 | GET /users/me | ✅ |
| 프로필 수정 | PATCH /users/me | ✅ |
| 아바타 업로드 | PATCH /users/me { avatarUrl } + R2 Worker | ✅ (프론트→R2 직접 업로드, PUT 엔드포인트 제거) |

### 1.3 워크스페이스 (Workspaces)

| 항목 | API | Frontend | 상태 |
|------|-----|----------|------|
| CRUD | GET/POST/PATCH/DELETE | /workspaces | ✅ |
| 소유권 이전 | POST /transfer | 설정 페이지 | ✅ |
| 공개 목록 | GET /workspaces/public | 검색 모달 | ✅ |
| 멤버 관리 | GET/PATCH/DELETE /members | /settings/members | ✅ |
| 초대 | POST /invitations, GET/POST /invitations/:token | /invite/[token] | ✅ |
| 가입 요청 | POST/GET/PATCH /join-requests (+ batch) | JoinRequestPanel | ✅ |
| 가입 요청 관리 UI | — | /settings/members 내 가입 신청 섹션 | ✅ |
| 가입 요청 수 표시 | GET /workspaces (pendingJoinCount) | /workspaces 목록 뱃지 | ✅ |
| 워크스페이스 행 클릭 이동 | — | /workspaces 행 클릭 → /doc | ✅ |

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
| 새 문서 (DB 저장 없이 에디터 진입) | — | /[ws]/doc/new | ✅ |
| 수동 저장 | PATCH (Cmd+S / 버튼) | 에디터 | ✅ |
| 소프트 삭제 | DELETE (soft) | — | ✅ |
| 버전 목록 | GET /versions | VersionHistoryPanel | ✅ |
| 버전 복원 | POST /restore-version | — | ✅ |
| 태그 | GET/PUT /tags | TagInput | ✅ |
| 관계 (DAG) | PUT/GET /relations | DocumentLinksModal | ✅ |
| 댓글 | GET/POST/DELETE /comments | CommentPanel | ✅ |
| 휴지통 | GET/POST/DELETE /trash | /[ws]/trash | ✅ |
| Import/Export | POST /import, GET /export | ImportExportModal | ✅ |
| 문서 작성자/어드민 권한 분리 | PATCH 서버측 authorId 검증 | 읽기전용 + 편집 전환 모달 | ✅ |
| 제목 빈 문서 저장 방지 | — | 토스트 경고 | ✅ |

### 1.6 추가 기능

| 항목 | 상태 |
|------|------|
| 테마 커스텀 (프리셋 5종 + CSS 변수) | ✅ |
| 임베드 토큰 CRUD | ✅ |
| 프레젠테이션 모드 (TOC 네비게이션 + 펜 드로잉) | ✅ |
| 검색 모달 (Cmd+/) | ✅ |
| 그래프 뷰 (마인드맵 Canvas — 다크/라이트 테마, 파티클, 보간) | ✅ |
| 랜딩 페이지 (Hero + Features + Pricing + Footer) | ✅ |
| 토스트 알림 시스템 | ✅ |
| 사이드바 실시간 갱신 (refreshKey) | ✅ |
| 문서 드래그앤드롭 (문서→폴더 이동) | ✅ |

### 1.7 인프라 & 미들웨어

- [x] JWT 인증 미들웨어
- [x] RBAC (Owner/Admin/Editor/Viewer)
- [x] CSRF 방어 (Origin + SameSite)
- [x] 워크스페이스 스코프 미들웨어
- [x] CORS 설정
- [x] 휴지통 정리 잡 (30일 자동 삭제)
- [x] Rate Limiting (@fastify/rate-limit)
- [x] 테스트 DB 분리 (markdown_web_test, 개발 DB 보호)
- [x] DB 마이그레이션 정합성 복구 (workspaces unique constraint 수정)
- [x] Spec 문서 v1_3 동기화 (9건 완료 — CHANGELOG v1.3.0)
- [x] ERD 업데이트 (v1.3.0 + v1.6.0에서 모든 불일치 해소)

### 1.8 Phase 1 잔여 작업

> Phase 1에서 구현되지 않은 항목. Phase 2 시작 전 또는 병행 처리 필요.

- [x] ~~**`documents.start_mode`**~~ → **v1.7.0에서 스펙 제거 확정** (프론트엔드 레이아웃 상태로 처리)
- [x] ~~**Spec 문서 v1_3 동기화**~~ → CHANGELOG v1.3.0에서 9개 문서 전체 교체 완료
- [x] ~~**ERD 업데이트**~~ → v1.3.0 + v1.6.0에서 모든 불일치 해소 (ID 타입, theme, embed, comments 등)
- [ ] **이메일 재발송** — POST /auth/resend-verification (프론트에서 호출 중이나 API 미구현) → **Phase 2 P1 마지막 순서로 이동**
- [x] ~~회원가입 시 자동 워크스페이스 생성~~ → **제거됨** (2026-04-07). 로그인 후 /workspaces에서 수동 생성

---

## Phase 2 -- MVP 📋

> **예상 기간:** 2026-04-14 ~ 2026-06-09 (6~8주)
> **목표:** 베타 사용자 10팀 온보딩

### 2.1 P1 우선순위 -- 핵심 완성

#### 2.1.1 비밀번호 재설정 플로우

- [x] POST /auth/forgot-password — 비밀번호 리셋 이메일 발송 ✅
- [x] POST /auth/reset-password — 토큰 기반 비밀번호 재설정 ✅
- [ ] PATCH /users/me/password — 비밀번호 변경 (로그인 상태)
- [x] 비밀번호 리셋 요청 페이지 UI ✅
- [x] 비밀번호 재설정 페이지 UI ✅
- [ ] 이메일 서비스 연동 (Resend, console.log 대체)
- [x] 테스트: 유효/만료 토큰, 비밀번호 강도 검증 ✅

#### 2.1.2 이미지 업로드 통합 (Avatar + Editor R2) ✅

> **완료** — 프론트엔드에서 R2 Worker로 직접 업로드 후 PATCH /users/me로 URL 저장. PUT /me/avatar 레거시 엔드포인트 제거 (v1.7.0)

- [x] 통합 업로드 모듈 (`image-upload.ts`) 완성
- [x] Avatar 업로드: R2 Worker → URL 획득 → PATCH /users/me (`profile-edit-modal.tsx`)
- [x] 이미지 저장소 설정 페이지 (`/settings/storage`)
- [x] 에디터 이미지 업로드 연동
- [x] 에러 처리: NO_WORKER_URL, VALIDATION_FAILED, UPLOAD_FAILED
- [x] R2 Worker CORS 설정 (ALLOWED_ORIGINS)
- [x] PUT /users/me/avatar 레거시 엔드포인트 제거
- [ ] 테스트: 업로드 성공/실패, 네트워크 단절, 미설정 상태

#### 2.1.3 댓글 수정/해결 API ✅

> **완료** — PATCH /comments/:commentId (content 수정 + resolved 토글), CommentPanel UI 수정/해결 버튼, DB resolved/resolvedBy 컬럼 추가 (migration 0003)

- [x] PATCH /comments/:commentId — 댓글 내용 수정 ✅
- [x] PATCH /comments/:commentId — 해결 상태 토글 (resolved) ✅
- [x] CommentPanel UI 업데이트 (수정/해결 버튼) ✅
- [ ] 테스트: 권한 체크, 수정 이력

#### 2.1.4 이메일 재발송 API (Phase 1 → 이동)

> ⚠️ **프론트-백 불일치**: 프론트엔드(`verify-email/page.tsx:232`)에서 `POST /auth/resend-verification` 이미 호출 중이나 백엔드 API 미구현 → **사용자에게 404 에러 발생**

- [ ] POST /auth/resend-verification — 인증 이메일 재발송 API 구현
- [x] 프론트엔드 호출 연동 (/verify-email 페이지) — ⚠️ API 없이 호출 중
- [ ] 테스트: 재발송 성공, 이미 인증된 계정, rate limit

### 2.2 P2 우선순위 -- 기능 확장

#### 2.2.1 워크스페이스 전체 검색

> **부분 구현** — `GET /documents` API에 `q` 쿼리 파라미터로 기본 title LIKE 검색 존재

- [ ] GET /workspaces/:id/search — 풀텍스트 검색 API (pg_trgm 인덱스 활용)
- [ ] 검색 모달 고도화 (현재 title LIKE만 지원 → 본문 검색 추가)
- [ ] 테스트: 한글 검색, 필터 조합, 0건 결과

#### 2.2.2 버전 Diff

> **부분 구현** — `version-history-panel.tsx`에 diff UI 존재 (added/removed line count), 전용 API 없음

- [ ] GET .../versions/:versionNum — 특정 버전 내용 조회
- [ ] GET .../versions/diff — Myers 알고리즘 기반 diff API
- [ ] VersionHistoryModal 2-패널 UI 고도화 (현재 기본 diff 표시 존재)
- [ ] 테스트: 긴 문서 diff 성능, 복원 후 상태

#### 2.2.3 OG Link Preview 프록시

> **부분 구현** — `link-preview.tsx` 컴포넌트 존재, 백엔드 API 없음

- [ ] POST /link-preview — OG 메타데이터 프록시 API
- [ ] 에디터 프리뷰에서 링크 카드 렌더링
- [ ] 테스트: 유효/무효 URL, 타임아웃, CORS

#### 2.2.4 퍼블릭 임베드 페이지

> **부분 구현** — embed-tokens CRUD 완료, 설정 페이지에 npm/iframe/api 가이드 3탭 존재

- [ ] GET /embed/doc/:documentId — 임베드용 HTML 렌더링
- [ ] 임베드 프리뷰 페이지 UI
- [ ] 테스트: 유효/만료/취소 토큰, XSS 방어

#### 2.2.5 카테고리 Graph API

- [ ] GET /categories/:id/ancestors — Breadcrumb 경로
- [ ] GET /categories/:id/descendants — 하위 전체 조회
- [ ] 테스트: 깊은 트리, 순환 참조 방어

#### 2.2.6 단일 문서 DAG 컨텍스트

> **부분 구현** — `mini-dag-diagram.tsx` + `dag-structure-modal.tsx` 컴포넌트 존재, 전용 API 없음

- [ ] GET /documents/:id/dag-context — 단일 문서 중심 그래프
- [ ] MiniDagDiagram, DagStructureModal API 연동
- [ ] 테스트: 고립 문서, 순환 참조

#### 2.2.7 실시간 협업

- [ ] y-websocket CRDT 서버 설정
- [ ] CodeMirror y-codemirror.next 확장 연동
- [ ] 테스트: 2+ 동시 편집, 네트워크 단절 복구

#### ~~2.2.8 드래그앤드롭 폴더 이동~~ ✅ 완료

> **v1.4.0에서 구현 완료** — `category-tree.tsx`에 HTML5 dataTransfer API 기반 D&D 구현
> 문서→폴더 이동, "전체 문서"에 드롭 시 미분류 이동 지원

- [x] 사이드바 카테고리 트리 D&D 구현
- [x] 문서→폴더 드래그 시 categoryId 변경
- [x] "전체 문서"에 드롭 시 미분류 이동

### 2.3 프론트엔드 미완성 기능

| 페이지 | 미완료 항목 | 우선순위 |
|--------|-----------|---------|
| 랜딩 `/` | 소셜 로그인 버튼 (OAuth 연동 전 비활성 — UI만 존재) | P3 (Phase 3) |
| 로그인/가입 | Google/GitHub OAuth (UI 버튼 존재, 백엔드 미구현) | P3 (Phase 3) |
| 문서 에디터 | 실시간 협업, 고급 검색 필터 | P2 |
| 그래프 뷰 | 텍스트 검색 (카테고리 필터는 존재) | P2 |
| 프레젠테이션 | Export/Share 기능 | P3 |
| 설정 - 테마 | 커스텀 테마 Import | P3 |
| 설정 - 임베드 | 실제 임베드 프리뷰 페이지 (가이드 탭은 존재) | P2 |

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
- [ ] Google OAuth 2.0 연동
- [ ] GitHub OAuth 2.0 연동
- [ ] 기존 이메일 계정과 소셜 계정 연결 (linking)
- [ ] 테스트: 신규 가입, 기존 계정 연결, 토큰 갱신

### 3.2 Activity Feed & 알림

- [ ] `activity_logs` 테이블 설계 및 생성
- [ ] 활동 피드 API (GET /workspaces/:id/activity)
- [ ] 알림 UI (벨 아이콘, 드롭다운)
- [ ] 이메일 알림 (멘션, 초대 등)
- [ ] 테스트: 이벤트 기록, 필터링, 읽음 표시

### 3.3 Public Pages & 커스텀 도메인

- [ ] 문서 공개 발행 기능 (publish toggle)
- [ ] 공개 문서 전용 렌더링 페이지
- [ ] 커스텀 도메인 연결 지원
- [ ] 테스트: 공개/비공개 전환, 도메인 매핑

### 3.4 AI Writing Assistant

- [ ] Claude API 연동 (Anthropic SDK)
- [ ] 에디터 내 AI 패널 / 인라인 제안
- [ ] 테스트: API 호출, 응답 스트리밍, 에러 처리

### 3.5 성능 최적화 & 부하 테스트

- [ ] API p95 응답 시간 < 200ms 달성
- [ ] 데이터베이스 쿼리 최적화 (N+1 제거, 인덱스 점검)
- [ ] 부하 테스트 (k6 또는 Artillery)
- [ ] 모니터링: Sentry 에러 트래킹
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

## 보안 잔여 작업

- [x] 문서 PATCH 서버측 작성자/어드민 권한 검증
- [x] 워크스페이스 unique constraint 수정 (name → owner_id+name 복합)
- [x] 순환 참조 방지 로직 수정 (관계 삭제 전 cycle detection)
- [ ] R2 Worker CORS 정책 문서화 (SECURITY.md)
- [ ] R2 Worker public POST 보안 검토 (인증 없는 업로드)
- [ ] SVG 업로드 보안 (에디터 허용, Avatar 거부 — 근거 문서화)

---

## 2026-04-08 세션 변경 내역

| 항목 | 설명 |
|------|------|
| 코드베이스 전수 점검 | API 73개 엔드포인트, 프론트 20개 페이지, DB 15개 테이블 대조 감사 완료 |
| 댓글 수정/해결 체크리스트 갱신 | 2.1.3 항목 3/4 완료 표시 (API + Service + UI 구현 확인, 테스트 잔여) |
| 이메일 재발송 프론트-백 불일치 발견 | `POST /auth/resend-verification` 프론트 호출 중이나 API 미구현 → 404 에러. 체크리스트에 경고 추가 |
| Phase 2 완성도 조정 | ~25% → ~30%. 댓글 수정/해결 + 이미지 업로드 완료 반영 |
| 우선순위 요약 갱신 | 이미지 업로드/댓글 수정 완료 표시, 잔여 항목 정리 |
| documents.start_mode 스펙 제거 | 004_data-model DDL에서 완전 삭제 — 프론트엔드 레이아웃 상태로 처리 확정 |
| documents.slug DDL 정리 | 마이그레이션 0001에서 DROP 완료된 slug 컬럼/UNIQUE/인덱스를 004_data-model DDL에서 제거 |
| categories.slug DDL 정리 | 실제 스키마에 없는 slug 컬럼을 DDL에서 제거 |
| 체크리스트 재분류 | Phase 1 95%→98%, Phase 2 15%→25%. D&D/Spec동기화/ERD 완료 반영, 이메일 재발송 Phase 2 이동 |
| 인덱스 목록 재정렬 | slug 인덱스 제거로 16→15개, 번호 재정렬 |
| CHANGELOG v1.7.0 | 코드베이스 감사 기반 문서 정합성 업데이트 기록 |

---

## 2026-04-07 세션 변경 내역

| 항목 | 설명 |
|------|------|
| DB 마이그레이션 복구 | 0002 마이그레이션 수동 적용, migration record 재정렬 |
| 워크스페이스 unique constraint | `UNIQUE(name)` → `UNIQUE(owner_id, name)` 복합 유니크로 수정 |
| 비밀번호 재설정 플로우 | forgot-password/reset-password API + 프론트 UI 완성 |
| 새 문서 생성 흐름 변경 | 모달 제거 → `/doc/new` 경로에서 저장 전까지 DB 미기록 |
| 문서 에디터 UX 개선 | 제목 placeholder 처리, 빈 제목 저장 방지, 기본 미리보기 모드 |
| 문서 권한 분리 | 작성자/어드민 편집 권한 (서버 + 클라이언트), 어드민 편집 전환 모달 |
| 에디터 마크다운 복사 | Editor pane header에 Copy 버튼 추가 |
| 외부 링크 새 탭 열기 | rehypeExternalLinks 플러그인으로 모든 링크 `target="_blank"` |
| 태그 입력 포커스 | 태그 저장 완료 후 input 자동 포커스 |
| 사이드바 실시간 갱신 | refreshKey 패턴으로 저장 시 사이드바 즉시 반영 |
| 워크스페이스 가입 신청 UI | /settings/members에 가입 신청 관리 섹션, /workspaces에 뱃지 표시 |
| 워크스페이스 행 클릭 | /workspaces 목록에서 행 클릭 시 문서 메인 이동 |
| 로고 교체 | 모든 auth 페이지 MarkFlowLogo → markflow-logo.png |
| 회원가입 변경 | 자동 워크스페이스 생성 제거, 로그인 후 /workspaces로 이동 |
| 공개 워크스페이스 API 수정 | request.userId → request.currentUser!.userId |
| 테스트 DB 분리 | markdown_web_test DB 생성, `_test` suffix 강제 검증 |
| 테스트 수정 | slug 관련 assertion 제거, auth-login rate limit 격리, circular-ref 순서 수정, slug.test.ts 삭제 |
| Rate Limit 설정 중복 제거 | authRateLimit() 헬퍼 추출 |
| .bak 파일 삭제 | 15개 .bak 파일 정리 |
| 보안 수정 | 문서 PATCH 서버측 authorId 검증, JoinRequestSection 행별 역할 상태 분리 |

---

## 우선순위 요약 (실행 순서)

### 즉시 (Phase 2 P1)

1. ~~**이미지 업로드 통합**~~ — ✅ 완료
2. **이메일 서비스 연동** — Resend (console.log 대체)
3. ~~**댓글 수정/해결**~~ — ✅ 완료 (테스트 잔여)
4. **비밀번호 변경 (로그인 상태)** — PATCH /users/me/password
5. **이메일 재발송 API** — POST /auth/resend-verification

### 단기 (Phase 2 P2, 4~6주)

6. **워크스페이스 전체 검색** — PostgreSQL 풀텍스트 + 필터 UI
7. **버전 Diff** — Myers 알고리즘 + 2-패널 UI (프론트 부분 구현 존재)
8. **카테고리 Graph API** — ancestors/descendants
9. **단일 문서 DAG 컨텍스트** — 메타 패널 인라인 (프론트 컴포넌트 존재)
10. **퍼블릭 임베드 페이지** — Guest Token + iframe (설정 가이드 존재)
11. **OG Link Preview** — 프록시 API + 에디터 카드 (프론트 컴포넌트 존재)

### 중기 (Phase 2 마무리, 2~4주)

12. **실시간 협업** — y-websocket CRDT
13. **베타 온보딩 & QA**

### 장기 (Phase 3)

14. **OAuth 2.0** — Google + GitHub
15. **Activity Feed & 알림**
16. **Public Pages** — 커스텀 도메인
17. **AI Writing Assistant** — Claude API
18. **성능 최적화 & 부하 테스트**
19. **수익화** — Stripe 결제
