---
paths: "packages/editor/**"
---

# @markflow/editor 개발 규칙

## 패키지 개요
독립 배포 가능한 React 마크다운 에디터 컴포넌트.
- CodeMirror 6 기반 소스 편집기 + 실시간 미리보기
- CommonMark 0.28 + GFM + KaTeX 수식
- Cloudflare R2 이미지 업로드
- 라이트/다크 테마, controlled/uncontrolled 모드

## 소스 구조
```
src/
├── index.ts              ← Public API (barrel export)
├── types/index.ts        ← 모든 타입 정의 (여기서만 정의)
├── MarkdownEditor.tsx    ← 루트 컴포넌트
├── editor/EditorPane.tsx ← CodeMirror 래퍼
├── preview/PreviewPane.tsx ← 마크다운 → HTML 렌더링
├── toolbar/              ← Toolbar, SettingsModal, ImageUploadGuide
├── utils/                ← parseMarkdown, markdownActions, cloudflareUploader, imageValidation
└── styles/               ← CSS 파일 (모두 .mf- 네임스페이스)
```

## 코딩 컨벤션
- TypeScript strict mode, `any` 금지
- CSS 클래스: `.mf-` 접두사, CSS 변수: `--mf-` 접두사
- React: named export, function component
- lucide-react 아이콘, `ICON_SIZE = 14` 통일
- `'use client'` banner는 tsup이 자동 삽입

## 빌드
- tsup → ESM + CJS + DTS + CSS
- External: react, react-dom, @codemirror/*, @lezer/*
- 출력: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.css`

## import 규칙
- 타입은 `./types` 에서만 import
- parseMarkdown은 `./utils/parseMarkdown` 에서 import
- 패키지 외부 모듈(React, CodeMirror 등)은 peerDependencies/dependencies로 관리
