# CHECK_LIST: Prototype Features 구현 잔여 작업

**Branch**: `004-prototype-features`
**Last Updated**: 2026-03-27
**Progress**: 23/74 tasks (31%) — Setup + Toast + 전체 테스트 완료, 구현 대기

---

## Phase 1: Setup ✅ COMPLETE

- [x] T001 workspaces 스키마 themePreset/themeCss 컬럼 추가
- [x] T002 embed_tokens 테이블 스키마 생성
- [x] T003 join_requests unique partial index 추가
- [x] T004 Drizzle 마이그레이션 생성
- [x] T005 index.ts barrel export 추가

## Phase 2: Foundational (Toast) ✅ COMPLETE

- [x] T006 toast-store.ts Zustand 스토어
- [x] T007 toast-store 단위 테스트 (7 cases)
- [x] T008 ToastProvider 컴포넌트
- [x] T009 root layout 통합

## Phase 3: US1 — Landing Page 🔴 미구현

- [x] T010 E2E 테스트 작성 완료
- [ ] T011 `apps/web/app/(landing)/layout.tsx` — 랜딩 전용 레이아웃 (사이드바/헤더 없음)
- [ ] T012 `apps/web/components/landing/hero.tsx` — Hero 섹션 (eyebrow, 타이틀, CTA 2개)
- [ ] T013 `apps/web/components/landing/features-grid.tsx` — 6개 기능 카드 그리드
- [ ] T014 `apps/web/components/landing/pricing-section.tsx` — Free/Team/Enterprise 3티어
- [ ] T015 `apps/web/components/landing/footer.tsx` — 푸터 (Product/Developer/Company 링크)
- [ ] T016 `apps/web/components/landing/nav-bar.tsx` — 상단 내비게이션 바
- [ ] T017 `apps/web/app/(landing)/page.tsx` — 전체 조립
- [ ] T018 로그인 사용자 → 워크스페이스 선택 리다이렉트

## Phase 4: US2 — Global Search Modal 🔴 미구현

- [x] T019 search-modal 단위 테스트 작성 완료
- [ ] T020 `apps/web/components/search-modal.tsx` — 검색 모달 (입력, 최근문서, 결과, 하이라이트, 키보드 내비)
- [ ] T021 `apps/web/app/(app)/layout.tsx` — Cmd+/ 글로벌 키보드 리스너
- [ ] T022 `apps/web/components/sidebar.tsx` — 사이드바 검색 바 → 모달 연동
- [ ] T023 `apps/web/components/app-header.tsx` — 헤더 검색 아이콘 → 모달 연동

## Phase 5: US9 — Document Links Modal 🔴 미구현

- [x] T024 document-links-modal 단위 테스트 작성 완료
- [ ] T025 `apps/web/components/document-links-modal.tsx` — Prev/Next/Related 편집 모달
- [ ] T026 `apps/web/components/document-meta-panel.tsx` — 인라인 관계 편집 → 모달 연동으로 변경
- [ ] T027 `apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx` — 프리뷰 하단 Prev/Next 카드

## Phase 6: US4 — DAG Structure Diagram 🔴 미구현

- [x] T028 mini-dag-diagram 단위 테스트 작성 완료
- [ ] T029 `apps/web/components/mini-dag-diagram.tsx` — 메타 패널 인라인 SVG 미니 DAG
- [ ] T030 `apps/web/components/dag-structure-modal.tsx` — 전체 DAG 모달 (범례, 줌, 요약 카드)
- [ ] T031 `apps/web/components/document-meta-panel.tsx` — "문서 연결 구조" 섹션에 미니 DAG 통합

## Phase 7: US11 — Version History Modal 🔴 미구현

- [x] T032 version-history-modal 단위 테스트 작성 완료
- [ ] T033 `pnpm --filter @markflow/web add diff` — diff 패키지 설치
- [ ] T034 `apps/web/components/version-history-modal.tsx` — 2패널 모달 (버전 목록 + diff 미리보기)
- [ ] T035 `apps/web/components/version-history-panel.tsx` — "전체 보기" 버튼 → 모달 연동
- [ ] T036 복원 시 미저장 변경사항 경고

## Phase 8: US6 — Import/Export Modal 🔴 미구현

- [x] T037 import-export-modal 단위 테스트 작성 완료
- [ ] T038 `apps/web/components/import-export-modal.tsx` — 가져오기/내보내기 모달 (탭, 드롭존, 범위 선택)
- [ ] T039 `apps/web/components/sidebar.tsx` — "가져오기/내보내기" 사이드바 항목 → 모달 연동
- [ ] T040 `apps/web/app/(app)/[workspaceSlug]/docs/[docId]/page.tsx` — 에디터 툴바 Export 버튼 → 모달

## Phase 9: US3 — Join Request System 🔴 미구현

- [x] T041 public-workspaces API 통합 테스트 작성 완료
- [x] T042 join-request-panel 단위 테스트 작성 완료
- [ ] T043 `apps/api/src/routes/workspaces.ts` — `GET /workspaces/public` 엔드포인트 추가
- [ ] T044 `apps/api/src/services/workspace-service.ts` — `listPublicWorkspaces` 메서드
- [ ] T045 `apps/web/components/join-request-panel.tsx` — 접이식 패널 (검색, 결과, 신청 모달)
- [ ] T046 `apps/web/app/(app)/page.tsx` — 워크스페이스 선택 화면에 패널 통합
- [ ] T047 `apps/web/app/(app)/page.tsx` — 대기 중 신청 표시 + 취소 버튼

## Phase 10: US8 — Member Management 4탭 🔴 미구현

- [x] T048 members 탭 전환/역할 매트릭스 단위 테스트 작성 완료
- [ ] T049 `apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx` — 4탭 리팩토링
- [ ] T050 `apps/web/components/settings/invite-status-tab.tsx` — 초대 현황 탭
- [ ] T051 `apps/web/components/settings/member-export-tab.tsx` — 내보내기 탭 (CSV/PDF)
- [ ] T052 역할 권한 매트릭스 테이블 (Owner/Admin/Editor/Viewer × Read/Write/Invite/Settings)

## Phase 11: US5 — CSS Theme System 🔴 미구현 (Backend + Frontend)

- [x] T053 theme API 통합 테스트 작성 완료
- [x] T054 CSS validator 단위 테스트 작성 완료
- [ ] T055 `apps/api/src/utils/css-validator.ts` — CSS 변수 검증 유틸리티 (--mf-* 만 허용)
- [ ] T056 `apps/api/src/services/theme-service.ts` — 테마 CRUD 서비스
- [ ] T057 `apps/api/src/routes/theme.ts` — GET/PATCH /workspaces/:id/theme
- [ ] T058 `apps/api/src/index.ts` — 테마 라우트 등록
- [ ] T059 `apps/web/app/(app)/[workspaceSlug]/settings/theme/page.tsx` — 테마 설정 페이지
- [ ] T060 `apps/web/app/(app)/[workspaceSlug]/layout.tsx` — 동적 `<style>` 테마 주입
- [ ] T061 설정 사이드바에 "CSS 테마" 항목 추가

## Phase 12: US7 — Embed Integration 🔴 미구현 (Backend + Frontend)

- [x] T062 embed-token CRUD 통합 테스트 작성 완료
- [ ] T063 `apps/api/src/services/embed-token-service.ts` — Guest Token 서비스 (생성, 목록, 폐기)
- [ ] T064 `apps/api/src/routes/embed-tokens.ts` — POST/GET/DELETE 엔드포인트
- [ ] T065 `apps/api/src/index.ts` — 임베드 토큰 라우트 등록
- [ ] T066 `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx` — 3탭 설정 페이지
- [ ] T067 설정 사이드바에 "임베드 연동" 항목 추가

## Phase 13: Editor Enhancements 🔴 미구현

- [x] T068 wordCount 단위 테스트 작성 완료 (10 cases)
- [ ] T069 `packages/editor/src/preview/PreviewPane.tsx` — 프리뷰 헤더에 Word count 표시
- [ ] T070 `packages/editor/src/editor/EditorPane.tsx` — 에디터 헤더에 커서 위치 (줄, 열) 표시

## Phase 14: Polish 🔴 미완료

- [ ] T071 모든 US에서 토스트 통합 검증 (저장/삭제/초대/오류 피드백)
- [ ] T072 랜딩 페이지 모바일 반응형 검증 (768px 브레이크포인트)
- [ ] T073 전체 테스트 스위트 실행: `pnpm test`
- [ ] T074 quickstart.md 검증: 설정 가이드 end-to-end 동작 확인

---

## 요약

| 카테고리 | 완료 | 남은 | 비고 |
|----------|------|------|------|
| DB 스키마 | 5/5 | 0 | ✅ |
| Toast 시스템 | 4/4 | 0 | ✅ |
| 테스트 코드 | 14/14 | 0 | ✅ TDD 준비 완료 |
| 프론트엔드 컴포넌트 | 0/30 | 30 | 모달, 페이지, 통합 |
| 백엔드 API | 0/10 | 10 | 테마, 임베드, 공개WS |
| 에디터 패키지 | 0/2 | 2 | word count, cursor |
| 폴리시 | 0/4 | 4 | 통합 검증 |
| **합계** | **23/74** | **51** | **31% 완료** |

## 구현 우선순위 (권장)

```
1. US1  Landing Page       — 프론트엔드 전용, 독립적, MVP
2. US2  Search Modal       — 프론트엔드 전용, 기존 API 재활용
3. US9  Doc Links Modal    — 프론트엔드 전용, 기존 API 재활용
4. US4  DAG Diagram        — 프론트엔드 전용, 기존 컴포넌트 재활용
5. US11 Version History    — 프론트엔드 + diff 패키지
6. US6  Import/Export      — 프론트엔드 전용, 기존 API 재활용
7. US3  Join Request       — API 1개 추가 + 프론트엔드
8. US8  Members 4탭        — 프론트엔드 보강
9. US5  CSS Theme          — Full-stack (API + DB + UI)
10. US7 Embed              — Full-stack (API + DB + UI)
11. Editor Enhancements    — 패키지 내부
12. Polish                 — 통합 검증
```

## 에디터 패키지 테스트 상태

```
✅ markdownActions.test.ts — 28/28 passed (206ms)
   - Headings H1-H6: 6/6
   - Bold: 2/2
   - Italic: 1/1
   - Strikethrough: 3/3
   - Inline Code: 1/1
   - Lists (UL/OL/Task): 3/3
   - Blockquote: 1/1
   - Code Block: 2/2
   - Horizontal Rule: 1/1
   - Link: 1/1
   - Image: 1/1
   - Table: 1/1
   - Math (Inline/Block): 2/2
   - 복합 렌더링: 2/2
   - 통합 테스트 (22개 액션): 1/1
```
