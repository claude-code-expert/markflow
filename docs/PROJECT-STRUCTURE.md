# MarkFlow 프로젝트 구조

> **최종 수정:** 2026-03-26

## 디렉토리 구조

```
markflow-editor/
├── .claude/
│   ├── rules/
│   │   ├── editor.md                  ← packages/editor/** 코딩 규칙
│   │   └── testing.md                 ← **/*.test.ts 테스트 규칙
│   └── settings.local.json
│
├── packages/
│   └── editor/                        ← @markflow/editor (npm 배포 가능)
│       ├── src/
│       │   ├── index.ts               ← Public API (barrel export)
│       │   ├── types/index.ts         ← 타입 정의
│       │   ├── MarkdownEditor.tsx     ← 루트 컴포넌트
│       │   ├── editor/EditorPane.tsx  ← CodeMirror 6 래퍼
│       │   ├── preview/PreviewPane.tsx← 마크다운 → HTML 렌더링
│       │   ├── toolbar/              ← Toolbar, SettingsModal, ImageUploadGuide
│       │   ├── utils/                ← parseMarkdown, markdownActions, cloudflareUploader, imageValidation
│       │   └── styles/               ← CSS (.mf- 네임스페이스)
│       ├── CLAUDE.md
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── apps/
│   ├── demo/                          ← Next.js 에디터 데모 앱
│   └── worker/                        ← Cloudflare R2 이미지 업로드 Worker (선택적 인프라)
│
├── docs/                              ← 설계 문서 + 프로토타입
│   ├── 001_requirement_v1_2.md
│   ├── 002_component_v1_2.md
│   ├── 003_user-flow_v1_2.md
│   ├── 004_data-model_v1_2.md
│   ├── 005_api-spec_v1_2.md
│   ├── 006_test-spec_v1_2.md
│   ├── 007_architecture.md
│   ├── 008_roadmap_v1_2.md
│   ├── design/                        ← 디자인 시스템, 컬러, 레이아웃
│   ├── markdown-kms-spec.html         ← KMS 스펙 프로토타입
│   └── markflow-prototype.html        ← 에디터 프로토타입
│
├── CLAUDE.md                          ← 루트 프로젝트 지침
├── AGENTS.md
├── tsconfig.base.json                 ← 공유 TypeScript 설정
├── turbo.json                         ← Turborepo 태스크 설정
├── pnpm-workspace.yaml                ← 워크스페이스 정의
└── package.json                       ← 루트 (turbo, typescript)
```

## 의존성 그래프

```
@markflow/editor       (packages/editor)
  ^
apps/demo              (apps/demo)

apps/worker            (apps/worker, 독립 — 에디터와 의존 관계 없음)
```

## 패키지 원칙

| 원칙 | 설명 |
|------|------|
| **패키지 = 배포/소비 경계** | 코드 정리 목적의 패키지 분리 금지 |
| npm 독립 배포 라이브러리 | → `packages/` |
| 배포 대상 앱 | → `apps/` |
| 내부 코드 구조화 | → 폴더 + `.claude/rules/` |
| 시기상조 추출 금지 | 실제 소비자가 생길 때 분리 |

### Phase별 확장 계획

| Phase | 추가 항목 | 위치 |
|-------|----------|------|
| Phase 1 (KMS) | Drizzle DB 스키마 + 마이그레이션 | `packages/db` |
| Phase 1 (KMS) | Next.js KMS 앱 (Vercel) | `apps/web` |
| Phase 2+ | React-free 마크다운 파이프라인 (필요 시) | `packages/core` 추출 |
| Phase 2+ | 별도 API 서버 (필요 시) | `apps/api` |

## 빌드 & 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm build` | 전체 빌드 (Turbo — 의존 순서 자동) |
| `pnpm dev` | 전체 dev 모드 |
| `pnpm test` | 전체 테스트 |

## @markflow/editor 이식 방법

어떤 React 18+ 프로젝트에든 독립 이식 가능:

```bash
npm install @markflow/editor
```

```typescript
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

export default function Page() {
  return <MarkdownEditor height="100vh" theme="dark" />
}
```

- `workspace:*` 의존 없음 — npm publish 즉시 가능
- 모든 의존성 자체 포함 (CodeMirror, unified, KaTeX 등)
- 소비자는 React만 peerDep으로 제공


