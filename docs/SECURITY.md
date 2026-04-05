
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