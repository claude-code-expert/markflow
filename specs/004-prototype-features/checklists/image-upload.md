# Image Upload Integration — Requirements Quality Checklist

**Purpose**: Avatar R2 업로드 + 에디터 이미지 업로드 통합 모듈, 설정 안내 UI, Cloudflare R2 Worker 연동에 대한 요구사항 품질 검증
**Created**: 2026-04-05
**Feature**: 이미지 업로드 통합 (Phase 2 P1)
**Focus**: Requirement Completeness, Clarity, Consistency, Edge Case Coverage
**Depth**: Standard
**Audience**: Reviewer (PR)

---

## Requirement Completeness

- [ ] CHK001 - 통합 업로드 모듈이 지원해야 하는 이미지 형식(JPG/PNG/WebP/GIF/SVG)이 Avatar와 에디터에서 각각 명시되어 있는가? [Completeness, Gap]
- [ ] CHK002 - Avatar 업로드와 에디터 업로드의 파일 크기 제한이 각각 문서화되어 있는가? (Avatar: 5MB, Editor: 10MB) [Completeness, Gap]
- [ ] CHK003 - Worker URL 설정의 우선순위 해석 규칙(env var > localStorage)이 요구사항으로 정의되어 있는가? [Completeness, Gap]
- [ ] CHK004 - R2 Worker 배포에 필요한 사전 조건(Cloudflare 계정, wrangler CLI, 버킷 생성, 퍼블릭 액세스)이 요구사항에 열거되어 있는가? [Completeness, Gap]
- [ ] CHK005 - 설정 안내 페이지의 필수 UI 요소(연결 상태, URL 입력, 테스트, 가이드)가 정의되어 있는가? [Completeness, Gap]
- [ ] CHK006 - 에디터 우측 패널 가이드(StorageGuidePanel)의 요구사항이 별도로 문서화되어 있는가? [Completeness, Gap]
- [ ] CHK007 - `PUT /users/me/avatar` 엔드포인트의 deprecated 상태와 대체 흐름이 API 스펙에 반영되어 있는가? [Completeness, Spec §005 §2]
- [ ] CHK008 - 이미지 업로드 실패 시 사용자에게 보여줄 에러 유형별 메시지가 정의되어 있는가? (NO_WORKER_URL, VALIDATION_FAILED, UPLOAD_FAILED) [Completeness, Gap]

## Requirement Clarity

- [ ] CHK009 - "이미지 저장소 미설정 시" 동작이 에디터와 프로필 모달에서 각각 명확하게 정의되어 있는가? (에러 vs 가이드 표시) [Clarity, Gap]
- [ ] CHK010 - Avatar 업로드 시 "R2 Worker로 업로드 → URL 획득 → PATCH /users/me"라는 새 흐름이 기존 스펙의 `PUT /users/me/avatar` 설명과 모순 없이 정의되어 있는가? [Clarity, Spec §005 §2]
- [ ] CHK011 - localStorage 키 `mf-cf-worker-url`이 에디터 패키지와 웹 앱에서 공유됨이 명시되어 있는가? [Clarity, Gap]
- [ ] CHK012 - "연결 테스트"의 성공/실패 판정 기준이 구체적으로 정의되어 있는가? (테스트 이미지 업로드 + URL 반환 여부) [Clarity, Gap]
- [ ] CHK013 - 환경 변수 `NEXT_PUBLIC_R2_WORKER_URL` 설정 시 UI에서 입력이 비활성화되는 동작이 명시되어 있는가? [Clarity, Gap]

## Requirement Consistency

- [ ] CHK014 - Avatar 검증 규칙(JPG/PNG/WebP, 5MB)과 에디터 검증 규칙(PNG/JPEG/GIF/WebP/SVG, 10MB)의 차이가 의도적으로 정의되어 있는가? [Consistency, Gap]
- [ ] CHK015 - R2 Worker의 허용 타입(PNG/JPEG/GIF/WebP/SVG, 10MB)과 에디터 클라이언트 검증 규칙이 일관되는가? [Consistency, Spec §Worker]
- [ ] CHK016 - 설정 페이지(`/settings/storage`)와 에디터 우측 패널 가이드의 안내 내용이 동일한 Step 순서를 따르는가? [Consistency]
- [ ] CHK017 - 에디터 패키지의 내장 `SettingsModal`/`ImageUploadGuide`와 웹 앱의 `StorageGuidePanel`/설정 페이지 간 역할 분리가 명확히 정의되어 있는가? [Consistency, Gap]
- [ ] CHK018 - 로드맵(008 Phase 2)의 "Avatar R2 실제 업로드" 항목과 구현된 클라이언트사이드 업로드 방식의 차이가 문서에 반영되어 있는가? [Consistency, Spec §008]

## Acceptance Criteria Quality

- [ ] CHK019 - "이미지 업로드 성공"의 수용 기준이 구체적으로 정의되어 있는가? (R2 저장 + public URL 반환 + DB 반영) [Measurability, Gap]
- [ ] CHK020 - 설정 가이드의 "완료" 상태 판정 기준이 정의되어 있는가? (테스트 성공 + 저장) [Measurability, Gap]
- [ ] CHK021 - Avatar 업로드 후 기존 이미지 교체 시 이전 이미지의 R2 정리 정책이 수용 기준에 포함되어 있는가? [Measurability, Gap]

## Scenario Coverage

- [ ] CHK022 - 에디터에서 이미지 드래그앤드롭, 붙여넣기, 파일 선택 세 가지 입력 경로가 모두 요구사항에 정의되어 있는가? [Coverage, Gap]
- [ ] CHK023 - 에디터에서 Worker 미설정 시 에디터 내장 `ImageUploadGuide` 모달이 표시되는 흐름이 정의되어 있는가? [Coverage, Gap]
- [ ] CHK024 - 프로필 모달에서 Worker 미설정 시 카메라 버튼 → 가이드 패널 표시 흐름이 정의되어 있는가? [Coverage, Gap]
- [ ] CHK025 - 설정 페이지에서 URL 삭제 후 기존 업로드된 이미지의 표시 동작이 정의되어 있는가? [Coverage, Gap]
- [ ] CHK026 - 여러 이미지를 동시에 업로드하는 시나리오(에디터 다중 붙여넣기)가 다루어져 있는가? [Coverage, Gap]

## Edge Case Coverage

- [ ] CHK027 - Worker 응답이 성공이나 반환된 URL이 유효하지 않은 경우의 처리가 정의되어 있는가? [Edge Case, Gap]
- [ ] CHK028 - 업로드 중 네트워크 단절 시 플레이스홀더(`![Uploading...]()`)의 정리 방법이 정의되어 있는가? [Edge Case, Gap]
- [ ] CHK029 - R2 퍼블릭 액세스가 꺼져 있을 때(PUBLIC_URL 미설정) 업로드는 성공하지만 이미지가 표시 안 되는 시나리오가 다루어져 있는가? [Edge Case, Gap]
- [ ] CHK030 - Avatar 업로드 성공 후 `PATCH /users/me` 실패 시 고아 이미지 처리 정책이 정의되어 있는가? [Edge Case, Gap]
- [ ] CHK031 - SVG 파일이 Avatar에서는 거부되고 에디터에서는 허용되는 보안 근거가 문서화되어 있는가? [Edge Case, Gap]
- [ ] CHK032 - `wrangler.toml`의 `ALLOWED_ORIGINS`에 현재 도메인이 누락되었을 때 CORS 에러 안내가 정의되어 있는가? [Edge Case, Gap]

## Non-Functional Requirements

- [ ] CHK033 - 이미지 업로드의 최대 응답 시간 요구사항이 정의되어 있는가? (타임아웃 기준) [NFR, Gap]
- [ ] CHK034 - R2 Worker의 CORS 정책 요구사항이 보안 문서에 반영되어 있는가? [NFR, Security, Gap]
- [ ] CHK035 - 업로드된 이미지의 CDN 캐싱 정책이 정의되어 있는가? [NFR, Performance, Gap]
- [ ] CHK036 - 설정 가이드 UI의 접근성(키보드 내비게이션, 스크린 리더)이 요구사항에 포함되어 있는가? [NFR, Accessibility, Gap]

## Dependencies & Assumptions

- [ ] CHK037 - Cloudflare R2 무료 티어 제한(10GB 저장, 1000만 읽기/월)에 대한 용량 초과 시 대응 계획이 문서화되어 있는가? [Dependency, Gap]
- [ ] CHK038 - `@markflow/editor` 패키지의 `createCloudflareUploader`, `validateImageFile` export에 대한 버전 의존성이 명시되어 있는가? [Dependency, Gap]
- [ ] CHK039 - 웹 앱과 에디터 패키지가 동일한 localStorage 키를 공유한다는 가정이 문서화되어 있는가? [Assumption, Gap]
- [ ] CHK040 - R2 Worker가 별도 인증 없이 public POST를 허용하는 보안 가정이 검토되어 있는가? [Assumption, Security, Gap]

## Ambiguities & Conflicts

- [ ] CHK041 - 감사 체크리스트(checklist-04-04)의 `PUT /users/me/avatar` "부분 구현" 상태와 현재 클라이언트 직접 업로드 방식 사이의 불일치가 해소되어 있는가? [Conflict, Spec §checklist-04-04 §2.2]
- [ ] CHK042 - API 스펙(005 §2)의 Avatar 업로드 엔드포인트 설명이 현재 "클라이언트 → R2 Worker → PATCH" 흐름을 반영하도록 업데이트가 필요한가? [Ambiguity, Spec §005 §2]
- [ ] CHK043 - 에디터 패키지 내장 설정(SettingsModal)과 웹 앱 설정 페이지 중 어느 것이 우선인지 정의되어 있는가? [Ambiguity, Gap]
