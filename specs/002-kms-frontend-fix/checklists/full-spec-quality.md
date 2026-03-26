# Full Spec Quality Checklist: KMS 프론트엔드 버그 수정 및 UI 재정비

**Purpose**: 구현 시작 전 spec/plan/tasks 전체 요구사항의 완전성, 명확성, 일관성을 검증
**Created**: 2026-03-27
**Feature**: [spec.md](../spec.md)
**Focus**: UX/Design + API Contract/Data Flow + State/Auth Flow (종합)
**Audience**: 구현자 (Pre-implementation)

## Requirement Completeness

- [x] CHK001 - 프로토타입의 모달 시스템(overlay, animation, sizing) 요구사항이 spec에 정의되어 있는가? 문서 생성/워크스페이스 생성 모달의 공통 디자인 패턴이 명시되어 있는가? [Gap]
- [x] CHK002 - 에디터 페이지(US3)의 레이아웃 요구사항이 정의되어 있는가? 프로토타입의 에디터 구조(toolbar + split pane vs single pane)가 spec에 명시되어 있는가? [Completeness, Spec §FR-009]
- [x] CHK003 - 워크스페이스 목록 페이지의 빈 상태(0개) UI 요구사항이 acceptance scenario에 포함되어 있는가? 현재 Edge Cases에만 언급되고 US1 시나리오에는 없음 [Gap, Spec §Edge Cases L87]
- [x] CHK004 - 사이드바 검색 바(⌘K)의 기능 범위가 정의되어 있는가? 검색 대상(문서 제목만? 내용 포함?), 결과 표시 방식, 키보드 단축키 동작이 spec에 명시되어 있는가? [Gap, Spec §FR-006]
- [x] CHK005 - 문서 삭제 확인 UI 요구사항이 정의되어 있는가? 즉시 삭제인지 확인 다이얼로그가 필요한지 spec에 명시되어 있는가? [Gap, Spec §US3-AS5]

## Requirement Clarity

- [x] CHK006 - SC-003 "시각적 일치도 90% 이상"이 객관적으로 측정 가능한 기준으로 정의되어 있는가? "90%"의 측정 방법(색상 정확도, 레이아웃 픽셀 오차, 폰트 일치)이 명시되어 있는가? [Ambiguity, Spec §SC-003]
- [x] CHK007 - FR-002 "slug가 undefined일 때 /undefined URL로 이동하지 않아야 한다"의 방어 범위가 명확한가? 모든 라우팅(Link, router.push, router.replace, 브라우저 뒤로가기)을 포함하는지 정의되어 있는가? [Clarity, Spec §FR-002]
- [x] CHK008 - FR-009 "1초 디바운스 자동 저장"의 실패 시 동작이 명확하게 정의되어 있는가? 네트워크 오류 시 재시도 횟수, 간격, 사용자 알림 방식이 spec에 명시되어 있는가? [Clarity, Spec §FR-009]
- [x] CHK009 - US2-AS3 사이드바 네비게이션에서 "그래프"가 포함되어 있으나, 그래프 페이지 자체의 요구사항이 spec FR에 없음. 이번 범위에 포함인지 제외인지 명시되어 있는가? [Ambiguity, Spec §US2-AS3 vs Assumptions]
- [x] CHK010 - "프로토타입 디자인과 일치"가 반복적으로 사용되지만, 프로토타입의 반응형(responsive) 동작 요구사항은 정의되어 있는가? 모바일/태블릿 대응 여부가 spec에 명시되어 있는가? [Ambiguity, Spec §FR-004]

## Requirement Consistency

- [x] CHK011 - spec US1-AS2는 "/{workspaceSlug} 경로로 이동하며 문서 목록이 표시된다"이지만, 라우트 구조상 문서 목록은 `/{slug}/docs`임. 최종 목적지 경로가 spec과 plan/tasks 간에 일관되는가? [Conflict, Spec §US1-AS2 vs plan.md L69]
- [x] CHK012 - spec §FR-007은 "로그인/회원가입 페이지"만 명시하지만, 인증 플로우에 verify-email 페이지도 포함됨. FR-007의 범위와 tasks의 T010-1이 일관되는가? [Consistency, Spec §FR-007 vs tasks.md]
- [x] CHK013 - spec Assumptions "기존 컴포넌트 파일 수정 방식으로 진행"이지만, plan.md에 `app-header.tsx` 신규 생성이 포함됨. 신규 파일 생성 허용 범위가 일관되게 정의되어 있는가? [Conflict, Spec §Assumptions vs plan.md L79]
- [x] CHK014 - spec US4-AS1 워크스페이스 생성 후 이동 경로가 spec에 명시되어 있지 않음. tasks T027은 `/${workspace.slug}`로 이동하는데, US1-AS2의 docs 리다이렉트와 일관되는가? [Consistency, Spec §US4-AS1 vs tasks.md T027]

## Acceptance Criteria Quality

- [x] CHK015 - US3-AS3 "자동 저장되고 '저장됨' 상태가 표시된다"에서 저장 상태의 정확한 UI 표현(위치, 텍스트, 아이콘)이 measurable하게 정의되어 있는가? [Measurability, Spec §US3-AS3]
- [x] CHK016 - SC-001 "5초 이내" 기준이 네트워크 조건(로컬 dev vs 프로덕션)에 따라 다를 수 있음. 측정 환경이 정의되어 있는가? [Measurability, Spec §SC-001]
- [x] CHK017 - US2-AS2 "프로토타입과 일치한다"가 pass/fail 판단 기준으로 충분한가? 헤더 높이, 사이드바 폭은 구체적이지만 "일치"의 허용 오차가 정의되어 있는가? [Measurability, Spec §US2-AS2]

## Scenario Coverage

- [x] CHK018 - 인증 토큰 만료 시 사용자 경험 요구사항이 정의되어 있는가? 에디터에서 자동 저장 중 토큰 만료 시 동작(저장 실패 후 재인증 → 미저장 데이터 유실 방지)이 spec에 명시되어 있는가? [Gap, Exception Flow]
- [x] CHK019 - 동시 편집 시나리오(같은 문서를 두 탭에서 편집)에 대한 요구사항이 정의되어 있는가? Phase 1에서 제외라면 명시적 exclusion이 있는가? [Gap, Alternate Flow]
- [x] CHK020 - 워크스페이스 전환 시 에디터 미저장 데이터 처리 요구사항이 정의되어 있는가? 사이드바에서 다른 워크스페이스로 이동할 때 unsaved 경고 여부가 spec에 있는가? [Gap, Alternate Flow]

## Edge Case Coverage

- [x] CHK021 - 극단적 길이의 입력(300자 문서 제목, 100자 워크스페이스 이름)에 대한 UI truncation/overflow 요구사항이 정의되어 있는가? [Edge Case, Gap]
- [x] CHK022 - 한글 slug 자동 생성 규칙이 정의되어 있는가? 워크스페이스 이름이 "마크플로우 팀"일 때 slug 변환 로직(romanization vs 제거)이 spec에 명시되어 있는가? [Edge Case, Gap]
- [x] CHK023 - 대량 문서(100+, 1000+) 목록에서의 페이지네이션/가상 스크롤 요구사항이 정의되어 있는가? FR-010 페이지네이션의 한 페이지 항목 수/UI가 spec에 있는가? [Edge Case, Spec §FR-010]

## Non-Functional Requirements

- [x] CHK024 - 접근성(a11y) 요구사항이 spec에 정의되어 있는가? 키보드 네비게이션, 스크린 리더 지원, ARIA 속성, 색상 대비 기준이 명시되어 있는가? [Gap, Non-Functional]
- [x] CHK025 - 프론트엔드 에러 로깅/모니터링 요구사항이 정의되어 있는가? Constitution VII은 console.log 금지를 명시하지만 대체 로깅 전략이 spec에 없음 [Gap, Non-Functional, Constitution §VII]

## Dependencies & Assumptions

- [x] CHK026 - "백엔드 API는 정상 동작하며 변경하지 않는다" 가정이 검증되었는가? research.md에서 발견된 API 응답 래퍼 패턴이 실제 백엔드와 일치하는지 확인되었는가? [Assumption, Spec §Assumptions]
- [x] CHK027 - @markflow/editor 패키지의 현재 버전이 apps/web에서 정상 import 가능한지, 필요한 props 인터페이스(value, onChange, theme)가 data-model.md에 문서화되어 있는가? [Dependency, Gap]

## Notes

- Check items off as completed: `[x]`
- [Gap] = 요구사항 자체가 누락, [Ambiguity] = 정의는 있으나 모호, [Conflict] = 문서 간 충돌
- 구현 시작 전 CRITICAL/HIGH 항목을 우선 해결하고, MEDIUM은 구현 중 점진적 보완 가능
