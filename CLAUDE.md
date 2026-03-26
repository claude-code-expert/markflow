@AGENTS.md
@docs/PROJECT-STRUCTURE.md

## Conventions

- TypeScript strict mode, `any` 금지
- CSS 클래스: `.mf-` 접두사
- CSS 변수: `--mf-` 접두사
- Conventional Commits
- `.claude/rules/` 에 영역별 세부 규칙 정의

---

# 작업 규칙

### 일반 원칙

1. **테스트 먼저**: 새 기능 구현 시 테스트 코드를 먼저 작성한다
2. **작은 단위**: 한 번에 하나의 기능만 구현한다
3. **확인 후 진행**: 큰 변경 전에 계획을 먼저 공유하고 승인을 받는다

### 코드 변경 시
```
1. 변경할 내용을 먼저 설명
2. 영향받는 파일 목록 제시
3. 승인 후 구현
4. 테스트 통과 확인
```

### 금지 사항

<!--
각 금지 사항의 이유:
- any: 타입 안전성 훼손, 런타임 에러 증가
- console.log: 프로덕션 로그 오염, logger 사용으로 통일
- 테스트 스킵: 회귀 방지 안전망 무력화
-->

- `any` 타입 사용
- `console.log` 직접 사용 (logger 유틸 사용)
- 테스트 없이 기능 구현 완료 처리
- `node_modules`, `dist`, `.env` 파일 직접 수정
- 다른 패키지의 내부 구현에 직접 의존

## 명령어 참조

### 개발 환경
```bash
pnpm install              # 의존성 설치
pnpm dev                  # 전체 dev 모드 (Turbo)
pnpm --filter @markflow/editor dev    # 에디터 패키지만 watch 빌드
pnpm --filter @markflow/demo dev      # 데모 앱만 dev 서버
```

### 테스트
```bash
pnpm test                 # 전체 테스트 (Turbo)
pnpm --filter @markflow/editor test   # 에디터 패키지 테스트
pnpm --filter @markflow/editor test:watch  # 감시 모드
```

### 빌드 및 배포
```bash
pnpm build                # 전체 빌드 (Turbo — 의존 순서 자동)
pnpm --filter @markflow/editor build  # 에디터 패키지만 빌드
```

---

## 🚨 절대 금지 사항

### 데이터베이스
```sql
-- ❌ 절대 금지 (사용자 명시적 요청 없이)
DROP TABLE ...
DROP DATABASE ...
TRUNCATE ...
DELETE FROM ... (WHERE 절 없이)
ALTER TABLE ... DROP COLUMN ...
```

**필수 규칙:**
- 삭제/리셋 시 반드시 사용자 승인 요청
- 기존 데이터 존재 시 마이그레이션으로 해결 (Drizzle ORM drizzle-kit 사용)
- 운영 DB 직접 변경 절대 금지
- 마이그레이션은 롤백 가능해야 함 (DOWN 스크립트 필수)

### Git 명령어
```bash
# ❌ 절대 금지
git push --force
git reset --hard
git commit --no-verify
```

---

## 코드 패턴 가이드

### 마크다운 렌더링 파이프라인
```
markdown (string)
  → remark-parse          (CommonMark AST)
  → remark-gfm            (Tables, TaskList, Strikethrough)
  → remark-math           ($...$ / $$...$$)
  → remark-rehype         (HAST 변환, allowDangerousHtml: false)
  → rehype-highlight      (코드 구문 강조)
  → rehype-katex          (수식 렌더링)
  → rehype-sanitize       (XSS 방어 — 필수, 제거 금지)
  → rehype-stringify       (HTML string)
```

- `parseMarkdown()` 은 **동기(processSync)** — 실시간 프리뷰용
- 파이프라인 순서 변경 금지: sanitize는 반드시 stringify 직전에 위치
- sanitize 스키마 확장 시 최소 권한 원칙 (허용할 태그/속성만 명시적으로 추가)

### dangerouslySetInnerHTML 사용 규칙
- `parseMarkdown()` 출력에만 사용 (rehype-sanitize 통과한 HTML)
- sanitize를 거치지 않은 원본 HTML을 직접 주입하지 않는다
- 사용자 입력을 sanitize 없이 innerHTML/dangerouslySetInnerHTML에 전달 금지

### CodeMirror 확장 패턴
- **Compartment**: 테마, readOnly, placeholder 등 런타임 변경이 필요한 설정
- **Hot-swap**: `compartment.reconfigure()`로 extension 교체 (EditorView 재생성 금지)
- EditorView는 마운트 시 1회만 생성, cleanup 시 `destroy()` 호출

### 이미지 업로드 패턴
```
1. 클라이언트 검증 (validateImageFile) → 타입/크기 체크
2. 플레이스홀더 삽입: ![Uploading filename...]()
3. Worker에 FormData POST
4. 성공: 플레이스홀더를 ![filename](url)로 교체
5. 실패: 에러 토스트 + 재시도 옵션
```
- 업로더는 `onImageUpload` prop으로 교체 가능 (Cloudflare 종속 아님)
- Worker URL은 SettingsModal에서 설정, localStorage에 저장

### CSS 스타일 패턴
- 모든 클래스: `.mf-` 접두사 (외부 프로젝트 스타일 충돌 방지)
- 모든 CSS 변수: `--mf-` 접두사
- 테마: `[data-theme="light"]` / `[data-theme="dark"]` 셀렉터
- Preview 스타일: `.mf-preview` 하위에만 적용 (글로벌 오염 방지)
- CSS Module 사용하지 않음 — dangerouslySetInnerHTML 출력에 글로벌 셀렉터 필요

### React 컴포넌트 패턴
- function component + named export (default export 사용 금지)
- forwardRef: EditorPane만 사용 (EditorView 인스턴스 노출용)
- Controlled/Uncontrolled: `value` prop 유무로 판별, 내부 `internalValue` 상태 분리

---

## 보안

### XSS 방어 (현재 구현됨)

**에디터 패키지 (`@markflow/editor`):**
- `rehype-sanitize`가 모든 마크다운 → HTML 변환에 적용됨
- `allowDangerousHtml: false` — remark-rehype에서 원본 HTML 태그 차단
- sanitize 스키마 커스텀: KaTeX 수학 태그 + 코드 하이라이팅 className만 허용
- `<script>`, `on*` 이벤트 속성, `javascript:` URL 스킴 모두 제거됨

**sanitize 스키마 변경 시 주의사항:**
```typescript
// ✅ 허용 — 기능에 필요한 최소 태그/속성만 추가
tagNames: ['math', 'semantics', 'mrow', ...]  // KaTeX 전용
attributes: { code: ['className'] }            // 구문 강조 전용

// ❌ 금지 — 절대 추가하지 말 것
tagNames: ['script', 'iframe', 'object', 'embed', 'form']
attributes: { '*': ['onclick', 'onerror', 'onload', 'style'] }
// style 속성은 span/div에만 KaTeX용으로 제한 허용 중
```

### 이미지 업로드 보안

- 클라이언트 검증: 허용 MIME 타입 (`png, jpeg, gif, webp, svg+xml`), 최대 10MB
- 서버(Worker) 검증: Content-Type 재확인 필수
- SVG 업로드: `image/svg+xml` 허용하되, SVG 내부 `<script>` 태그 주의
- 업로드 URL은 Cloudflare R2 도메인만 허용 (Worker에서 강제)

### KMS Phase 1+ 보안 (계획됨)

**인증:**
- JWT Access Token (15분) + Refresh Token (7일, HttpOnly Cookie)
- 비밀번호: bcrypt 해시, 8자 이상 + 영문/숫자/특수문자
- 계정 잠금: 동일 계정 5회 연속 실패 → 15분 잠금 (401 ACCOUNT_LOCKED)
- Rate Limit: IP 기준 10회/15분 초과 → 429 RATE_LIMITED (계정 잠금과 별도)

**권한:**
- 모든 API에 Role 기반 미들웨어 (Owner > Admin > Editor > Viewer)
- 모든 쿼리에 `workspace_id` 범위 강제 (데이터 격리)

**CSRF:**
- SameSite=Strict 쿠키 + Origin 헤더 검증

**환경 변수:**
- 시크릿(DB URL, JWT 시크릿, API 키)은 환경 변수로만 관리
- `.env` 파일은 `.gitignore`에 포함, 커밋 금지
- 코드에 시크릿 하드코딩 절대 금지

**의존성:**
- `pnpm audit` 정기 실행
- 알려진 취약점이 있는 패키지 즉시 업데이트

## Active Technologies
- TypeScript 5+ (strict mode, `any` 금지) (001-kms-saas-platform)
- PostgreSQL 16 (primary), Redis 7 (session/cache), Cloudflare R2 (images) (001-kms-saas-platform)
- TypeScript 5+ (strict mode, `any` 금지) + Next.js 16.2.1 (App Router), React 19.2.4, Zustand 5.0.0, @tanstack/react-query 5.72.0, Tailwind CSS 4 (002-kms-frontend-fix)
- N/A (프론트엔드 전용 — 백엔드 API를 통해 PostgreSQL 간접 접근) (002-kms-frontend-fix)

## Recent Changes
- 001-kms-saas-platform: Added TypeScript 5+ (strict mode, `any` 금지)
