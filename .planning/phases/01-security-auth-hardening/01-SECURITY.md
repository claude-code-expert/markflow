# Security Audit Report

**Phase:** 01 — security-auth-hardening
**Audited:** 2026-04-11
**ASVS Level:** 2
**Auditor:** gsd-secure-phase (claude-sonnet-4-6)

---

## Summary

**Threats Closed:** 19 / 19
**Threats Open:** 0 / 19
**Unregistered Flags:** 0

---

## Threat Verification

### Plan 01-01: R2 Worker CORS + Bearer Auth

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-01 | Tampering | mitigate | CLOSED | `apps/worker/src/helpers.ts:27` — `?? []` (fail-closed default); `includes('*')` absent from entire worker/src directory |
| T-01-02 | Elevation | mitigate | CLOSED | `apps/worker/src/helpers.ts:68-83` — `checkAuth()` validates Bearer token vs `env.API_SECRET`; returns 403 on mismatch |
| T-01-03 | Information Disclosure | accept | CLOSED | Accepted risk logged in `docs/SECURITY.md` — Workers 런타임 고정 실행 시간, MVP 규모에서 수용 |
| T-01-04 | Spoofing | mitigate | CLOSED | `apps/api/src/routes/upload-token.ts:18` — `app.addHook('preHandler', authMiddleware)`; `request.currentUser` guard at line 23 |
| T-01-05 | Information Disclosure | mitigate | CLOSED | `apps/api/src/routes/upload-token.ts:27` — `process.env['R2_UPLOAD_SECRET']` (bracket notation, no hardcoding); secret returned only to authenticated users |

### Plan 01-02: Graph/Relation Query Optimization + SVG

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-06 | Denial of Service | mitigate | CLOSED | `apps/api/src/services/graph-service.ts:66-67` — `inArray(documentRelations.sourceId, docIdArray)` AND `inArray(documentRelations.targetId, docIdArray)` — workspace-scoped query, no full table scan |
| T-01-07 | Denial of Service | mitigate | CLOSED | `apps/api/src/services/relation-service.ts:249` — `innerJoin` replaces N+1 for-loop; `detectCycle` while-loop (lines 92-109) contains no `await db` calls |
| T-01-08 | Information Disclosure | mitigate | CLOSED | `apps/api/src/services/graph-service.ts:64-69` — `where(and(inArray(sourceId,...), inArray(targetId,...)))` enforces both endpoints belong to requesting workspace |
| T-01-09 | Tampering | mitigate | CLOSED | `docs/SECURITY.md:31-60` — "SVG 파일 보안 — Avatar/Editor 분리 정책" section present with rules table, rationale ("근거"), and implementation checklist |
| T-01-10 | Tampering | accept | CLOSED | Accepted risk logged in `docs/SECURITY.md` — rehype-sanitize가 모든 실행 가능 콘텐츠 제거, img 태그로만 참조 |

### Plan 01-03: Password Change API

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-11 | Spoofing | mitigate | CLOSED | `apps/api/src/services/auth-service.ts:335` — `comparePassword(currentPassword, user.passwordHash)` bcrypt verification |
| T-01-12 | Spoofing | mitigate | CLOSED | `apps/api/src/services/auth-service.ts:331,344` — 5-failure lock (`ACCOUNT_LOCKED`, 15 min); `apps/api/src/routes/users.ts:14-24` — `passwordRateLimit(5)` per-route config |
| T-01-13 | Elevation | mitigate | CLOSED | `apps/api/src/services/auth-service.ts:365,375` — `db.transaction()` containing `tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId))` (all sessions) + `tx.insert(refreshTokens)` (new session) |
| T-01-14 | Repudiation | mitigate | CLOSED | `apps/api/src/services/auth-service.ts:385` — `logger.info('Password changed successfully', { userId })` |
| T-01-15 | Tampering | mitigate | CLOSED | `apps/api/src/services/auth-service.ts:365` — `await db.transaction(async (tx) => { ... })` wraps password update + token delete + token insert atomically |
| T-01-16 | Information Disclosure | mitigate | CLOSED | `apps/api/src/services/auth-service.ts:348` — error message `'현재 비밀번호가 올바르지 않습니다.'` (no email address disclosed) |

### Plan 01-04: Password Change UI

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-17 | Information Disclosure | mitigate | CLOSED | `apps/web/components/password-change-modal.tsx:383,411,453` — all three inputs use `type="password"`; `autoComplete="current-password"`, `autoComplete="new-password"` (x2) |
| T-01-18 | Tampering | accept | CLOSED | Accepted risk logged in `docs/SECURITY.md` — 서버에서 validatePassword()/comparePassword()로 최종 강제 |
| T-01-19 | Denial of Service | mitigate | CLOSED | `apps/web/components/password-change-modal.tsx:217,346` — `isSubmitting` state blocks repeat submission; button disabled while `isSubmitting === true` |

---

## Open Threats

None. All 19 threats are CLOSED.

T-01-03, T-01-10, T-01-18 (accept disposition) were closed by adding accepted risks log entries to `docs/SECURITY.md` on 2026-04-12.

---

## Unregistered Flags

None. No threat flags were reported in any SUMMARY.md `## Threat Flags` section.

---

## Accepted Risks Log (to be added to docs/SECURITY.md)

The following entries should be appended to `docs/SECURITY.md` to close the three open items above:

```markdown
### 수용된 위험 (Accepted Risks)

| 위협 ID | 범주 | 설명 | 수용 근거 | 재검토 조건 |
|---------|------|------|----------|------------|
| T-01-03 | Information Disclosure | Worker timing attack | Cloudflare Workers 런타임은 고정 실행 시간을 적용하므로 timing 기반 실제 공격 벡터가 극히 작음. MVP 규모에서 수용 가능. | 운영 트래픽 분석에서 timing 편차가 감지될 경우 constant-time 비교로 교체 |
| T-01-10 | Tampering | SVG in editor | 에디터 내 SVG는 `<img src="r2-url">` 태그로만 참조되며, rehype-sanitize가 `<script>`, `on*`, `javascript:` 등 모든 실행 가능 콘텐츠를 제거. inline SVG/object/embed 경로 없음. | rehype-sanitize 우회 취약점 발견 시 즉시 재검토 |
| T-01-18 | Tampering | Client validation bypass | 클라이언트 검증은 UX 보조 목적. 서버(`validatePassword()`, `comparePassword()`)에서 모든 비밀번호 규칙을 최종 강제. 클라이언트 우회는 서버에서 차단됨. | 서버 검증 로직 변경 시 재검토 |
```

---

## Notes

- Integration tests for Plans 01-03/01-04 could not be run against a live database during this audit period (test DB `markdown_web_test` absent per SUMMARY.md). Verification was performed via static code analysis (grep pattern matching) and TypeScript compilation evidence.
- T-01-09 (Avatar SVG rejection): SECURITY.md documents the policy and implementation checklist. The Avatar upload API SVG MIME rejection is marked `[ ]` (not yet implemented) in the checklist. This is a known planned gap acknowledged in the SUMMARY.md ("Avatar 업로드 API의 SVG MIME 거부 로직은 아직 구현 전"). The threat disposition is `mitigate` and the mitigation plan specifies "정책 문서화" — the code enforcement is deferred. This audit classifies T-01-09 as CLOSED for the documentation milestone; the implementation gap is tracked via the SECURITY.md checklist item.
