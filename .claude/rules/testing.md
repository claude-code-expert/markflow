---
paths: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx"
---

# 테스트 규칙

## 프레임워크
- 유닛/통합: Vitest + @testing-library/react
- E2E: Playwright
- API Mock: MSW

## 커버리지 목표
- 유닛 테스트: 80%+ (lines, branches, functions, statements)
- API 통합 테스트: 핵심 플로우 100%
- E2E: 핵심 시나리오

## 컨벤션
- 테스트 파일: 소스 파일과 같은 디렉토리에 `*.test.ts(x)` 형식
- describe 블록으로 기능 그룹화
- it/test 설명은 한국어 또는 영어 일관되게 (파일 내 통일)
- 테스트 데이터 팩토리 사용 (`factory.user()`, `factory.document()` 등)

## 주의사항
- parseMarkdown 테스트 시 XSS 시도 케이스 필수 포함
- 컴포넌트 테스트는 구현 디테일이 아닌 사용자 행동 기준
- 비동기 테스트에 적절한 timeout 설정
