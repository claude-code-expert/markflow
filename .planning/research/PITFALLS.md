# Domain Pitfalls

**Domain:** KMS/Wiki - Phase 2 MVP (Search, Diff, Embedding, Security, Graph)
**Researched:** 2026-04-11

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or major regressions.

---

### Pitfall 1: pg_trgm Does Not Support Korean Text

**What goes wrong:** `pg_trgm`은 ASCII 알파벳+숫자 문자만 trigram으로 분해한다. 한국어(CJK) 문자는 non-alphanumeric으로 취급되어 trigram이 생성되지 않는다. 결과적으로 `similarity()`, `%` 연산자, GiST/GIN trigram 인덱스 모두 한국어 콘텐츠에서 작동하지 않는다.

**Why it happens:** CONCERNS.md (#3)에서 `pg_trgm`을 풀텍스트 검색 해결책으로 제안했으나, MarkFlow의 타겟 사용자는 한국어 문서를 주로 작성한다. pg_trgm의 CJK 제한은 공식 PostgreSQL 문서에 명시되어 있지만 대부분의 영문 튜토리얼에서 언급하지 않는다.

**Consequences:**
- 한국어 제목/본문 검색이 전혀 동작하지 않음 (빈 결과)
- 영문 키워드만 검색 가능한 반쪽짜리 기능
- 베타 온보딩 10팀 목표에 직접적 타격

**Prevention:**
1. **pg_trgm 단독 사용 금지.** 한국어 검색에는 별도 전략 필요
2. **현실적 옵션 3가지:**
   - **(A) ILIKE 유지 + 개선:** 현재 `ILIKE` 검색을 유지하되, `documents.title`과 `documents.content`에 `gin_trgm_ops` 인덱스 대신 일반 B-tree 인덱스를 활용. 한국어 LIKE는 seq scan이지만 10K 문서 이하에서는 수용 가능
   - **(B) PostgreSQL tsvector + pg_cjk_parser:** CJK 2-gram 토크나이저를 설치하여 한국어 FTS 지원. 단, 외부 확장 설치 필요하므로 관리형 PostgreSQL(Supabase, Neon 등)에서 지원 여부 확인 필수
   - **(C) 하이브리드:** 영문은 pg_trgm의 fuzzy matching, 한국어는 ILIKE 또는 tsvector. 쿼리 시 입력 문자 감지하여 분기
3. **권장: (A)를 MVP로, (C)를 Phase 3 최적화로 예약.** MVP 단계에서 완벽한 검색보다는 "동작하는 검색"이 우선

**Detection:** 한국어 문서 3개 이상 생성 후 한글 키워드로 검색 테스트. 결과가 0건이면 이 함정에 빠진 것

**Phase:** Search 구현 시작 전 (가장 먼저 결정해야 할 사항)

**Confidence:** HIGH - pg_trgm의 CJK 제한은 PostgreSQL 공식 문서 및 PGroonga 비교 문서에서 명시

---

### Pitfall 2: Graph Service의 전체 Relation 풀 스캔

**What goes wrong:** 현재 `graph-service.ts`(line 56-74)는 `documentRelations` 테이블의 **모든 행**을 SELECT한 뒤 JavaScript에서 필터링한다. 문서 100개, 관계 500개일 때는 문제없지만, 워크스페이스가 성장하면 전체 플랫폼의 모든 관계를 메모리에 로드한다.

**Why it happens:** 초기 프로토타입에서 빠르게 구현. `WHERE` 절 없이 `SELECT * FROM document_relations`를 실행하고 `docIds.has()`로 필터링.

**Consequences:**
- 워크스페이스 10개 x 문서 1000개 = relation 테이블 수만 행 풀 로드
- 메모리 폭증 + 응답 시간 수 초
- DAG 컨텍스트 API와 그래프 API가 동시에 이 패턴을 사용하면 배가됨

**Prevention:**
```sql
-- AS-IS (graph-service.ts line 56)
SELECT source_id, target_id, type FROM document_relations;  -- 전체 스캔

-- TO-BE
SELECT source_id, target_id, type FROM document_relations
WHERE source_id = ANY($1) OR target_id = ANY($1);  -- $1 = docIds 배열
```
Drizzle ORM에서: `inArray(documentRelations.sourceId, docIdArray)` 또는 `or(inArray(...sourceId...), inArray(...targetId...))` 사용

**Detection:** `EXPLAIN ANALYZE`로 graph 엔드포인트 쿼리 확인. Seq Scan on document_relations + rows 수가 워크스페이스 문서 수보다 훨씬 크면 이 문제

**Phase:** Category Graph API / Document DAG Context 구현 시

**Confidence:** HIGH - 코드를 직접 확인하여 검증

---

### Pitfall 3: OG Link Preview의 SSRF (Server-Side Request Forgery) 취약점

**What goes wrong:** `GET /api/v1/public/og-preview?url=...` 엔드포인트가 사용자 제공 URL을 서버에서 fetch한다. 공격자가 `url=http://169.254.169.254/latest/meta-data/` (AWS 메타데이터), `url=http://localhost:5432/` (내부 DB), `url=http://10.0.0.1/admin` (내부 네트워크) 등을 전달하면 내부 인프라 정보가 노출된다.

**Why it happens:** OG 프리뷰는 본질적으로 "서버가 임의 URL을 fetch하는" 기능. SSRF는 2024년 기준 452% 급증한 공격 벡터(SonicWall 2025 Cyber Threat Report).

**Consequences:**
- 클라우드 메타데이터 API를 통한 IAM 자격증명 탈취
- 내부 서비스 포트 스캔
- 내부 관리 페이지 접근

**Prevention:**
1. **URL 스킴 제한:** `https://`만 허용 (http, ftp, file, data, gopher 차단)
2. **IP 주소 차단:** 프라이빗 IP 대역 차단 (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, ::1, fc00::/7)
3. **DNS 확인 후 IP 검증:** URL의 호스트를 DNS resolve한 뒤 반환된 IP가 프라이빗 대역인지 재확인 (DNS rebinding 방어)
4. **리다이렉트 제한:** 리다이렉트를 따르지 않거나, 따르더라도 각 단계에서 IP 검증 반복
5. **타임아웃:** 5초 이하로 설정 (느린 응답으로 리소스 소진 방지)
6. **응답 크기 제한:** OG 메타데이터 추출에 HTML head 부분만 필요하므로 응답 body 50KB로 제한

```typescript
// 최소 방어 코드 예시
const BLOCKED_RANGES = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^127\./, /^169\.254\./];
const url = new URL(input);
if (url.protocol !== 'https:') throw new Error('Only HTTPS allowed');
const resolved = await dns.resolve4(url.hostname);
if (resolved.some(ip => BLOCKED_RANGES.some(r => r.test(ip)))) throw new Error('Blocked');
```

**Detection:** `curl "https://app.markflow.io/api/v1/public/og-preview?url=http://169.254.169.254/"` 이 200을 반환하면 취약

**Phase:** OG Link Preview API 구현 시 (보안 검증은 첫 PR에 포함)

**Confidence:** HIGH - OWASP SSRF Prevention Cheat Sheet 및 다수 보안 문서에서 확인

---

### Pitfall 4: R2 Worker 보안 강화 시 기존 업로드 기능 파괴

**What goes wrong:** Worker에 인증 토큰을 추가할 때, 프론트엔드의 기존 업로드 로직을 동시에 업데이트하지 않으면 모든 이미지 업로드가 401로 실패한다. 또한 에디터 패키지(`@markflow/editor`)와 KMS 앱(`apps/web`)이 별도 업로드 경로를 사용하므로 둘 다 수정해야 한다.

**Why it happens:** Worker는 `apps/worker/`에 독립 배포. 프론트엔드는 `apps/web/`과 `packages/editor/`에 분산. 한쪽만 수정하면 다른 쪽이 깨진다.

**Consequences:**
- 에디터에서 이미지 드래그앤드롭 실패
- 프로필 아바타 업로드 실패
- 이미 업로드된 이미지 URL은 영향 없지만 신규 업로드 전부 차단

**Prevention:**
1. **배포 순서 지정:** 프론트엔드 먼저 배포 (Authorization 헤더 추가), Worker는 나중에 배포 (인증 검증 추가). Worker의 `API_SECRET`이 없으면 인증 스킵하는 점진적 도입
2. **환경변수 체크리스트:** `NEXT_PUBLIC_WORKER_SECRET`(프론트), `API_SECRET`(Worker) 동시 설정 확인
3. **통합 테스트:** Worker 보안 강화 PR에 프론트엔드 업로드 E2E 테스트 포함
4. **CORS 변경도 동시에:** `ALLOWED_ORIGINS`를 `*`에서 특정 도메인으로 변경 시, 개발 환경(`localhost:3000`)도 반드시 포함

**Detection:** Worker 배포 후 이미지 업로드 시도. 브라우저 Network 탭에서 `/upload` 요청이 401 또는 CORS 에러 반환

**Phase:** Worker 보안 강화 시 (CORS + Auth를 한 묶음으로)

**Confidence:** HIGH - 코드 구조 직접 확인

---

### Pitfall 5: Embed 토큰 검증에서 Timing Attack

**What goes wrong:** `embed-token-service.ts`에서 토큰은 `hashPassword()`(bcrypt)로 해시 저장된다. 퍼블릭 embed 페이지에서 토큰을 검증할 때, DB의 모든 토큰을 가져와 `comparePassword()`로 하나씩 비교해야 한다. bcrypt 비교는 느려서(~100ms) 토큰 N개면 최대 N * 100ms 소요.

**Why it happens:** embed 토큰은 `tokenHash`만 저장하고 원문의 prefix/lookup key가 없다. 기존 `hashPassword` 유틸을 재사용했으나, embed 토큰은 세션 비밀번호와 용도가 다르다.

**Consequences:**
- 워크스페이스에 토큰 10개면 최악 1초 응답 (퍼블릭 페이지)
- 토큰 수 증가 시 선형 성능 저하
- DoS: 유효하지 않은 토큰으로 반복 요청 시 서버 CPU 소진

**Prevention:**
1. **토큰 구조 변경:** `mf_gt_<lookup>_<secret>` 형태로 분리. lookup은 평문 저장(DB 조회용), secret만 해시
2. **또는 SHA-256 사용:** embed 토큰은 비밀번호가 아니므로 bcrypt 대신 `SHA-256(token)`으로 해시. 조회 시 `SHA-256(input) === tokenHash` 단일 비교
3. **권장: SHA-256 + 인덱스.** `tokenHash` 컬럼에 unique index가 이미 있으므로, SHA-256으로 전환하면 O(1) lookup 가능

**Detection:** `ab -n 100 -c 10 https://app.markflow.io/api/v1/public/embed/invalid_token/document` 로 부하 테스트. 응답 시간이 토큰 수에 비례하면 이 문제

**Phase:** Public Embed Page 구현 시 (토큰 검증 로직 설계 단계)

**Confidence:** MEDIUM - embed-token-service.ts 코드 확인. hashPassword가 bcrypt인지 직접 확인 필요하지만, 함수명과 import 패턴으로 추정

---

## Moderate Pitfalls

---

### Pitfall 6: Version Diff API에서 대용량 문서 메모리 폭발

**What goes wrong:** `diff` 라이브러리의 `diffLines()`는 Myers 알고리즘 기반으로, 두 문서의 차이가 클수록 O(ND) 복잡도에서 N(문서 길이)과 D(편집 거리)가 모두 크면 메모리와 CPU를 대량 소비한다. 현재 클라이언트에서 실행 중(`version-history-modal.tsx` line 68-71)인데, 서버로 이동하면 동시 요청 시 서버가 다운될 수 있다.

**What goes wrong additionally:** `documentVersions` 테이블에 `content` 전체가 저장되므로, diff 요청 시 두 버전의 전체 content를 메모리에 로드해야 한다.

**Prevention:**
1. **문서 크기 제한:** diff API에 입력 크기 제한 (예: 500KB per version). 초과 시 "문서가 너무 커서 diff를 생성할 수 없습니다" 응답
2. **타임아웃:** diff 계산에 `setTimeout` 또는 Worker Thread 사용, 5초 초과 시 중단
3. **캐싱:** 동일 버전 쌍의 diff 결과를 캐시 (버전은 immutable이므로 캐시 무효화 불필요)
4. **스트리밍 대안:** Google의 `diff-match-patch` 라이브러리는 prefix/suffix 제거 최적화가 내장되어 `jsdiff`보다 대용량에 강함

**Detection:** 10,000줄 문서의 v1과 완전히 다른 v2 diff 요청. 응답 시간 5초 초과 또는 서버 메모리 급증

**Phase:** Version Diff API 구현 시

**Confidence:** MEDIUM - diff 알고리즘 특성은 well-known이나, 실제 임계점은 문서 크기 분포에 따라 다름

---

### Pitfall 7: Closure Table 동기화 누락으로 ancestors/descendants 불일치

**What goes wrong:** `categoryClosure` 테이블은 카테고리 생성/이동/삭제 시 수동으로 동기화해야 한다. `category-service.ts`의 `create`, `update(parentId 변경)`, `delete` 에서 closure 테이블을 정확히 갱신하지 않으면, ancestors/descendants API가 잘못된 결과를 반환한다.

**Why it happens:** Closure table은 강력하지만 쓰기 로직이 복잡하다. 특히 카테고리 이동(부모 변경) 시:
1. 기존 ancestor 경로 삭제
2. 새 ancestor 경로 삽입
3. 모든 descendant의 경로도 갱신

이 3단계 중 하나라도 빠지면 트리가 깨진다.

**Consequences:**
- "이 카테고리의 모든 하위 문서" 조회 시 일부 누락
- 권한 체크가 계층 기반이면 보안 구멍
- 카테고리 드래그앤드롭 이동 후 그래프 뷰 불일치

**Prevention:**
1. **기존 category-service.ts 코드 감사:** closure 테이블 갱신 로직이 create/update/delete 모두에 있는지 확인
2. **트랜잭션 필수:** closure 갱신은 카테고리 변경과 동일 트랜잭션 내에서 수행
3. **정합성 검증 쿼리:** 주기적으로 실행할 수 있는 "closure table 정합성 체크" SQL 작성
```sql
-- 자기 자신에 대한 depth=0 항목이 모든 카테고리에 존재하는지
SELECT c.id FROM categories c
LEFT JOIN category_closure cc ON cc.ancestor_id = c.id AND cc.descendant_id = c.id AND cc.depth = 0
WHERE cc.ancestor_id IS NULL;
```
4. **통합 테스트:** 카테고리 이동 -> ancestors 조회 -> descendants 조회 시나리오 테스트

**Detection:** 카테고리 A > B > C 구조에서 `GET /categories/C/ancestors`가 [B, A] 대신 빈 배열 반환

**Phase:** Category Graph API 구현 시

**Confidence:** MEDIUM - closure 테이블 스키마는 확인했으나, category-service.ts의 갱신 로직은 일부만 확인

---

### Pitfall 8: Public Embed Page에서 XSS via Markdown 렌더링

**What goes wrong:** 퍼블릭 embed 페이지에서 문서를 렌더링할 때, 인증 없이 접근 가능한 페이지에 마크다운 HTML이 노출된다. `@markflow/editor`의 `parseMarkdown()`은 `rehype-sanitize`를 포함하지만, embed 페이지가 별도 렌더링 파이프라인을 구성하면 sanitize를 누락할 수 있다.

**Why it happens:** Embed 페이지는 `apps/web/app/(public)/embed/[token]/page.tsx`에 새로 만들어야 하며, 기존 에디터의 preview 컴포넌트와 다른 경로. 개발자가 "빠르게" 구현하면서 기존 파이프라인 대신 직접 `remark-parse + remark-rehype + rehype-stringify`만 사용할 유혹.

**Consequences:**
- `<script>` 태그가 포함된 문서를 embed하면 방문자 브라우저에서 JS 실행
- 퍼블릭 페이지이므로 공격 표면이 넓음 (URL만 알면 접근 가능)
- 기업 보안 감사에서 즉시 실패

**Prevention:**
1. **기존 `parseMarkdown()` 유틸 재사용 강제:** embed 페이지에서도 `@markflow/editor`의 파이프라인 사용
2. **CLAUDE.md 규칙 준수:** "sanitize를 거치지 않은 원본 HTML을 직접 주입하지 않는다"
3. **CSP 헤더:** embed 페이지에 `Content-Security-Policy: script-src 'none'` 설정
4. **iframe sandbox:** embed용 iframe에는 `sandbox="allow-same-origin"` (allow-scripts 제외)
5. **테스트:** XSS 페이로드가 포함된 문서를 embed로 렌더링하는 테스트 케이스 추가

**Detection:** `<img onerror="alert(1)" src=x>` 가 포함된 문서를 embed 페이지에서 열 때 alert이 실행되면 취약

**Phase:** Public Embed Page 구현 시

**Confidence:** HIGH - CLAUDE.md에 sanitize 규칙이 명시되어 있고, embed 페이지는 새로 만들어야 하는 코드

---

### Pitfall 9: relation-service.ts의 N+1 쿼리 (getRelations)

**What goes wrong:** `relation-service.ts`의 `getRelations()` (line 266-307)는 관계 행을 먼저 조회한 뒤, 각 관계마다 `documents` 테이블을 개별 SELECT한다. 관계 10개면 11번의 DB 쿼리.

**Why it happens:** 코드가 `for (const row of rows)` 루프 안에서 `await db.select()` 실행.

**Consequences:**
- Document Context API (`/documents/:id/context`)는 forward + backward 관계를 모두 가져오므로 N+1이 2배
- 문서 열람 시마다 실행되면 DB connection pool 소진 위험

**Prevention:**
```typescript
// AS-IS: N+1
for (const row of rows) {
  const [target] = await db.select(...).where(eq(documents.id, row.targetId));
}

// TO-BE: JOIN
const relations = await db
  .select({
    type: documentRelations.type,
    targetId: documentRelations.targetId,
    targetTitle: documents.title,
  })
  .from(documentRelations)
  .innerJoin(documents, and(
    eq(documentRelations.targetId, documents.id),
    eq(documents.isDeleted, false),
  ))
  .where(eq(documentRelations.sourceId, Number(docId)));
```

**Detection:** DB 쿼리 로깅 활성화 후 문서 상세 페이지 로드. SELECT 횟수가 관계 수 + 1이면 이 문제

**Phase:** Document DAG Context API 구현 시 (기존 코드 리팩터링 포함)

**Confidence:** HIGH - relation-service.ts 코드를 직접 확인

---

### Pitfall 10: ILIKE 검색의 SQL Injection via 특수문자

**What goes wrong:** 현재 `document-service.ts`(line 135-142)에서 `ilike(documents.title, '%' + q + '%')` 형태로 검색어를 직접 LIKE 패턴에 삽입한다. `%`, `_` 등 LIKE 와일드카드 특수문자가 이스케이프되지 않는다.

**Why it happens:** Drizzle ORM의 `ilike()`는 SQL injection은 방지하지만, LIKE 패턴 와일드카드 이스케이프는 개발자 책임이다. `q = "100%"`를 검색하면 `ILIKE '%100%%'`가 되어 의도치 않은 결과.

**Consequences:**
- `%` 포함 검색어로 전체 문서 반환 (정보 유출은 아니지만 UX 문제)
- `_` 포함 검색어로 예상치 못한 매칭
- 심각하지는 않지만, 검색 정확도를 해침

**Prevention:**
```typescript
function escapeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}
// 사용: ilike(documents.title, `%${escapeLikePattern(q)}%`)
```

**Detection:** `%` 문자가 포함된 검색어 테스트. 모든 문서가 반환되면 이 문제

**Phase:** Search 구현/개선 시

**Confidence:** HIGH - document-service.ts 코드를 직접 확인

---

## Minor Pitfalls

---

### Pitfall 11: document-service.ts 430줄 - 단일 파일 복잡도 한계

**What goes wrong:** 기존 document-service.ts에 diff 로직, 검색 랭킹 로직, excerpt 추출 로직을 추가하면 600줄 이상으로 성장하여 테스트 어려움과 merge conflict 빈도 증가.

**Prevention:**
- diff 로직은 `diff-service.ts`로 분리 (CONCERNS.md #15에서 이미 제안)
- 검색 전용 쿼리는 `search-service.ts`로 분리 고려
- excerpt 추출 함수는 `utils/text.ts`로 이동 가능

**Phase:** 코드 리팩터링 시점 (각 기능 구현 완료 후)

**Confidence:** HIGH - 파일 크기 직접 확인

---

### Pitfall 12: Embed Token 만료 체크 누락

**What goes wrong:** `embed-token-service.ts`의 `list()`에서 `isActive` 계산이 클라이언트 표시용이지만, 실제 토큰 검증 시 `expiresAt` 체크를 구현하지 않으면 만료된 토큰으로 영구 접근 가능.

**Prevention:** 퍼블릭 검증 엔드포인트에서 반드시 `WHERE expires_at > NOW() AND revoked_at IS NULL` 조건 포함

**Phase:** Public Embed Page 구현 시

**Confidence:** HIGH - embed-token-service.ts 코드 확인

---

### Pitfall 13: OG Preview 캐시 없이 외부 HTTP 요청 폭증

**What goes wrong:** 같은 URL의 OG 메타데이터를 매번 새로 fetch하면, 인기 링크가 포함된 문서를 10명이 열 때 10번의 외부 HTTP 요청 발생. 외부 서버가 rate limit을 걸면 MarkFlow 서버 IP가 차단될 수 있다.

**Prevention:**
1. URL 기반 캐시 (Redis 또는 DB 테이블, TTL 24h)
2. 동일 URL의 동시 요청 병합 (request deduplication)
3. 캐시 miss 시에만 fetch, 실패 시 빈 메타데이터 반환 (graceful degradation)

**Phase:** OG Link Preview API 구현 시

**Confidence:** MEDIUM - 표준 패턴이지만 구현 누락 빈도 높음

---

### Pitfall 14: SVG 업로드 후 렌더링 경로에서 XSS

**What goes wrong:** Worker가 `image/svg+xml`을 허용하는데, 업로드된 SVG에 `<script>`, `onload`, `<foreignObject>` 등이 포함될 수 있다. R2에서 직접 서빙 시 SVG가 브라우저에서 HTML로 해석되어 스크립트 실행.

**Prevention:**
1. SVG는 반드시 `<img src="...">` 태그로만 렌더링 (HTML로 직접 삽입 금지)
2. R2에서 SVG 서빙 시 `Content-Disposition: attachment` 또는 `Content-Type: image/svg+xml` 확인
3. 추가 방어: 업로드 시 SVG를 DOMPurify/svgo로 sanitize하는 Worker 미들웨어

**Phase:** Worker 보안 강화 시

**Confidence:** HIGH - Worker 코드에서 SVG 허용 확인, SECURITY.md에 주의사항 명시됨

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Full-text Search | pg_trgm이 한국어 미지원 (#1) | Critical | ILIKE 유지 또는 하이브리드 접근 |
| Full-text Search | LIKE 와일드카드 미이스케이프 (#10) | Moderate | `escapeLikePattern()` 유틸 추가 |
| Version Diff API | 대용량 문서 메모리 폭발 (#6) | Moderate | 크기 제한 + 타임아웃 + 캐시 |
| Category Graph API | Closure table 동기화 불일치 (#7) | Moderate | 기존 코드 감사 + 정합성 테스트 |
| Category Graph API | 전체 relation 풀 스캔 (#2) | Critical | WHERE 절로 scope 제한 |
| Document DAG Context | N+1 쿼리 (#9) | Moderate | JOIN으로 리팩터링 |
| Public Embed Page | XSS via markdown (#8) | Moderate | parseMarkdown() 재사용 + CSP |
| Public Embed Page | 토큰 검증 성능 (#5) | Moderate | SHA-256 전환 또는 lookup key 분리 |
| Public Embed Page | 만료 토큰 체크 누락 (#12) | Minor | WHERE expires_at > NOW() |
| OG Link Preview | SSRF (#3) | Critical | IP 검증 + 스킴 제한 |
| OG Link Preview | 캐시 없이 외부 요청 폭증 (#13) | Minor | URL 기반 캐시 + TTL |
| Worker Security | 기존 업로드 기능 파괴 (#4) | Critical | 점진적 배포 + E2E 테스트 |
| Worker Security | SVG XSS (#14) | Minor | img 태그로만 렌더링 |
| 전체 | 서비스 파일 비대화 (#11) | Minor | 기능별 서비스 분리 |

---

## Sources

- [PostgreSQL pg_trgm 공식 문서](https://runebook.dev/en/docs/postgresql/pgtrgm) - CJK 제한 사항
- [PGroonga vs textsearch vs pg_trgm](https://pgroonga.github.io/reference/pgroonga-versus-textsearch-and-pg-trgm.html) - 다국어 검색 비교
- [pg_cjk_parser](https://github.com/huangjimmy/pg_cjk_parser) - CJK 2-gram 파서
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [SonicWall 2025 SSRF 급증 보고](https://medium.com/@zoningxtr/ssrf-vulnerability-explained-server-side-request-forgery-attack-types-real-world-examples-c55a3bf8540c)
- [Cloudflare R2 CORS 설정](https://developers.cloudflare.com/r2/buckets/cors/)
- [R2 Worker 기반 접근제어](https://blog.dankying.com/en/posts/20250429-how-to-build-an-image-service-using-cloudflare-workers/)
- [iframe 보안 가이드 2026](https://qrvey.com/blog/iframe-security/)
- [jsdiff 라이브러리](https://github.com/kpdecker/jsdiff) - diff 알고리즘
- [Google diff-match-patch](https://github.com/google/diff-match-patch) - 대안 diff 라이브러리
- [SQL Server Closure Tables 가이드](https://www.red-gate.com/simple-talk/databases/sql-server/t-sql-programming-sql-server/sql-server-closure-tables/)
- [Drizzle ORM 마이그레이션 문서](https://orm.drizzle.team/docs/migrations)
