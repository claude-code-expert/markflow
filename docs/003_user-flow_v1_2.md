# 003 — 사용자 흐름 & 유저 스토리 (User Flow & Stories)

> **최종 수정:** 2026-03-26 (v1.2.0 반영)
> **상태 범례:** ✅ 구현 완료 · 🚧 프로토타입 구현 · 📋 계획됨
> **변경 이력:** v1.2.0 — UF-B2 폴더 생성 진입 경로 추가, UF-B8 DAG 내비게이션으로 업데이트, UF-B10 폴더 관리 신규, UF-B11 그래프 뷰 탐색 신규

---

## Part A. 에디터 사용자 흐름 ✅

### UF-A1. 문서 편집 플로우

```mermaid
flowchart TD
    A([에디터 로드]) --> B[Markdown 작성]
    B --> C{서식 적용 방법}
    C -- 툴바 버튼 --> D[해당 Markdown 구문 삽입]
    C -- 단축키 --> D
    C -- 직접 입력 --> D
    D --> E[실시간 미리보기 갱신]

    B --> F{이미지 삽입}
    F -- 툴바 클릭 --> G{Worker URL 설정됨?}
    F -- 드래그-드롭 --> G
    F -- 클립보드 붙여넣기 --> G
    G -- 미설정 --> H[Settings 모달 열림]
    H --> I[Worker URL 입력/저장]
    I --> G
    G -- 설정됨 --> J[플레이스홀더 삽입]
    J --> K[Cloudflare R2 업로드]
    K --> L[실제 URL로 교체]
    L --> E
```

### UF-A2. 레이아웃 전환 플로우

```mermaid
flowchart LR
    A([Split 뷰]) -- Editor Only --> B([에디터 전체 화면])
    B -- Split --> A
    A -- Preview Only --> C([미리보기 전체 화면])
    C -- Split --> A
```

---

## Part A. 에디터 유저 스토리 ✅

### Epic 1: 텍스트 편집

#### US-01 — 자유 텍스트 입력 ✅
**As a** 작성자, **I want to** 에디터에 마크다운 원문을 직접 입력하고 싶다, **So that** 원하는 형식의 문서를 자유롭게 작성할 수 있다.

- [x] CodeMirror 6 기반 텍스트 입력 영역
- [x] 입력 즉시 반영, 대용량 문서에서도 입력 지연 없음
- [x] Markdown 구문 하이라이팅

#### US-02 — 서식 적용 (선택 텍스트) ✅
**As a** 작성자, **I want to** 텍스트 선택 후 툴바 버튼을 클릭하고 싶다, **So that** 선택한 텍스트에만 서식이 적용된다.

- [x] 선택 상태에서 Bold → `**선택 텍스트**`
- [x] 선택 없을 시 플레이스홀더 삽입
- [x] H1~H6, Bold, Italic, Strikethrough, Code, Link, Image 등 모든 서식

#### US-03 — Markdown 구문 삽입 ✅
**As a** 작성자, **I want to** 툴바에서 다양한 구문 버튼을 클릭하고 싶다, **So that** Markdown 문법을 외우지 않아도 된다.

- [x] Heading 1~6, Bold, Italic, Strikethrough
- [x] Blockquote, Unordered/Ordered/Task List
- [x] Inline Code, Code Block, Link, Image, Table, HR
- [x] Math Inline, Math Block (KaTeX)

---

### Epic 2: 실시간 미리보기

#### US-04 — 미리보기 동기화 ✅
**As a** 작성자, **I want to** 편집 시 미리보기가 즉시 갱신되길 원한다, **So that** 렌더링 결과를 확인하면서 글을 작성할 수 있다.

- [x] 텍스트 변경 시 미리보기 즉시 갱신
- [x] 에디터 ↔ 미리보기 스크롤 동기화

#### US-05 — 레이아웃 전환 ✅
**As a** 작성자, **I want to** Split / Editor Only / Preview Only를 전환하고 싶다, **So that** 상황에 따라 화면을 효율적으로 사용할 수 있다.

- [x] 3종 레이아웃 전환 버튼
- [x] 숨김 시 해당 패널 미렌더링

#### US-06 — 테마 전환 ✅
**As a** 사용자, **I want to** 라이트/다크 테마를 전환하고 싶다, **So that** 선호하는 환경에서 편집할 수 있다.

- [x] 툴바 테마 토글 버튼
- [x] 에디터 + 미리보기 동시 테마 전환

---

### Epic 3: 이미지 업로드

#### US-07 — 이미지 업로드 ✅
**As a** 작성자, **I want to** 이미지를 드래그-드롭이나 붙여넣기로 삽입하고 싶다, **So that** URL을 수동 입력하지 않아도 된다.

- [x] Cloudflare R2 Workers 기반 업로드
- [x] 드래그-드롭, 클립보드 붙여넣기, 버튼 클릭
- [x] 업로드 중 플레이스홀더 → 완료 시 URL 교체
- [x] `onImageUpload` prop으로 커스텀 업로더 지원

---

## Part B. KMS 사용자 흐름 (📋 계획됨)

### UF-B1. 신규 사용자 온보딩

```mermaid
flowchart TD
    A([시작: 랜딩 페이지]) --> B{계정 있음?}
    B -- 없음 --> C[회원가입 페이지]
    B -- 있음 --> L[로그인 페이지]

    C --> C1[이메일·비밀번호·이름 입력]
    C1 --> C2{유효성 검사}
    C2 -- 실패 --> C1
    C2 -- 통과 --> C3[이메일 인증 발송]
    C3 --> C4[인증 대기 안내 화면]
    C4 --> C5{인증 링크 클릭?}
    C5 -- 24h 초과 --> C6[재발송 요청] --> C3
    C5 -- 클릭 --> C7[인증 완료]
    C7 --> C8[서버: Root 워크스페이스 자동 생성]
    C8 --> W1

    L --> L1[이메일·비밀번호 입력]
    L1 --> L2{인증}
    L2 -- 실패 5회 → 계정잠금 401 --> L3[15분 잠금 안내]
    L2 -- IP 초과 → 429 --> L4[잠시 후 재시도 안내]
    L2 -- 성공 --> W1
    L1 -- 비밀번호 분실 --> PW1

    PW1[비밀번호 찾기 페이지]
    PW1 --> PW2[이메일 입력]
    PW2 --> PW3[초기화 링크 발송 POST /auth/forgot-password]
    PW3 --> PW4[이메일 확인 안내]
    PW4 --> PW5{링크 클릭?}
    PW5 -- 만료 --> PW1
    PW5 -- 클릭 --> PW6[새 비밀번호 입력 POST /auth/reset-password]
    PW6 --> L

    W1[워크스페이스 선택 화면]
    W1 --> W2{워크스페이스 있음?}
    W2 -- Root만 --> D[Root 워크스페이스 문서 대시보드 바로 진입]
    W2 -- 여러 개 --> W3[워크스페이스 선택]
    W3 --> D
    W2 -- 신규 팀 생성 원함 --> W4[워크스페이스 생성 마법사]
    W4 --> W5[이름 입력]
    W5 --> D
```

---

### UF-B2. 문서 작성 전체 플로우 (v1.2.0 — 폴더 진입 경로 추가)

```mermaid
flowchart TD
    A([대시보드]) --> B1[헤더 + 새 문서 클릭]
    A --> B2[사이드바 ＋ 버튼]
    A --> B3[폴더 컨텍스트 메뉴 → 새 문서]
    B1 & B2 & B3 --> C[새 문서 모달]

    C --> CA[제목 입력]
    C --> CB{폴더 선택}
    CB -- 기존 폴더 선택 --> D
    CB -- 루트(미선택) --> D
    C --> CC{시작 방식}
    CC -- 빈 문서 --> D[빈 에디터 열림]
    CC -- 템플릿 --> CT[템플릿 선택] --> D

    D --> E[Markdown 작성]
    E --> F{저장}
    F -- Ctrl+S --> G[즉시 저장]
    F -- 자동저장 --> H[1초 디바운스]
    G & H --> I[버전 스냅샷 생성]
    I --> J[저장 상태: 저장됨]

    J --> Q[DAG 패널 → 문서 링크 설정]
    Q --> R[연관 문서 추가]
    Q --> S[Prev/Next 설정]
    R & S --> T([완료])
```

---

### UF-B3. 팀원 초대 및 협업

```mermaid
sequenceDiagram
    actor Owner
    actor NewMember
    participant App
    participant DB
    participant Email

    Owner->>App: 워크스페이스 설정 → 멤버 초대
    App->>Owner: 이메일 + 역할 입력 폼
    Owner->>App: email, role=editor 입력
    App->>DB: invitation 레코드 생성 (token, expires_at)
    App->>Email: 초대 링크 발송
    Email-->>NewMember: 초대 이메일 수신

    NewMember->>App: 초대 링크 클릭
    App->>DB: token 유효성 확인
    alt 토큰 유효
        App-->>NewMember: 가입/로그인 후 수락 화면
        NewMember->>App: 수락 클릭
        App->>DB: workspace_members INSERT
        App-->>NewMember: 워크스페이스 접속
    else 토큰 만료 (72h)
        App-->>NewMember: 초대 만료 안내
    end
```

---

### UF-B4. 문서 검색

```mermaid
flowchart LR
    A([Ctrl+/ 입력]) --> B[전역 검색 모달 열림]
    B --> C[검색어 입력]
    C --> D{300ms 디바운스}
    D --> E[API: /search?q=keyword]
    E --> F{결과 있음?}
    F -- 있음 --> G[문서 목록 표시<br>키워드 하이라이팅]
    F -- 없음 --> H[빈 상태 안내]
    G --> I{문서 선택}
    I -- 클릭 --> J[해당 문서 에디터 열림]
    I -- Esc --> K([모달 닫힘])
```

---

### UF-B5. CSS 테마 변경

```mermaid
flowchart TD
    A([워크스페이스 설정 → 테마]) --> B{권한 확인}
    B -- Viewer/Editor --> C[읽기 전용 CSS 미리보기]
    B -- Admin/Owner --> D[CSS 편집기 열림]

    D --> E{편집 방법}
    E -- 프리셋 선택 --> F[선택한 프리셋 CSS 로드]
    E -- 직접 편집 --> G[CSS 코드 수정]
    F --> G

    G --> H[실시간 미리보기 반영]
    H --> I[저장 버튼 클릭]
    I --> J{CSS 유효성 검사}
    J -- 유효 --> K[DB 저장 → 전체 반영]
    J -- 오류 --> M[오류 표시, 이전 CSS 유지]
```

---

### UF-B6. Import / Export

```mermaid
flowchart TD
    subgraph IMPORT [Import]
        I1([Import 버튼]) --> I2{파일 유형}
        I2 -- .md --> I3[파일 선택]
        I2 -- .zip --> I4[ZIP 선택]
        I3 & I4 --> I5[서버 업로드]
        I5 --> I6{중복?}
        I6 -- 있음 --> I7{덮어쓰기 / 새 문서}
        I6 -- 없음 --> I9[문서 생성]
        I7 --> I8[업데이트 or 생성]
        I8 & I9 --> I10[Import 완료]
    end

    subgraph EXPORT [Export]
        E1([Export 버튼]) --> E2{범위}
        E2 -- 현재 문서 --> E3[.md 다운로드]
        E2 -- 카테고리 --> E4[ZIP 생성]
        E2 -- 전체 --> E5[비동기 ZIP]
    end
```

---

### UF-B7. 버전 히스토리 복원

```mermaid
sequenceDiagram
    actor User
    participant Editor
    participant API
    participant DB

    User->>Editor: 버전 히스토리 패널 열기
    Editor->>API: GET /documents/:id/versions
    API-->>Editor: 버전 목록

    User->>Editor: 특정 버전 선택
    Editor->>API: GET /documents/:id/versions/:versionNum
    API-->>Editor: 해당 버전 content (읽기 전용 미리보기)

    User->>Editor: "이 버전으로 복원" 클릭
    Editor->>API: POST /documents/:id/restore-version
    API->>DB: 새 버전 생성
    API-->>Editor: 복원 완료
```

---

### UF-B8. 문서 링크 연결 (v1.2.0 — DAG 내비게이션)

```mermaid
flowchart TD
    A([문서 에디터 열림]) --> B[메타 패널 → 미니 DAG 자동 표시]
    B --> B2[프리뷰 하단 DAG 내비 자동 렌더링]

    B --> C{액션}
    C -- 미니 DAG 노드 클릭 --> D[해당 문서로 이동]
    C -- 전체 보기 버튼 --> E[그래프 뷰 페이지 이동]
    C -- 링크 편집 버튼 --> F[링크 관리 모달]

    F --> G{링크 유형}
    G -- 연관 문서 --> H[문서 검색 → 양방향 관계 저장]
    G -- Prev --> I[문서 검색 → 이전 설정]
    G -- Next --> J[문서 검색 → 순환 참조 검사]
    J --> K{순환?}
    K -- 있음 --> L[오류 표시]
    K -- 없음 --> M[다음 설정]

    H --> Z[DAG 즉시 리렌더링]
    I & M --> Z
    Z --> N([미니 DAG + 프리뷰 하단 DAG 업데이트])
```

---

### UF-B9. Embed 연동 플로우

```mermaid
flowchart TD
    subgraph ADMIN [Admin: Guest Token 발급]
        A1([워크스페이스 설정 → Embed]) --> A2[토큰 발급 폼]
        A2 --> A3[라벨·권한·문서 범위·만료일 설정]
        A3 --> A4[POST /embed-tokens]
        A4 --> A5[토큰 복사]
    end

    subgraph DEV [외부 개발자: 연동]
        B1{연동 방식 선택}
        B1 -- NPM 패키지 --> B2[npm install @markflow/editor]
        B2 --> B3[onSave prop에 자체 저장 로직 주입]

        B1 -- iframe --> B4[Guest Token을 src URL에 포함]
        B4 --> B5[postMessage로 content-changed 수신]

        B1 -- REST API --> B6[Authorization: Bearer token 헤더 추가]
        B6 --> B7[GET·PATCH /documents API 직접 호출]
    end

    A5 --> B1
```

---

### UF-B10. 폴더(카테고리) 관리 `P0` 🚧 (신규)

```mermaid
flowchart TD
    subgraph CREATE [폴더 생성]
        A1([사이드바 📁 버튼]) --> M1[새 폴더 모달]
        A2([컨텍스트 메뉴 → 하위 폴더]) --> M1
        M1 --> N1[폴더 이름 입력]
        N1 --> N2[경로 미리보기 실시간 갱신]
        N2 --> N3{상위 위치 선택}
        N3 -- 루트 --> N4[루트에 생성]
        N3 -- 기존 폴더 --> N5[하위에 생성]
        N4 & N5 --> N6[사이드바에 즉시 추가]
    end

    subgraph RENAME [이름 변경]
        B1([폴더 항목 우클릭 or ⋯]) --> CM[컨텍스트 메뉴]
        CM --> B2[이름 변경 선택]
        B2 --> B3[이름 변경 모달]
        B3 --> B4[새 이름 입력 → 확인]
        B4 --> B5[사이드바 DOM 즉시 업데이트]
    end

    subgraph DELETE [폴더 삭제]
        C1([컨텍스트 메뉴 → 폴더 삭제]) --> D1[삭제 확인 모달]
        D1 --> D2[폴더 이름 재입력 확인]
        D2 --> D3{일치?}
        D3 -- 불일치 --> D4[오류 토스트]
        D3 -- 일치 --> D5[폴더 제거 + 하위 문서 루트 이동]
    end

    subgraph NEWDOC [폴더 내 문서 생성]
        E1([컨텍스트 메뉴 → 새 문서 추가]) --> F1[새 문서 모달]
        F1 --> F2[해당 폴더 기본값으로 설정됨]
        F2 --> F3[제목 입력 → 만들고 편집 →]
        F3 --> F4[에디터 열림]
    end
```

---

### UF-B11. 그래프 뷰 탐색 `P1` 🚧 (신규)

```mermaid
flowchart TD
    A([사이드바 🔗 그래프 뷰]) --> B[GraphViewPage 열림]
    A2([메타 패널 미니 DAG → 전체 보기]) --> B

    B --> C[워크스페이스 전체 문서 DAG 표시]
    C --> D{Row 유형}
    D -- 문서 순서 흐름 --> E[Root → 카테고리 → 이전 → 현재+연관 → 다음]
    D -- 병렬 문서 그룹 --> F[같은 카테고리 내 동시 작업 문서 묶음]
    D -- 태그 클러스터 --> G[공유 태그 기반 문서 그룹]

    E & F & G --> H{노드 클릭}
    H --> I[해당 문서 에디터로 이동]

    C --> J[편집기로 → 버튼]
    J --> K[현재 열린 에디터로 복귀]
```
