# Architecture Patterns: KMS Phase 2 Feature Integration

**Domain:** 7 new features integrating into existing Fastify/Drizzle/Next.js KMS
**Researched:** 2026-04-11
**Confidence:** HIGH (based on direct codebase analysis + verified external sources)

---

## Current Architecture Overview

```
Browser (Next.js 16 App Router)
  |
  |  apiFetch() -- Bearer JWT in Authorization header
  |  Zustand stores (auth, workspace, editor, sidebar, toast)
  |
  v
Fastify API (apps/api, port 4000)
  |-- /api/v1/auth/*        (no auth middleware)
  |-- /api/v1/users/*       (authMiddleware global hook)
  |-- /api/v1/workspaces/*  (authMiddleware + requireRole per route)
  |-- /api/v1/workspaces/:wsId/documents/*
  |-- /api/v1/workspaces/:wsId/categories/*
  |-- /api/v1/workspaces/:wsId/graph
  |-- ...16 more route groups
  |
  v
PostgreSQL 16 (Drizzle ORM, 15 tables)
  |-- documents, document_versions, document_relations
  |-- categories, category_closure (Closure Table)
  |-- embed_tokens
  |-- users, workspaces, workspace_members, ...

Cloudflare R2 Worker (apps/worker, independent)
  |-- POST /upload (currently unauthenticated)
```

### Key Architectural Patterns Already Established

| Pattern | Implementation | Location |
|---------|---------------|----------|
| Service factory | `createXxxService(db)` returns method object | `apps/api/src/services/` |
| Route plugin | `async function xxxRoutes(app, { db })` with Fastify plugin registration | `apps/api/src/routes/` |
| Auth chain | `authMiddleware` (global hook) -> `requireRole('viewer'/'editor'/'admin')` (per route preHandler) | `apps/api/src/middleware/` |
| CSRF defense | Origin header validation on state-changing methods | `apps/api/src/middleware/csrf.ts` |
| Error model | `AppError(code, message, statusCode)` with `.toJSON()` | `apps/api/src/utils/errors.ts` |
| Frontend API | `apiFetch<T>(path, opts)` with auto-refresh on 401 | `apps/web/lib/api.ts` |
| DB exports | Central barrel export from `@markflow/db` | `packages/db/src/index.ts` |

---

## Recommended Architecture: 7 Features

### Component Boundary Map

```
+------------------------------------------------------------------+
|  apps/web (Next.js 16)                                           |
|                                                                  |
|  [Authenticated Routes]              [Public Routes]             |
|  - search-modal.tsx (updated)        - /embed/[token]/page.tsx   |
|  - version-history-modal.tsx (uses   - (renders @markflow/editor |
|    server diff)                      -  in preview mode)         |
|  - category-tree.tsx (ancestors/     |                           |
|    descendants)                      |                           |
|  - dag-structure-modal.tsx (doc      |                           |
|    context)                          |                           |
+------------------------------------------------------------------+
                  |                              |
                  v                              v
+------------------------------------------------------------------+
|  apps/api (Fastify)                                              |
|                                                                  |
|  [Authenticated Plugin Group]        [Public Plugin Group]       |
|  authMiddleware + requireRole        NO authMiddleware            |
|                                                                  |
|  1. search (enhanced document-       5. GET /public/embed/:token |
|     service.ts)                         /document                |
|  2. GET .../versions/:num/diff       6. GET /public/og-preview   |
|     (new diff-service.ts)               ?url=...                |
|  3. GET .../categories/:id/                                      |
|     ancestors|descendants                                        |
|  4. GET .../documents/:docId/                                    |
|     context                                                      |
|                                                                  |
|  [New Services]                      [New Services]              |
|  - diff-service.ts                   - embed-public-service.ts   |
|  - search-service.ts (extracted)     - og-preview-service.ts     |
|                                                                  |
+------------------------------------------------------------------+
                  |                              |
                  v                              v
+------------------------------------------------------------------+
|  PostgreSQL 16                                                   |
|                                                                  |
|  [New Migration]                     [Existing Tables]           |
|  - CREATE EXTENSION pg_trgm         - documents (content, title) |
|  - GIN index on documents           - document_versions          |
|    (title, content)                  - document_relations         |
|  - og_preview_cache table (new)      - category_closure          |
|                                      - embed_tokens              |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  apps/worker (Cloudflare R2)                                     |
|                                                                  |
|  7. Auth token validation added                                  |
|     - API_SECRET env var                                         |
|     - Bearer token check on POST /upload                         |
|     - ALLOWED_ORIGINS required (no more default '*')             |
+------------------------------------------------------------------+
```

---

## Feature-by-Feature Architecture

### Feature 1: Full-Text Search (pg_trgm Enhancement)

**Component:** Modify existing `document-service.ts`, add DB migration
**Boundary:** Stays within authenticated workspace scope

**Why pg_trgm (not tsvector):**
- 한국어 콘텐츠 지원이 핵심 요구사항. tsvector는 한국어 stemming/tokenizing을 기본 지원하지 않음
- pg_trgm은 언어 비의존적 -- 한국어, 영어, 혼합 텍스트 모두 작동
- 오타 허용(fuzzy matching) 제공 -- "markdwon" 검색 시 "markdown" 매칭
- 문서 규모 10K 이하에서는 tsvector 대비 성능 차이 미미

**Data Flow:**
```
SearchModal (debounced input)
  -> apiFetch('/workspaces/:wsId/documents?q=...')
  -> documentsRoutes (existing route, same path)
  -> documentService.list() (enhanced query)
     - WHERE similarity(title, q) > 0.1 OR similarity(content, q) > 0.1
     - ORDER BY similarity(title, q) DESC, similarity(content, q) DESC
  -> PostgreSQL: GIN index on (title gin_trgm_ops, content gin_trgm_ops)
  -> Response: { documents: [...], total, page }
     - Each doc includes server-generated excerpt with highlight positions
```

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `packages/db/src/migrations/XXXX_add_pg_trgm.ts` | NEW | `CREATE EXTENSION IF NOT EXISTS pg_trgm` + GIN index |
| `apps/api/src/services/document-service.ts` | MODIFY | Replace `ilike` with `similarity()` + `%` operator in `list()` |
| `apps/web/components/search-modal.tsx` | MINOR | Adapt to improved ranking (no structural change) |

**Build Dependency:** Migration must run before API code change deploys.

---

### Feature 2: Diff Service (Server-Side Version Comparison)

**Component:** New `diff-service.ts` + new route in `versions.ts`
**Boundary:** Authenticated, workspace-scoped, read-only

**Architecture Decision:** Use `diff` npm package (already in frontend `package.json`). Move to server to:
1. Prevent UI freeze on large documents (430-line service suggests large docs exist)
2. Enable future use in audit logs, notifications, webhooks
3. Use `structuredPatch` for machine-readable output alongside `diffLines` for display

**Data Flow:**
```
VersionHistoryModal
  -> apiFetch('/workspaces/:wsId/documents/:docId/versions/:versionNum/diff?base=current')
  -> versionsRoutes (new GET endpoint)
  -> diffService.computeDiff(docId, wsId, versionNum, baseVersionNum?)
     1. Fetch version content from document_versions
     2. Fetch base content (another version OR current document content)
     3. diffLines(versionContent, baseContent) server-side
     4. Return structured result
  -> Response: { 
       changes: [{ type: 'added'|'removed'|'unchanged', value: string, lineCount: number }],
       stats: { additions: number, deletions: number, unchanged: number }
     }
```

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `apps/api/src/services/diff-service.ts` | NEW | `createDiffService(db)` with `computeDiff()` |
| `apps/api/src/routes/versions.ts` | MODIFY | Add `GET .../versions/:versionNum/diff` endpoint |
| `apps/api/package.json` | MODIFY | Add `diff` dependency (if not already present) |
| `apps/web/components/version-history-modal.tsx` | MODIFY | Fetch diff from server instead of local `diffLines()` |

**Build Dependency:** None -- purely additive API endpoint.

---

### Feature 3: Category Ancestors/Descendants REST Endpoints

**Component:** Extend existing `category-service.ts` + `categories.ts` route
**Boundary:** Authenticated, workspace-scoped, read-only

**Architecture Decision:** Leverage existing `category_closure` table. The Closure Table pattern is already fully implemented (see `categoryClosure` schema with `ancestorId`, `descendantId`, `depth`). New endpoints are pure SELECT queries.

**Data Flow:**
```
CategoryTree / Sidebar
  -> apiFetch('/workspaces/:wsId/categories/:id/ancestors')
  -> categoriesRoutes (new GET endpoint)
  -> categoryService.getAncestors(categoryId, workspaceId)
     SELECT c.* FROM categories c
     JOIN category_closure cc ON cc.ancestor_id = c.id
     WHERE cc.descendant_id = :categoryId AND cc.depth > 0
     ORDER BY cc.depth DESC  -- root first
  -> Response: { ancestors: [{ id, name, depth }] }

  -> apiFetch('/workspaces/:wsId/categories/:id/descendants')
  -> categoryService.getDescendants(categoryId, workspaceId)
     SELECT c.*, cc.depth FROM categories c
     JOIN category_closure cc ON cc.descendant_id = c.id
     WHERE cc.ancestor_id = :categoryId AND cc.depth > 0
     ORDER BY cc.depth ASC
  -> Response: { descendants: [{ id, name, parentId, depth }] }
```

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `apps/api/src/services/category-service.ts` | MODIFY | Add `getAncestors()`, `getDescendants()` |
| `apps/api/src/routes/categories.ts` | MODIFY | Add 2 GET endpoints |

**Build Dependency:** None -- uses existing schema.

---

### Feature 4: Document DAG Context Endpoint

**Component:** Extend existing `relation-service.ts` or new `context-service.ts`
**Boundary:** Authenticated, workspace-scoped, read-only

**Architecture Decision:** Create a new method in `relation-service.ts` (not a new service) because:
- `getRelations(docId)` already fetches forward relations
- Context is relations + reverse relations in a single query
- Avoids N+1 problem of current `getRelations()` (loops individual queries per target)

**Data Flow:**
```
DocumentMetaPanel / DAGStructureModal
  -> apiFetch('/workspaces/:wsId/documents/:docId/context')
  -> relationsRoutes (new GET endpoint)
  -> relationService.getDocumentContext(docId, workspaceId)
     1. Single query: all relations WHERE sourceId = docId OR targetId = docId
     2. Batch-fetch all referenced document titles (single IN query)
     3. Partition into { incoming, outgoing, bidirectional }
  -> Response: {
       document: { id, title, categoryId },
       outgoing: { prev: Doc|null, next: Doc|null, related: Doc[] },
       incoming: { prev: Doc|null, next: Doc|null, related: Doc[] },
       stats: { totalConnections: number }
     }
```

**N+1 Fix Opportunity:** Current `getRelations()` does individual DB queries per target document inside a loop. The context endpoint should use a single `inArray()` query to batch-fetch all document titles.

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `apps/api/src/services/relation-service.ts` | MODIFY | Add `getDocumentContext()` with batch query |
| `apps/api/src/routes/relations.ts` | MODIFY | Add `GET .../documents/:docId/context` |

**Build Dependency:** None -- uses existing schema.

---

### Feature 5: Public Embed Endpoint (Unauthenticated)

**Component:** New route file + new service + new Next.js page
**Boundary:** PUBLIC -- no authMiddleware, no RBAC

**Architecture Decision -- Critical:** This is the first public (unauthenticated) API endpoint. It requires a separate Fastify plugin registration WITHOUT the `authMiddleware` global hook.

**Pattern for Public Routes:**
```typescript
// apps/api/src/routes/public.ts (NEW)
export async function publicRoutes(app: FastifyInstance, opts: { db: Db }) {
  // NO authMiddleware hook -- this plugin is public
  const embedPublicService = createEmbedPublicService(opts.db);
  const ogPreviewService = createOgPreviewService(opts.db);

  // GET /api/v1/public/embed/:token/document
  app.get('/embed/:token/document', async (request, reply) => { ... });

  // GET /api/v1/public/og-preview
  app.get('/og-preview', async (request, reply) => { ... });
}

// apps/api/src/index.ts
await app.register(publicRoutes, { prefix: '/api/v1/public', db });
```

**Why a separate route file:** Fastify's plugin encapsulation means hooks registered in one plugin don't leak to siblings. The existing routes use `app.addHook('preHandler', authMiddleware)` at plugin level. A separate `publicRoutes` plugin avoids auth entirely.

**Token Verification Flow:**
```
External iframe / embed page
  -> GET /api/v1/public/embed/:token/document
  -> publicRoutes (NO auth middleware)
  -> embedPublicService.getDocumentByToken(rawToken)
     1. Iterate embed_tokens (non-revoked, non-expired)
     2. bcrypt.compare(rawToken, tokenHash) for each candidate
        (Note: current impl uses hashPassword which is bcrypt)
     3. If match found and not expired: fetch document
     4. Return sanitized document (title + rendered HTML, no edit data)
  -> Response: { title, htmlContent, updatedAt, workspaceName }

Next.js public page
  -> /embed/[token]/page.tsx (Server Component)
  -> fetch() to public API endpoint
  -> Render @markflow/editor PreviewPane (read-only)
  -> No auth required, no cookie needed
```

**Security Considerations:**
- Token lookup is O(n) with bcrypt comparison per token. At scale (>100 tokens), add a token prefix index
- Rate limit the public endpoint aggressively (10 req/min per IP)
- Sanitize document content before rendering (use existing `rehype-sanitize` pipeline)
- Set `X-Frame-Options: ALLOWALL` for embed page only (other pages keep DENY)

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `apps/api/src/routes/public.ts` | NEW | Public routes plugin (embed + OG preview) |
| `apps/api/src/services/embed-public-service.ts` | NEW | Token verification + document fetch |
| `apps/api/src/index.ts` | MODIFY | Register publicRoutes plugin |
| `apps/web/app/(public)/embed/[token]/page.tsx` | NEW | Public embed render page |
| `apps/web/app/(public)/embed/[token]/layout.tsx` | NEW | Minimal layout (no sidebar/header) |

**Build Dependency:** Depends on existing embed_tokens table. No migration needed.

---

### Feature 6: OG Link Preview Proxy Endpoint

**Component:** New service in `public.ts` routes (shares public plugin group)
**Boundary:** PUBLIC -- but authenticated users are the primary consumers

**Architecture Decision:** Place in public routes because:
1. Link preview could be useful for embed pages too
2. Avoids CORS issues (browser can't fetch cross-origin OG tags)
3. Caching benefits all users regardless of auth

**SSRF Prevention (Critical):**
```typescript
// apps/api/src/services/og-preview-service.ts
function validateUrl(input: string): URL {
  const url = new URL(input);
  // 1. Protocol allowlist
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw badRequest('INVALID_URL', 'Only HTTP(S) URLs allowed');
  }
  // 2. Block private IP ranges
  // 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  // Use dns.resolve() to check resolved IP BEFORE fetching
  // 3. Block cloud metadata endpoints
  // 169.254.169.254, fd00:ec2::254
  return url;
}
```

**Data Flow:**
```
LinkPreview component (hover on external link)
  -> apiFetch('/public/og-preview?url=https://example.com/article')
  -> publicRoutes
  -> ogPreviewService.fetchOgMetadata(url)
     1. Validate URL (SSRF prevention)
     2. DNS resolution check (block private IPs)
     3. Check in-memory/DB cache (24h TTL)
     4. If miss: fetch with timeout (3s), parse HTML for <meta og:*>
     5. Extract: title, description, image, siteName
     6. Cache result
  -> Response: { title, description, image, siteName, url }
```

**Caching Strategy:**
- Phase 2 MVP: In-memory Map with LRU eviction (1000 entries, 24h TTL)
- Phase 3: Move to separate `og_preview_cache` table if Redis is not yet available

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `apps/api/src/services/og-preview-service.ts` | NEW | SSRF-safe URL fetch + OG parser + cache |
| `apps/api/src/routes/public.ts` | MODIFY | Add OG preview endpoint |

**Build Dependency:** None -- in-memory cache means no DB migration for MVP.

---

### Feature 7: R2 Worker Auth Token Validation

**Component:** Modify `apps/worker/src/index.ts`
**Boundary:** Independent deployment unit (Cloudflare Workers)

**Architecture Decision:** Shared secret approach (not JWT verification). Reasons:
- Worker environment can't efficiently verify JWTs (no access to signing keys without additional config)
- Simple bearer token comparison is sufficient for internal service auth
- The token is shared between apps/web (as `NEXT_PUBLIC_WORKER_SECRET`) and apps/worker (as `API_SECRET`)

**Data Flow:**
```
EditorPane (image paste/drop)
  -> cloudflareUploader(file, workerUrl, workerSecret)
     headers: { Authorization: 'Bearer ${secret}' }
  -> Cloudflare R2 Worker
     1. Check ALLOWED_ORIGINS (fail closed if missing)
     2. Validate Bearer token against API_SECRET
     3. If API_SECRET is set and no valid token: 401
     4. If API_SECRET is unset: allow (local dev mode)
     5. Process upload as before
  -> Response: { success: true, url: '...' }
```

**Files Changed:**
| File | Change Type | Description |
|------|------------|-------------|
| `apps/worker/src/index.ts` | MODIFY | Add Env.API_SECRET, token validation, strict CORS |
| `apps/worker/wrangler.toml` | MODIFY | Add ALLOWED_ORIGINS, API_SECRET (secret) |
| `apps/web/lib/image-upload.ts` | MODIFY | Pass auth token in upload request |
| `apps/web/.env.example` | MODIFY | Add NEXT_PUBLIC_WORKER_SECRET |

**Build Dependency:** Worker must deploy BEFORE frontend starts sending auth headers (backwards compatible because API_SECRET is optional).

---

## Patterns to Follow

### Pattern 1: Service Factory Consistency

All 7 features MUST use the established `createXxxService(db)` factory pattern:

```typescript
// Good: follows existing pattern
export function createDiffService(db: Db) {
  async function computeDiff(docId: string, wsId: string, vNum: number, base?: number) {
    // ...
  }
  return { computeDiff };
}

// Bad: class-based or singleton (breaks existing conventions)
export class DiffService { ... }
```

### Pattern 2: Public Route Isolation

Public routes MUST be registered as a separate Fastify plugin to avoid inheriting `authMiddleware`:

```typescript
// In index.ts -- register AFTER authenticated routes
// Public routes have their own rate limiting (stricter)
await app.register(publicRoutes, { prefix: '/api/v1/public', db });
```

### Pattern 3: Workspace Scope Enforcement

All authenticated endpoints MUST validate workspace membership through `requireRole()`. Even read-only context endpoints:

```typescript
// Correct: viewer role minimum for read endpoints
app.get('/workspaces/:wsId/documents/:docId/context', {
  preHandler: requireRole('viewer'),
}, handler);
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Embedding Auth Logic in Service Layer

**What:** Checking `currentUser` or role inside service functions
**Why bad:** Services should be auth-agnostic. Auth is a route/middleware concern.
**Instead:** Route handler validates auth via middleware, service receives validated `workspaceId`/`userId`

### Anti-Pattern 2: Public Endpoint Without Rate Limiting

**What:** Registering public endpoints with only global (disabled) rate limit
**Why bad:** `rateLimit` is `global: false` in current config -- public endpoints get NO rate limiting by default
**Instead:** Apply per-route rate limiting on all public endpoints:

```typescript
app.get('/embed/:token/document', {
  config: {
    rateLimit: { max: 30, timeWindow: '1 minute' },
  },
}, handler);
```

### Anti-Pattern 3: N+1 Queries in Context Endpoint

**What:** Looping individual queries per related document (current `getRelations()` pattern)
**Why bad:** Document context with 20 related docs = 21 queries
**Instead:** Batch fetch with single `inArray()` query:

```typescript
const allIds = relations.map(r => r.targetId);
const docs = await db.select().from(documents).where(inArray(documents.id, allIds));
const docMap = new Map(docs.map(d => [d.id, d]));
```

---

## Data Flow Summary

```
                    AUTHENTICATED                          PUBLIC
                    ============                          ======

Browser/Next.js --> [Bearer JWT] --> Fastify API     Browser --> Fastify API
                                        |                          |
   1. Search -----> document-service ---+                          |
   2. Diff -------> diff-service -------+---> PostgreSQL           |
   3. Ancestors --> category-service ---+        ^                 |
   4. Context ----> relation-service ---+        |                 |
                                                 |     5. Embed -> embed-public-service --+
                                                 +-------------------------------------+
                                                       6. OG --> og-preview-service
                                                          (external HTTP fetch + cache)

   7. Image Upload --> [Bearer Secret] --> R2 Worker --> Cloudflare R2
```

---

## Suggested Build Order

Based on dependency analysis and risk assessment:

### Layer 1: Foundation (no dependencies, parallel safe)

| Feature | Rationale |
|---------|-----------|
| **F7: R2 Worker Auth** | Security fix. Backwards compatible (optional secret). Deploy first. |
| **F3: Category Ancestors/Descendants** | Pure read endpoints on existing Closure Table. Zero schema change. |
| **F4: Document DAG Context** | Pure read endpoint on existing relations table. Zero schema change. |

### Layer 2: New Infrastructure (parallel, but need testing)

| Feature | Rationale |
|---------|-----------|
| **F1: Full-Text Search** | Requires DB migration (pg_trgm extension + index). Test migration rollback. |
| **F2: Diff Service** | New service + new npm dependency. No DB change but new service pattern to test. |

### Layer 3: Public Surface (depends on architectural pattern from F5)

| Feature | Rationale |
|---------|-----------|
| **F5: Public Embed** | First public endpoint -- establishes `publicRoutes` plugin pattern. Build this first in Layer 3. |
| **F6: OG Preview** | Shares public route plugin from F5. Has SSRF risk -- needs careful security review. |

**Critical Path:**
```
F7 (Worker auth) -----> independent, deploy anytime
F3+F4 (read endpoints) -> independent, parallel
F1 (search migration) --> F1 code change (sequential: migration then code)
F2 (diff service) ------> independent
F5 (public routes) -----> F6 (shares public plugin)
```

---

## Scalability Considerations

| Concern | At 10 teams (MVP) | At 100 teams | At 1000 teams |
|---------|-------------------|--------------|---------------|
| Search (pg_trgm) | GIN index sufficient | Consider tsvector hybrid for English content | Add Elasticsearch or Typesense |
| Diff computation | Synchronous OK | Add response caching (LRU) | Worker queue for large docs |
| Category tree | Closure Table OK | OK (indexed) | OK (Closure Table scales to millions) |
| Document context | Single query OK | Add Redis cache | Materialized view |
| Embed tokens | bcrypt scan OK (<100 tokens) | Add token prefix index | Token prefix + bloom filter |
| OG preview cache | In-memory Map OK | Move to DB table | Redis with TTL |
| R2 auth | Shared secret OK | Rotate secrets via CI/CD | Move to signed URLs |

---

## Sources

- PostgreSQL pg_trgm vs tsvector: [Aapeli Vuorinen - Postgres Text Search](https://www.aapelivuorinen.com/blog/2021/02/24/postgres-text-search/), [Aiven - Different ways to Search Text](https://aiven.io/blog/different-ways-to-search-text-in-postgresql)
- Fastify public route pattern: [Fastify Routes Reference](https://fastify.dev/docs/latest/Reference/Routes/), [fastify-auth plugin](https://github.com/fastify/fastify-auth)
- Node.js diff library: [jsdiff (npm diff)](https://github.com/kpdecker/jsdiff)
- SSRF prevention: [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- Direct codebase analysis: All route files, service files, schema files, middleware, and frontend components read directly
