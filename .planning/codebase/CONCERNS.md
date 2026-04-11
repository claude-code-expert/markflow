# Codebase Concerns

**Analysis Date:** 2026-04-11

## P1 Critical — Currently Causing Errors

### 1. Missing POST /auth/resend-verification Endpoint

**Issue:** Frontend calls `POST /auth/resend-verification` but API endpoint does not exist → 404 error

**Files:**
- Frontend: `apps/web/app/(auth)/verify-email/page.tsx` (line 232)
  - Calls `apiFetch<VerifyEmailResponse>('/auth/resend-verification', { method: 'POST' })`
  - User can click "인증 메일 재발송" button but request fails
- API: `apps/api/src/routes/auth.ts`
  - Has: `/register`, `/login`, `/logout`, `/verify-email`, `/forgot-password`, `/reset-password`, `/refresh`
  - Missing: `/resend-verification`

**Symptoms:**
- Verification page shows UI for resending email but network request returns 404
- User cannot resend verification email if initial email bounces/misses

**Fix Approach:**
- Add endpoint in `apps/api/src/routes/auth.ts`:
  ```
  POST /api/v1/auth/resend-verification
  - Requires: email (from request body) OR authenticated user
  - Logic: Find user by email, generate new verification token, log verification link
  - Response: { message: 'Verification email sent' }
  ```
- Implement `sendVerificationEmail()` placeholder in auth service alongside existing `forgotPassword()` pattern
- Email integration deferred (use `logger.info()` like `forgotPassword`)

---

### 2. Missing PATCH /users/me/password Endpoint

**Issue:** No password change API for logged-in users

**Files:**
- Backend: `apps/api/src/routes/users.ts` (lines 48-100)
  - Has: `GET /me`, `PATCH /me` (name/avatar only)
  - Missing: Password change while authenticated
- Schema: `packages/db/src/schema/users.ts`
  - Has: `passwordHash` field, no separate "oldPassword" verification flow documented

**Symptoms:**
- Users cannot change password from settings (common security requirement)
- No logged-in password change flow (separate from forgot-password reset)

**Fix Approach:**
- Add endpoint in `apps/api/src/routes/users.ts`:
  ```
  PATCH /api/v1/users/me/password
  - Requires: auth middleware, oldPassword + newPassword in body
  - Logic: Verify oldPassword matches current hash, validate new password, update passwordHash
  - Response: { message: 'Password changed' }
  ```
- Reuse `comparePassword()` and `hashPassword()` utilities from auth-service
- Password validation: use existing `validatePassword()` from `utils/password.ts`

---

## P2 Features — Partially Implemented

### 3. Workspace Full-Text Search — Only Basic ILIKE Exists

**Issue:** Search uses simple `ILIKE` pattern matching; needs PostgreSQL `pg_trgm` extension for production-quality full-text search

**Files:**
- `apps/api/src/services/document-service.ts` (lines 135-143)
  - Uses `or(ilike(documents.title, ...), ilike(documents.content, ...))`
  - No fuzzy matching, ranking, or trigram similarity
  - Excerpt extraction is client-side (lines 34-46)

**Symptoms:**
- Searching for "markdwon" (typo) returns no results
- Large content matching is slow (full column scan)
- No relevance ranking (title matches = content matches)

**Scaling Limit:** 10K+ documents per workspace will have noticeable search lag

**Migration Path:**
1. Add Drizzle migration: `CREATE EXTENSION pg_trgm`
2. Create GiST index: `CREATE INDEX idx_doc_search ON documents USING GIST(title gist_trgm_ops, content gist_trgm_ops)`
3. Modify `document-service.ts` to use `similarity()` function and `<% ?` operator
4. Update `list()` query to sort by relevance score

---

### 4. Version Diff API — Client-Side Only, Server-Side Missing

**Issue:** Version history works but diff comparison is client-side only; no server API for structured diffs

**Files:**
- Frontend: `apps/web/components/version-history-modal.tsx` (lines 68-71)
  - Uses `diffLines()` from npm package `diff`
  - `selectedVersion.content` vs `currentContent` comparison in browser
- Backend: `apps/api/src/routes/versions.ts` (lines 21-56)
  - Has: `GET /versions`, `POST /restore-version`
  - Missing: `GET /versions/:versionNum/diff` endpoint

**Symptoms:**
- Diff works only for single user viewing in browser
- No structured diff output (can't use for collab notifications, audit logs)
- Large content diffs may freeze UI during diffLines() computation

**Fix Approach:**
- Add endpoint: `GET /api/v1/workspaces/:wsId/documents/:docId/versions/:versionNum/diff`
  - Params: `versionNum`, optional `base=versionNum` to compare two versions
  - Returns: `{ added: [], removed: [], changed: [] }` (structured format)
- Use Node.js `diff` package server-side for consistency
- Cache diff results for frequently-compared versions

---

### 5. Category Graph API — Closure Table Schema Exists, REST Endpoints Missing

**Issue:** Closure table structure for hierarchical categories exists in DB, but no API to query parent/child relationships

**Files:**
- Database: Likely has `category_closure` or similar table (not verified in schema read)
- Backend: `apps/api/src/routes/categories.ts`
  - Has: `POST/GET/PATCH/DELETE` (CRUD), `/tree` (full tree with documents)
  - Missing: `/ancestors`, `/descendants`, `/root`, `/parents` endpoints
- Frontend: No graph visualization using hierarchy

**Symptoms:**
- Category tree loads whole tree every time (inefficient)
- Cannot efficiently query "all ancestors of category X"
- Cannot fetch "all descendants for category X"

**Fix Approach:**
- Add endpoints using closure table:
  ```
  GET /workspaces/:wsId/categories/:id/ancestors
  GET /workspaces/:wsId/categories/:id/descendants
  GET /workspaces/:wsId/categories/:id/root
  ```
- Leverage closure table for single query: `SELECT ancestor_id FROM category_closure WHERE descendant_id = ?`
- Update frontend to use individual endpoints instead of full tree refresh

---

### 6. Single Document DAG Context — Frontend Components Exist, API Missing

**Issue:** Frontend expects document relationship context (related documents, reverse links) but no dedicated API endpoint

**Files:**
- Frontend: Likely has components expecting `GET /documents/:id/context` or `/documents/:id/relations`
- Backend: `apps/api/src/routes/relations.ts` and `documents.ts`
  - Has: Relations CRUD and list endpoints
  - Missing: Efficient "document context" endpoint combining forward+backward relations

**Symptoms:**
- Sidebar/panels requesting related documents must make multiple API calls
- No single endpoint for "show me everything connected to this document"

**Fix Approach:**
- Add: `GET /api/v1/workspaces/:wsId/documents/:docId/context`
  - Returns: `{ document, incomingRelations[], outgoingRelations[], relatedDocuments[] }`
  - Depth parameter optional: `?depth=1` (direct) vs `?depth=2` (transitive)

---

### 7. Public Embed Page — Token CRUD Done, Render Page Missing

**Issue:** Embed token management API exists (`POST/GET/DELETE /workspaces/:id/embed-tokens`), but no public page to render documents

**Files:**
- Backend: `apps/api/src/routes/embed-tokens.ts` (lines 17-50)
  - Has: Create token, list, revoke (all admin-only)
  - Missing: Public endpoint to verify token and render document
- Frontend: `apps/web/app/(public)/` exists but empty (only layout + landing)
  - Missing: `apps/web/app/(public)/embed/[token]/page.tsx`

**Symptoms:**
- Tokens can be generated but not used anywhere
- No way to embed documents in external sites

**Fix Approach:**
1. Add backend endpoint: `GET /api/v1/public/embed/:token/document`
   - Query DB: find embed_token, check expiry, verify scope
   - Return: document + minimal metadata (title, content, updated date)
   - No auth required
2. Create frontend page: `apps/web/app/(public)/embed/[token]/page.tsx`
   - Fetch document via public endpoint
   - Render using `@markflow/editor` (preview mode)
   - Show attribution footer

---

### 8. OG Link Preview — Frontend Component Exists, Proxy API Missing

**Issue:** Open Graph link preview component exists but no server API to fetch and cache OG metadata

**Files:**
- Frontend: Component likely exists in `apps/web/components/` for link cards
- Backend: `apps/api/src/routes/` missing OG preview endpoint

**Symptoms:**
- Link previews shown in UI but no backend caching
- Every user fetch = external HTTP request (slow, potential DOS)
- No way to sanitize/store metadata

**Fix Approach:**
- Add endpoint: `GET /api/v1/public/og-preview?url=...`
  - Use `og-parser` or `html-metadata` npm package
  - Cache result in Redis/DB with 24h TTL
  - Sanitize HTML (remove scripts, limit excerpt length)
  - Rate limit by URL (not IP) to prevent abuse

---

## Security Gaps

### 9. SVG Upload Security — Code Separation Done, Documentation Missing

**Issue:** SVG upload is allowed but security implications not documented in code; split between client validation and worker

**Files:**
- Frontend: Image upload validation happens in `apps/web/`
- Worker: `apps/worker/src/index.ts` (lines 10-16)
  - Allows: `image/svg+xml`
  - No inline script detection
- Docs: `docs/SECURITY.md` (line 28)
  - Notes: "SVG upload: `image/svg+xml` allowed, SVG internal `<script>` tag caution"
  - No implementation guidance

**Risk:**
- SVG can contain `<script>`, `<iframe>`, embedded JS via event handlers
- If rendered directly as HTML (not `<img>` tag), XSS is possible
- Frontend sanitization for SVG unclear

**Current Mitigation:** Not confirmed if front-end sanitizes SVG before insertion

**Recommendations:**
1. Document SVG handling in code comments:
   ```typescript
   // SVG files MUST be rendered as <img src="..."> or with DOMPurify
   // Never use dangerouslySetInnerHTML with raw SVG content
   // SVG parser/sanitizer recommended (use 'svgo' or 'dompurify')
   ```
2. Add SVG security test in worker unit tests
3. Update `docs/SECURITY.md` with specific SVG rendering rules

---

### 10. R2 Worker CORS — ALLOWED_ORIGINS Commented Out, Defaults to `*`

**Issue:** CORS configuration allows all origins by default; security exposure in public R2 bucket

**Files:**
- `apps/worker/src/index.ts` (lines 6, 20)
  - `const allowed = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? ['*']`
  - Default `['*']` means any origin can call the worker
  - `ALLOWED_ORIGINS` env var is optional and not documented

**Risk:**
- Unauthenticated POST to `/upload` is publicly accessible
- CSRF attacks: any site can trigger image upload to your R2
- DDoS: attacker can fill R2 bucket from anywhere

**Current Mitigation:** File validation (type, size) only; no origin check

**Fix Approach:**
1. Make `ALLOWED_ORIGINS` required in `wrangler.toml`:
   ```toml
   [env.production]
   vars = { ALLOWED_ORIGINS = "https://app.markflow.io,https://demo.markflow.io" }
   ```
2. Remove default `['*']` — fail closed if env var missing
3. Add deployment docs:
   ```
   CRITICAL: Set ALLOWED_ORIGINS in wrangler.toml before deploying to production
   Default value of '*' is intentional for local dev only
   ```

---

### 11. R2 Worker Unauthenticated POST — No Auth Token Validation

**Issue:** Image upload endpoint accepts requests without any authentication token

**Files:**
- `apps/worker/src/index.ts` (lines 65-112)
  - `if (url.pathname === '/upload' && request.method === 'POST')`
  - No `Authorization` header check
  - No token validation

**Risk:**
- Anyone can upload files to your R2 bucket
- Storage quota exhaustion / billing abuse
- Bucket becomes spam dump

**Current Mitigation:** File size limit (10MB) only; rate limiting at Cloudflare level assumed

**Fix Approach:**
1. Accept optional auth token in env:
   ```typescript
   interface Env {
     BUCKET: R2Bucket
     PUBLIC_URL: string
     ALLOWED_ORIGINS?: string
     API_SECRET?: string  // NEW
   }
   
   if (env.API_SECRET) {
     const auth = request.headers.get('Authorization')
     const [scheme, token] = (auth ?? '').split(' ')
     if (scheme !== 'Bearer' || token !== env.API_SECRET) {
       return jsonResponse({ error: 'Unauthorized' }, 401, cors)
     }
   }
   ```
2. Frontend passes token: `headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_WORKER_SECRET}` }`
3. Document: "For local dev, omit API_SECRET; for production, set and pass in frontend"

---

## Test Coverage Gaps

### 12. Comment CRUD Tests — No Test File

**Issue:** Comments feature is fully implemented but has no integration tests

**Files:**
- Implementation: `apps/api/src/routes/comments.ts` (109 lines, CRUD + resolve toggle)
- Service: `apps/api/src/services/comment-service.ts` (316 lines)
- Tests: **No file** — should be `apps/api/tests/integration/comments.test.ts`

**What's Not Tested:**
- Create comment (POST)
- List comments (GET)
- Update comment content (PATCH)
- Toggle resolved status (PATCH)
- Delete comment (DELETE)
- Thread/parentId relationships
- Permission checks (editor role requirement)
- Data isolation (workspace boundary)

**Impact:** High — Comment is core collaboration feature; bugs undetected

**Fix:** Create `apps/api/tests/integration/comments.test.ts` with:
- Setup: create workspace, document, user with editor role
- Test CRUD: create → read → update → delete → verify 404
- Test threading: create parent comment, create child with `parentId`
- Test permissions: viewer cannot POST, editor can
- Test data isolation: user from workspace A cannot see comments in workspace B

---

### 13. Image Upload Tests — No Test File

**Issue:** R2 image upload Worker is untested; security critical code without verification

**Files:**
- Implementation: `apps/worker/src/index.ts` (117 lines)
- Tests: **No file** — should be `apps/worker/tests/upload.test.ts` or similar

**What's Not Tested:**
- File type validation (only png/jpg/gif/webp/svg allowed)
- File size limit (10MB max)
- Missing file handling (400 error)
- CORS header generation
- Successful upload flow
- Content-Type correctness in R2
- Key generation uniqueness
- URL construction

**Impact:** High — File upload is user-facing and security-sensitive

**Fix Approach:**
1. Create `apps/worker/tests/upload.test.ts` (or configure Vitest/Jest)
2. Mock R2 Bucket using `@miniflare/core` or in-memory mock
3. Test matrix:
   ```
   ✓ Valid image (png/jpg/gif/webp/svg) → 200, returns URL
   ✓ Invalid type (pdf, txt) → 400
   ✓ File too large (>10MB) → 400
   ✓ No file field → 400
   ✓ Multiple files → only first processed
   ✓ CORS headers present
   ✓ Key has timestamp + uuid + extension
   ```

---

## Additional Concerns

### 14. Database: Full-Text Search Extension Not Initialized

**Issue:** No evidence `pg_trgm` extension is created in migrations

**Impact:** If attempting to implement full-text search (concern #3), will fail at runtime

**Fix:** Add Drizzle migration file creating the extension

---

### 15. Versions Service: No Diff Computation on Server

**Issue:** `document-service.ts` fetches versions (list, restore) but no diff utility

**Impact:** Version diff API (concern #4) cannot be implemented without first writing diff service

**Fix:** Create `apps/api/src/services/diff-service.ts` with function to compute structured diffs

---

### 16. Embed Token Service: No Expiry Enforcement in Public Access

**Issue:** `apps/api/src/routes/embed-tokens.ts` creates tokens with `expiresAt`, but public endpoint doesn't exist to verify it

**Impact:** Tokens could be set to expire but enforcement is impossible until public endpoint added

**Fix:** Part of concern #7 (public embed page)

---

### 17. Large Service Files — Approaching Complexity Threshold

**Files:**
- `apps/api/src/services/document-service.ts` — 430 lines
- `apps/api/src/services/category-service.ts` — 341 lines
- `apps/api/src/services/workspace-service.ts` — 318 lines
- `apps/api/src/services/comment-service.ts` — 316 lines

**Risk:** Difficult to test, high cyclomatic complexity, harder to refactor

**Recommendation:** Once phase 2 stabilizes, consider extracting helper functions (excerpt, ranking logic) into shared utilities

---

## Summary by Priority

| # | Concern | Priority | Impact | Effort |
|---|---------|----------|--------|--------|
| 1 | Missing POST /auth/resend-verification | P1 Critical | 404 error on resend email | 2h |
| 2 | Missing PATCH /users/me/password | P1 Critical | Cannot change password logged-in | 3h |
| 3 | Full-text search (ILIKE only) | P2 | Performance/UX degradation at scale | 1d |
| 4 | Version diff API (client-side only) | P2 | No structured diffs, UI may lag | 4h |
| 5 | Category graph API (endpoints missing) | P2 | Tree inefficiency, no hierarchy queries | 6h |
| 6 | Document context API (missing endpoint) | P2 | Multiple API calls per sidebar view | 3h |
| 7 | Public embed page (token CRUD done) | P2 | Tokens generated but unusable | 1d |
| 8 | OG link preview API (missing) | P2 | No link metadata, external requests | 4h |
| 9 | SVG security docs (code done, docs missing) | Security | Doc completeness, implementation unclear | 1h |
| 10 | R2 CORS defaults to `*` | Security | Bucket accessible from any origin | 1h |
| 11 | R2 no auth token validation | Security | Unauthenticated uploads possible | 2h |
| 12 | Comment CRUD tests missing | Test Gap | Zero coverage on collab feature | 4h |
| 13 | Image upload tests missing | Test Gap | Security-critical code untested | 3h |

---

*Concerns audit: 2026-04-11*
