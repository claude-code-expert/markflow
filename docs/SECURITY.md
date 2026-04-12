
## 보안

### XSS 방어 (현재 구현됨)

**에디터 패키지 (`@markflow/editor`):**
- `rehype-sanitize`가 모든 마크다운 → HTML 변환에 적용됨
- `allowDangerousHtml: false` — remark-rehype에서 원본 HTML 태그 차단
- sanitize 스키마 커스텀: KaTeX 수학 태그 + 코드 하이라이팅 className만 허용
- `<script>`, `on*` 이벤트 속성, `javascript:` URL 스킴 모두 제거됨

**sanitize 스키마 변경 시 주의사항:**
```typescript
// ✅ 허용 — 기능에 필요한 최소 태그/속성만 추가
tagNames: ['math', 'semantics', 'mrow', ...]  // KaTeX 전용
attributes: { code: ['className'] }            // 구문 강조 전용

// ❌ 금지 — 절대 추가하지 말 것
tagNames: ['script', 'iframe', 'object', 'embed', 'form']
attributes: { '*': ['onclick', 'onerror', 'onload', 'style'] }
// style 속성은 span/div에만 KaTeX용으로 제한 허용 중
```

### 이미지 업로드 보안

- 클라이언트 검증: 허용 MIME 타입 (`png, jpeg, gif, webp, svg+xml`), 최대 10MB
- 서버(Worker) 검증: Content-Type 재확인 필수
- SVG 업로드: `image/svg+xml` 허용하되, SVG 내부 `<script>` 태그 주의
- 업로드 URL은 Cloudflare R2 도메인만 허용 (Worker에서 강제)

### SVG 파일 보안 — Avatar/Editor 분리 정책

#### 규칙

| 컨텍스트 | SVG 허용 | 렌더링 방식 | 위험도 |
|----------|----------|------------|--------|
| **Avatar (프로필 이미지)** | 거부 | `<img src="...">` 태그 | 높음 — `<img>` 태그로 SVG를 렌더링하면 내장 스크립트가 실행될 수 있음 |
| **Editor (문서 본문 이미지)** | 허용 | `<img src="...">` + rehype-sanitize | 낮음 — 에디터 출력은 반드시 rehype-sanitize를 통과한 HTML에서만 렌더링 |

#### 근거

**Avatar에서 SVG를 거부하는 이유:**
- Avatar는 `<img>` 태그로 렌더링되며, 브라우저에 따라 SVG 내 `<script>` 태그, `onload` 이벤트 핸들러, `<foreignObject>` 등이 실행될 수 있음
- Avatar URL은 프로필 카드, 댓글, 멤버 목록 등 다양한 곳에서 렌더링되므로 XSS 공격 표면이 넓음
- Avatar 업로드 시 서버 측에서 SVG MIME 타입(`image/svg+xml`)을 거부하여 원천 차단

**Editor에서 SVG를 허용하는 이유:**
- 문서 본문의 이미지는 마크다운 `![alt](url)` 문법으로 삽입되며, `<img>` 태그로 렌더링됨
- 에디터의 HTML 출력은 반드시 `parseMarkdown()` -> `rehype-sanitize`를 거침
- rehype-sanitize가 `<script>`, `on*` 이벤트 속성, `javascript:` URL 스킴을 모두 제거
- SVG 파일 자체는 R2에 저장되고, `<img src="r2-url">` 태그로만 참조되므로 내부 스크립트가 실행되지 않음
- 기술 문서에서 SVG 다이어그램(flowchart, 아키텍처도 등)은 필수 요소

#### 구현 체크리스트

- [ ] Avatar 업로드 API: `image/svg+xml` MIME 타입 거부 (400 에러)
- [x] R2 Worker: `image/svg+xml` 허용 (문서 이미지용)
- [x] Editor Preview: `rehype-sanitize` 적용 (`parseMarkdown()`)
- [x] `dangerouslySetInnerHTML`: sanitize 통과한 HTML에만 사용
- [ ] SVG를 `<img>` 태그 외의 방식(inline SVG, `<object>`, `<embed>`)으로 렌더링하지 않음

### 수용된 위험 (Accepted Risks)

| 위협 ID | 범주 | 수용 근거 | 재검토 조건 |
|---------|------|----------|------------|
| T-01-03 | Information Disclosure | Cloudflare Workers 런타임 고정 실행 시간으로 timing 공격 벡터 극히 작음. MVP 규모에서 수용. | 운영 트래픽에서 timing 편차 감지 시 constant-time 비교로 교체 |
| T-01-10 | Tampering | SVG는 `<img src="r2-url">` 태그로만 참조; rehype-sanitize가 script/on*/javascript: 모두 제거. inline SVG 경로 없음. | rehype-sanitize 우회 취약점 발견 시 즉시 재검토 |
| T-01-18 | Tampering | 클라이언트 검증은 UX 보조. 서버에서 validatePassword()/comparePassword()로 최종 강제. | 서버 검증 로직 변경 시 재검토 |

### KMS Phase 1+ 보안 (계획됨)

**인증:**
- JWT Access Token (15분) + Refresh Token (7일, HttpOnly Cookie)
- 비밀번호: bcrypt 해시, 8자 이상 + 영문/숫자/특수문자
- 계정 잠금: 동일 계정 5회 연속 실패 → 15분 잠금 (401 ACCOUNT_LOCKED)
- Rate Limit: IP 기준 10회/15분 초과 → 429 RATE_LIMITED (계정 잠금과 별도)

**권한:**
- 모든 API에 Role 기반 미들웨어 (Owner > Admin > Editor > Viewer)
- 모든 쿼리에 `workspace_id` 범위 강제 (데이터 격리)

**CSRF:**
- SameSite=Strict 쿠키 + Origin 헤더 검증

**환경 변수:**
- 시크릿(DB URL, JWT 시크릿, API 키)은 환경 변수로만 관리
- `.env` 파일은 `.gitignore`에 포함, 커밋 금지
- 코드에 시크릿 하드코딩 절대 금지

**의존성:**
- `pnpm audit` 정기 실행
- 알려진 취약점이 있는 패키지 즉시 업데이트