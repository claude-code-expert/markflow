@AGENTS.md
@docs/PROJECT-STRUCTURE.md
- 실행시 `.claude/CODE-SIGHT.md` 참고하여 코드 컨텍스트 맵 참고 

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

- 보아 관련 사항 : @SECURITY.md 참고 

---

## Active Technologies
- TypeScript 5+ (strict mode, `any` 금지) (001-kms-saas-platform)
- PostgreSQL 16 (primary), Cloudflare R2 (images) (001-kms-saas-platform)
- TypeScript 5+ (strict mode, `any` 금지) + Next.js 16.2.1 (App Router), React 19.2.4, Zustand 5.0.0, @tanstack/react-query 5.72.0, Tailwind CSS 4 (002-kms-frontend-fix)
- N/A (프론트엔드 전용 — 백엔드 API를 통해 PostgreSQL 간접 접근) (002-kms-frontend-fix)
- PostgreSQL 16 (Drizzle ORM), Cloudflare R2 (images) (004-prototype-features)

## Recent Changes
- 001-kms-saas-platform: Added TypeScript 5+ (strict mode, `any` 금지)


# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

