# 006 — 테스트 스펙 (Test Specification)

> **최종 수정:** 2026-03-26 (v1.2.0 반영)
> **도구:** Vitest (Unit/Integration) · Playwright (E2E) · MSW (API Mock)
> **목표 커버리지:** Unit 80% · API Integration 100% (핵심 플로우) · E2E 핵심 시나리오
> **변경 이력:** v1.2.0 — 2.4 폴더 관리 비즈니스 로직 테스트, 3.4 Categories API 테스트, 4.4 폴더 관리 E2E, 4.5 그래프 뷰 E2E 추가

---

## 1. 테스트 전략

```
테스트 피라미드
        ▲
       /E2E\          (소수, 고비용, 핵심 UX 시나리오)
      /──────\
     /  통합   \       (API 엔드포인트, DB 트랜잭션)
    /────────────\
   /   유닛 테스트  \   (함수, 컴포넌트, 유틸리티)
  /──────────────────\
```

| 레이어 | 도구 | 실행 환경 | 실행 시점 |
|--------|------|-----------|-----------|
| Unit | Vitest + React Testing Library | Node.js | PR마다, 로컬 |
| Integration | Vitest + Supertest | Node.js + Test DB | PR마다 |
| E2E | Playwright | Chromium/Firefox | 배포 전, 야간 |

---

## 2. 유닛 테스트

### 2.1 Markdown 파싱 유틸리티

**파일:** `packages/editor/src/utils/parseMarkdown.test.ts`

```typescript
describe('parseMarkdown()', () => {
  // CommonMark 블록 요소
  describe('Block elements', () => {
    it('ATX heading H1~H6를 올바른 <h1>~<h6>로 변환한다')
    it('Setext heading을 <h1>, <h2>로 변환한다')
    it('Fenced code block에 언어 클래스를 추가한다')
    it('GFM 테이블을 <table>로 렌더링한다')
    it('GFM Task list - [ ]를 checkbox input으로 변환한다')
    it('빈 문자열 입력 시 빈 문자열을 반환한다')
  })

  // 인라인 요소
  describe('Inline elements', () => {
    it('**text** → <strong>text</strong>')
    it('*text* → <em>text</em>')
    it('~~text~~ → <del>text</del>')
    it('[link](url) → <a href="url">link</a>')
  })

  // XSS 방어
  describe('Security (XSS)', () => {
    it('<script> 태그를 제거한다')
    it('on* 이벤트 속성을 제거한다')
    it('javascript: URL 스킴을 제거한다')
    it('허용된 클래스(code 하이라이팅)는 유지한다')
  })
})
```

### 2.2 Toolbar Action 유틸리티

**파일:** `packages/editor/src/utils/markdownActions.test.ts`

```typescript
describe('applyToolbarAction()', () => {
  describe('bold', () => {
    it('선택 텍스트를 **로 감싼다')
    it('선택 없을 시 플레이스홀더를 삽입한다')
  })

  describe('heading', () => {
    it('H2 액션이 현재 줄 앞에 ## 를 추가한다')
  })

  describe('codeblock', () => {
    it('언어 지정 코드블록을 삽입한다')
  })

  describe('table', () => {
    it('기본 3컬럼 테이블 구조를 삽입한다')
  })
})
```

### 2.3 React 컴포넌트 유닛 테스트

```typescript
describe('<Toolbar />', () => {
  it('H1~H6 버튼이 모두 렌더링된다')
  it('Bold 버튼 클릭 시 onAction({ type: bold }) 호출')
  it('Split view 버튼이 active 상태로 렌더링된다')
  it('readOnly=true 시 모든 서식 버튼이 비활성화된다')
})
```

### 2.4 비즈니스 로직 (KMS — 계획)

```typescript
describe('DocumentService', () => {
  describe('detectCyclicLink()', () => {
    it('A→B→A 순환 참조를 감지한다')
    it('A→B→C 순환 없는 경우 false 반환')
  })

  describe('generateSlug()', () => {
    it('한글 제목을 영문 slug로 변환한다')
    it('중복 slug에 suffix를 추가한다')
  })
})
```

### 2.5 폴더(카테고리) 비즈니스 로직 (🚧 신규)

```typescript
describe('CategoryService', () => {
  describe('createCategory()', () => {
    it('이름과 parentId를 받아 카테고리를 생성한다')
    it('parentId가 null이면 루트에 생성된다')
    it('같은 부모 아래 중복 이름이면 400 반환')
  })

  describe('renameCategory()', () => {
    it('이름을 변경하고 사이드바에 반영된다')
    it('Editor 이하 역할은 403 반환')
  })

  describe('deleteCategory()', () => {
    it('삭제 시 하위 문서의 categoryId가 null로 업데이트된다')
    it('하위에 다른 카테고리가 있으면 재귀 삭제 처리된다')
    it('Closure Table에서 모든 ancestor-descendant 행이 제거된다')
  })

  describe('moveCategory()', () => {
    it('카테고리를 다른 부모 아래로 이동한다')
    it('자기 자신의 자손으로 이동 시 400 반환 (순환 구조 방지)')
  })
})

describe('FolderContextMenu (UI)', () => {
  it('폴더 항목 우클릭 시 컨텍스트 메뉴가 표시된다')
  it('컨텍스트 메뉴가 뷰포트 경계를 벗어나지 않는다')
  it('외부 클릭 시 컨텍스트 메뉴가 닫힌다')
  it('Escape 키로 컨텍스트 메뉴가 닫힌다')
  it('폴더 항목 hover 시 ⋯ 버튼이 표시된다')
})

describe('NewFolderModal (UI)', () => {
  it('폴더 이름 입력 시 경로 미리보기가 실시간으로 업데이트된다')
  it('이름 없이 제출 시 오류 토스트가 표시된다')
  it('생성 완료 시 사이드바에 폴더가 추가된다')
})

describe('DeleteFolderModal (UI)', () => {
  it('폴더 이름 불일치 시 삭제가 차단된다')
  it('이름 일치 시 폴더 및 하위 항목이 DOM에서 제거된다')
})
```

### 2.6 DAG Pipeline Graph (UI) 🚧

```typescript
describe('DAGPipelineGraph', () => {
  it('prev → current(+related) → next 스테이지 순서로 렌더링된다')
  it('current 노드에 pulse 애니메이션 클래스가 적용된다')
  it('related 노드가 그룹 박스 내에 수직 스택으로 표시된다')
  it('노드 클릭 시 onNavigate 콜백이 해당 docId로 호출된다')
  it('compact 모드에서 폰트·패딩이 축소된다')
})

describe('MiniDAGGraph (메타 패널)', () => {
  it('메타 패널 내에서 스크롤 없이 전체가 보인다')
  it('전체 보기 버튼 클릭 시 그래프 뷰 페이지로 이동한다')
  it('링크 편집 버튼 클릭 시 modal-links가 열린다')
})

describe('DAGPipelineNav (프리뷰 하단)', () => {
  it('Prev/Next doc-nav를 대체하여 DAG 형태로 렌더링된다')
  it('prev 없을 때 prev 스테이지가 표시되지 않는다')
  it('next 없을 때 next 스테이지가 표시되지 않는다')
})
```

---

## 3. 통합 테스트 (KMS — 계획)

**설정:** Vitest + Supertest + PostgreSQL (Docker)

### 3.1 Auth API

```typescript
describe('POST /api/v1/auth/register', () => {
  it('올바른 입력으로 201 반환 및 이메일 발송')
  it('이미 존재하는 이메일은 409 반환')
  it('짧은 비밀번호는 400 반환')
})

describe('POST /api/v1/auth/login', () => {
  it('올바른 자격증명으로 accessToken + refreshToken 쿠키 반환')
  // C3 수정: 계정 잠금(401)과 Rate Limit(429)는 별개 메커니즘
  it('동일 계정 5회 실패 후 401 + ACCOUNT_LOCKED 코드 반환')
  it('ACCOUNT_LOCKED 응답에 lockedUntil(ISO8601) 필드 포함')
  it('IP 기준 10회/15분 초과 후 429 + RATE_LIMITED 반환')
  it('이메일 미인증 계정 로그인 시 403 + EMAIL_NOT_VERIFIED 반환')
})
```

### 3.2 Documents API

```typescript
describe('Documents API', () => {
  it('Editor 이상 멤버가 문서를 생성한다 → 201')
  it('Viewer 멤버는 403 반환')
  it('저장 시 새 버전이 생성된다')
  it('삭제 후 목록에서 제외되고 휴지통에서 조회된다')
  // M3: 태그
  it('태그 PUT으로 문서 태그 전체 교체된다')
  it('태그 31개 이상 PUT 시 400 반환')
  // M8: 버전 diff
  it('버전 diff API가 from/to 버전 사이 변경 내용을 반환한다')
  it('존재하지 않는 버전 번호로 diff 요청 시 404 반환')
  // M10: 연관 문서 제한
  it('연관 문서 21개 추가 시도 시 400 + TOO_MANY_RELATED_DOCS 반환')
  // M1: Export
  it('html format export 시 200 + text/html 반환')
  it('pdf format export 시 202 + jobId 반환')
})
```

### 3.3 권한 매트릭스

```typescript
describe('Role-based access control', () => {
  const scenarios = [
    ['owner',  'create_doc',    201],
    ['admin',  'create_doc',    201],
    ['editor', 'create_doc',    201],
    ['viewer', 'create_doc',    403],
    ['owner',  'delete_member', 204],
    ['editor', 'delete_member', 403],
    ['viewer', 'update_theme',  403],
    ['admin',  'update_theme',  200],
  ] as const

  test.each(scenarios)('%s 역할의 %s 액션은 %d 반환', ...)
})

describe('Embed Token API', () => {
  it('Admin 이상만 Guest Token을 발급할 수 있다')
  it('Editor 역할은 토큰 발급 시 403 반환')
  it('만료된 Guest Token으로 embed API 접근 시 401 반환')
  it('폐기된 토큰으로 접근 시 401 반환')
})

describe('Invitation API', () => {
  it('유효한 토큰으로 GET /invitations/:token 조회 시 200 반환')
  it('만료된 토큰 조회 시 410 반환')
  it('POST /invitations/:token/accept 성공 시 workspace에 멤버 추가됨')
  it('이미 멤버인 사용자가 수락 시 409 + ALREADY_MEMBER 반환')
})
```

### 3.4 Categories API (🚧 신규)

```typescript
describe('Categories API', () => {
  it('POST /categories → 201, 새 카테고리 생성')
  it('PATCH /categories/:id → 이름 변경 200')
  it('DELETE /categories/:id → 하위 문서 categoryId null 처리 후 204')
  it('중복 이름 POST → 409 반환')
  it('Viewer 역할의 POST /categories → 403')
  it('자기 자신을 부모로 이동 → 400 + CIRCULAR_CATEGORY')
})
```

---

## 4. E2E 테스트

### 4.1 온보딩 플로우 (KMS — 계획)

```typescript
test('신규 사용자가 가입 → 워크스페이스 생성 → 첫 문서 작성까지 완료한다', async ({ page }) => {
  // 1. 회원가입 → 2. 이메일 인증 → 3. 워크스페이스 생성
  // 4. 첫 문서 생성 → 5. 자동 저장 확인 → 6. 미리보기 확인
})
```

### 4.2 에디터 툴바

```typescript
test('Bold 버튼이 선택 텍스트를 ** 로 감싼다', async ({ page }) => {
  // 텍스트 입력 → 선택 → Bold 클릭 → 결과 확인
})
```

### 4.3 검색 (KMS — 계획)

```typescript
test('전역 검색으로 문서를 찾아 열 수 있다', async ({ page }) => {
  // Ctrl+/ → 검색어 입력 → 결과 선택 → 에디터 열림
})
```

### 4.4 폴더 관리 E2E 🚧 (신규)

```typescript
test('사이드바 📁 버튼으로 새 폴더를 생성한다', async ({ page }) => {
  // 1. 📁 버튼 클릭 → 모달 열림
  // 2. 폴더 이름 입력 → 경로 미리보기 업데이트 확인
  // 3. 상위 위치 선택
  // 4. 만들기 클릭 → 사이드바에 폴더 즉시 추가 확인
})

test('폴더 우클릭 컨텍스트 메뉴로 이름을 변경한다', async ({ page }) => {
  // 1. 폴더 항목 우클릭 → 컨텍스트 메뉴 표시
  // 2. 이름 변경 선택 → 모달 열림
  // 3. 새 이름 입력 → 확인
  // 4. 사이드바 DOM에서 이름 변경 확인
})

test('폴더 삭제 시 이름 확인 후 삭제된다', async ({ page }) => {
  // 1. 컨텍스트 메뉴 → 폴더 삭제
  // 2. 다른 이름 입력 → 삭제 차단 토스트 확인
  // 3. 정확한 이름 입력 → 삭제 완료 → 사이드바에서 제거 확인
})

test('컨텍스트 메뉴 → 새 문서 추가 시 해당 폴더가 기본값으로 설정된다', async ({ page }) => {
  // 1. 폴더 ⋯ 버튼 클릭 → 새 문서 추가
  // 2. 모달 열림 → 카테고리 select가 해당 폴더로 선택된 상태 확인
})
```

### 4.5 그래프 뷰 E2E 🚧 (신규)

```typescript
test('사이드바 그래프 뷰 메뉴 클릭 시 DAG 페이지로 이동한다', async ({ page }) => {
  // 1. 🔗 그래프 뷰 클릭
  // 2. page-graph 표시 확인
  // 3. 사이드바 활성 항목 변경 확인
  // 4. 브레드크럼 "그래프 뷰" 업데이트 확인
})

test('DAG 노드 클릭 시 해당 문서 에디터로 이동한다', async ({ page }) => {
  // 1. 그래프 뷰 진입
  // 2. 문서 노드 클릭
  // 3. page-editor 표시 + 브레드크럼 변경 확인
})

test('메타 패널 미니 DAG에서 전체 보기 클릭 시 그래프 뷰 페이지로 이동한다', async ({ page }) => {
  // 1. 에디터 진입 → 메타 패널 오픈
  // 2. 미니 DAG 전체 보기 버튼 클릭
  // 3. 그래프 뷰 페이지 표시 확인
})
```

---

## 5. 테스트 인프라

### 5.1 Vitest 설정

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
      exclude: ['**/*.test.ts', '**/node_modules/**', '**/migrations/**'],
    },
  },
})
```

### 5.2 GitHub Actions CI

```yaml
name: CI
on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test:unit -- --coverage

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run db:migrate:test
      - run: npm run test:integration

  e2e-test:
    needs: [unit-test, integration-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx playwright install --with-deps
      - run: npm run build && npm run e2e
```

### 5.3 테스트 데이터 팩토리

```typescript
export const factory = {
  user: (overrides?) => ({ id: randomUUID(), email: `user-${Date.now()}@example.com`, name: 'Test User', emailVerified: true, ...overrides }),
  workspace: (ownerId, overrides?) => ({ id: randomUUID(), name: 'Test Workspace', slug: `ws-${Date.now()}`, ownerId, ...overrides }),
  document: (workspaceId, authorId, overrides?) => ({ id: randomUUID(), workspaceId, authorId, title: 'Test Document', slug: `doc-${Date.now()}`, content: '# Test', currentVersion: 1, ...overrides }),
}
```
