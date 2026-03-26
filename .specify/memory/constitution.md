<!--
Sync Impact Report
===================
- Version change: 0.0.0 → 1.0.0 (initial ratification)
- Added principles:
  - I. Package Independence (Library-First)
  - II. Type Safety
  - III. Security by Default
  - IV. Test-First
  - V. Style Isolation
  - VI. Phased Delivery
  - VII. Simplicity & YAGNI
- Added sections:
  - Technical Constraints
  - Development Workflow
  - Governance
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no update needed (Constitution Check section is generic)
  - .specify/templates/spec-template.md — ✅ no update needed (structure compatible)
  - .specify/templates/tasks-template.md — ✅ no update needed (phase structure compatible)
- Follow-up TODOs: none
-->

# MarkFlow Constitution

## Core Principles

### I. Package Independence (Library-First)

`@markflow/editor`는 KMS 백엔드 없이 독립 동작하는 npm 패키지로 유지한다.

- 에디터 패키지는 `workspace:*` 의존 없이 npm publish 가능해야 한다
- 패키지 분리는 **배포/소비 경계**에서만 허용한다. 코드 정리 목적의 패키지 분리는 금지한다
- 내부 코드 구조화는 폴더 + `.claude/rules/`로 처리한다
- 다른 패키지의 내부 구현에 직접 의존하지 않는다
- 시기상조 추출 금지: 실제 소비자가 생길 때 분리한다

**근거:** 에디터를 어떤 React 18+ 프로젝트에든 이식 가능하게 유지하기 위함. 외부 개발자가 `npm install @markflow/editor`만으로 사용할 수 있어야 한다.

### II. Type Safety (타입 안전성)

TypeScript strict mode를 강제하며, `any` 타입 사용을 금지한다.

- `tsconfig.json`에 `strict: true` 필수
- `any` 타입 사용 절대 금지 — `unknown`, 제네릭, 유니온 타입으로 대체한다
- 모든 public API에 명시적 타입 정의를 제공한다
- `as` 타입 단언은 최소화하고, 사용 시 근거를 주석으로 남긴다

**근거:** 런타임 에러를 컴파일 타임에 방지하고, 에디터 패키지 소비자에게 정확한 타입 정보를 제공하기 위함.

### III. Security by Default (기본 보안)

모든 사용자 입력은 렌더링 전에 반드시 sanitize한다.

- 마크다운 렌더링 파이프라인에서 `rehype-sanitize`는 `rehype-stringify` 직전에 위치해야 하며, 제거를 금지한다
- `allowDangerousHtml: false` 설정을 유지한다
- `dangerouslySetInnerHTML`은 `parseMarkdown()` 출력(sanitize 통과한 HTML)에만 사용한다
- sanitize 스키마 확장 시 최소 권한 원칙을 적용한다 (허용할 태그/속성만 명시적으로 추가)
- `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>` 태그와 `on*` 이벤트 속성, `javascript:` URL 스킴은 절대 허용하지 않는다
- 환경 변수에 시크릿을 관리하고, 코드에 하드코딩을 금지한다
- `.env` 파일은 `.gitignore`에 포함하며 커밋하지 않는다

**근거:** XSS 공격 벡터를 원천 차단하고, 에디터를 사용하는 모든 프로젝트의 보안 수준을 보장하기 위함.

### IV. Test-First (테스트 우선)

새 기능 구현 시 테스트 코드를 먼저 작성한다.

- Red-Green-Refactor 사이클을 따른다: 테스트 작성 → 실패 확인 → 구현 → 통과 확인
- 테스트 없이 기능 구현 완료 처리를 금지한다
- 테스트 피라미드를 준수한다: Unit(다수) > Integration(중간) > E2E(소수)
- 목표 커버리지: Unit 80%+, 핵심 API Integration 100%
- 도구: Vitest (Unit/Integration), Playwright (E2E), MSW (API Mock)

**근거:** 회귀 방지 안전망을 유지하고, 리팩토링 시 안정성을 보장하기 위함.

### V. Style Isolation (스타일 격리)

에디터의 CSS는 외부 프로젝트 스타일과 충돌하지 않아야 한다.

- 모든 CSS 클래스에 `.mf-` 접두사를 사용한다
- 모든 CSS 변수에 `--mf-` 접두사를 사용한다
- 테마 전환: `[data-theme="light"]` / `[data-theme="dark"]` 셀렉터를 사용한다
- Preview 스타일은 `.mf-preview` 하위에만 적용한다 (글로벌 오염 방지)
- CSS Module을 사용하지 않는다 — `dangerouslySetInnerHTML` 출력에 글로벌 셀렉터가 필요하기 때문

**근거:** 에디터가 어떤 프로젝트에 embed되더라도 호스트 앱의 스타일을 오염시키지 않기 위함.

### VI. Phased Delivery (단계적 전달)

기능은 Phase별로 점진적으로 전달하며, 각 Phase에서 허용하는 기술 부채를 명시한다.

- Phase 0: 독립 에디터 패키지 (완료)
- Phase 1: 프로토타입 — 핵심 CRUD, 팀 내부 검증
- Phase 2: MVP — 외부 베타 사용자 온보딩
- Phase 3: 정식 출시 — 유료 플랜, 엔터프라이즈 기능
- 각 Phase의 기술 부채 허용 범위를 `008_roadmap`에 명시하고, 다음 Phase에서 해소한다
- Phase 간 이행 기준(exit criteria)을 충족해야 다음 Phase로 진행한다

**근거:** 완벽주의로 인한 지연을 방지하고, 각 단계에서 사용 가능한 제품을 전달하기 위함.

### VII. Simplicity & YAGNI (단순성)

필요한 것만 구현하고, 시기상조 추상화를 금지한다.

- 한 번에 하나의 기능만 구현한다
- 3줄의 유사 코드가 섣부른 추상화보다 낫다
- 가상의 미래 요구사항을 위한 설계를 금지한다
- `console.log` 직접 사용을 금지한다 — logger 유틸을 사용한다
- `node_modules`, `dist`, `.env` 파일을 직접 수정하지 않는다

**근거:** 코드 복잡도를 최소화하고, 유지보수 비용을 낮추기 위함.

## Technical Constraints (기술 제약)

### 렌더링 파이프라인 규칙

파이프라인 순서 변경을 금지한다. 다음 순서를 반드시 유지한다:

```
markdown → remark-parse → remark-gfm → remark-math
→ remark-rehype (allowDangerousHtml: false)
→ rehype-highlight → rehype-katex
→ rehype-sanitize → rehype-stringify
```

- `parseMarkdown()`은 동기(`processSync`) — 실시간 프리뷰용
- sanitize는 반드시 stringify 직전에 위치한다

### CodeMirror 확장 규칙

- **Compartment**: 테마, readOnly, placeholder 등 런타임 변경이 필요한 설정에 사용
- **Hot-swap**: `compartment.reconfigure()`로 extension 교체 (EditorView 재생성 금지)
- EditorView는 마운트 시 1회만 생성하고, cleanup 시 `destroy()`를 호출한다

### React 컴포넌트 규칙

- function component + named export (default export 사용 금지)
- forwardRef: EditorPane만 사용 (EditorView 인스턴스 노출용)
- Controlled/Uncontrolled: `value` prop 유무로 판별, 내부 `internalValue` 상태 분리

### 기술 스택 (현재)

| 영역 | 기술 |
|------|------|
| UI 프레임워크 | React 18/19 |
| 언어 | TypeScript 5+ (strict) |
| 에디터 엔진 | CodeMirror 6 |
| MD 파서 | unified + remark + rehype |
| 빌드 | tsup (ESM + CJS) |
| 모노레포 | Turborepo + pnpm workspaces |
| 테스트 | Vitest + Playwright |
| 커밋 | Conventional Commits |

## Development Workflow (개발 워크플로)

### 코드 변경 절차

1. 변경할 내용을 먼저 설명한다
2. 영향받는 파일 목록을 제시한다
3. 승인 후 구현한다
4. 테스트 통과를 확인한다

### 브랜치 전략

- `main` → `develop` → `feature/*`
- Conventional Commits 형식을 사용한다
- PR 당 최소 1인 승인을 받는다

### 절대 금지 명령어

```bash
git push --force
git reset --hard
git commit --no-verify
```

```sql
DROP TABLE / DROP DATABASE / TRUNCATE (사용자 명시적 요청 없이)
DELETE FROM (WHERE 절 없이)
ALTER TABLE ... DROP COLUMN (사용자 명시적 요청 없이)
```

### 마이그레이션 규칙

- 기존 데이터 존재 시 마이그레이션으로 해결한다 (Drizzle ORM + drizzle-kit)
- 마이그레이션은 롤백 가능해야 한다 (DOWN 스크립트 필수)
- 운영 DB 직접 변경을 금지한다

## Governance

이 Constitution은 MarkFlow 프로젝트의 최상위 규칙이다.

- **우선순위:** Constitution > CLAUDE.md > `.claude/rules/` > 개별 판단
- **수정 절차:** Constitution 변경 시 변경 사유와 영향 범위를 문서화하고, 관련 템플릿과의 정합성을 검증한다
- **버전 관리:** Semantic Versioning (MAJOR: 원칙 제거/재정의, MINOR: 원칙 추가/확장, PATCH: 문구 수정)
- **정합성 검증:** 새 기능의 plan/spec/tasks 작성 시 Constitution Check를 수행한다
- **위반 대응:** PR 리뷰 시 Constitution 준수 여부를 확인한다. 위반이 불가피한 경우 Complexity Tracking에 근거를 기록한다

**Version**: 1.0.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-26
