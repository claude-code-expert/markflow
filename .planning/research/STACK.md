# Technology Stack: Phase 2 Additions

**Project:** MarkFlow KMS Phase 2 MVP
**Researched:** 2026-04-11
**Overall Confidence:** MEDIUM-HIGH (Korean full-text search area needs runtime validation)

## Existing Stack (No Changes)

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5+ (strict) | Language |
| Next.js | 16.2.1 | Frontend (App Router) |
| Fastify | 5.3.0 | API server |
| Drizzle ORM | 0.39.0 | Database ORM |
| PostgreSQL | 16 | Primary database |
| Cloudflare R2 | - | Image storage |
| CodeMirror 6 | - | Markdown editor |
| pnpm + Turborepo | 10.15.0 / 2.x | Monorepo tooling |

---

## New Stack for Phase 2

### 1. Full-Text Search: pg_trgm + GIN Index (Hybrid Approach)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL `pg_trgm` extension | built-in (PG 16) | ILIKE acceleration + fuzzy similarity | Built into PostgreSQL, zero external deps, GIN index accelerates ILIKE 100x+ |
| `drizzle-orm` raw SQL | 0.39.0 | Extension queries | Drizzle doesn't natively support pg_trgm; use `sql` template literals |

**Confidence:** MEDIUM

**Critical Caveat -- Korean Language Support:**

pg_trgm has a **known limitation with non-ASCII characters** including Korean (CJK). The `similarity()` and `word_similarity()` functions may not work correctly with Korean text by default. However, ILIKE pattern matching with GIN index acceleration *does* work with multibyte characters on PostgreSQL installations using UTF-8 encoding (which is standard for PG 16).

**Recommended Strategy (Phased):**

1. **Phase 2 MVP (Now):** Use `pg_trgm` + GIN index for ILIKE acceleration only
   - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
   - `CREATE INDEX idx_doc_title_trgm ON documents USING GIN(title gin_trgm_ops);`
   - `CREATE INDEX idx_doc_content_trgm ON documents USING GIN(content gin_trgm_ops);`
   - Keep existing ILIKE query pattern but now GIN-accelerated
   - Add `ts_headline()` style excerpt extraction server-side
   - Add relevance ranking: title matches weighted higher than content

2. **Phase 2 Post-MVP (If fuzzy search needed):** Evaluate `pg_bigm` extension
   - pg_bigm supports CJK languages natively (bigram vs trigram)
   - Compatible with PostgreSQL 16
   - Requires extension installation (not built-in like pg_trgm)
   - Only pursue if users report search quality issues with Korean typos

3. **Phase 3+ (If scale demands):** Meilisearch or Typesense as external search engine
   - Only when document count exceeds 50K+ per workspace
   - Not needed for beta target of 10 teams

**Why NOT tsvector:** PostgreSQL tsvector has **no built-in Korean language support**. It requires `pg_cjk_parser` extension for CJK tokenization. This adds deployment complexity for marginal benefit at MVP scale. Defer until Korean-specific stemming/tokenization is actually needed.

**Why NOT Meilisearch/Typesense/Elasticsearch now:** External search services add operational complexity (separate process, sync pipeline, deployment). Overkill for beta target of 10 teams with < 10K documents per workspace.

**Migration approach:** Manual SQL migration file (Drizzle ORM does not support `CREATE EXTENSION` in schema definitions).

```sql
-- packages/db/src/migrations/0004_add_pg_trgm_search.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY idx_doc_title_trgm
  ON documents USING GIN(title gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_doc_content_trgm
  ON documents USING GIN(content gin_trgm_ops);
```

**Drizzle query pattern:**
```typescript
import { sql } from 'drizzle-orm';

// GIN-accelerated ILIKE (existing pattern, now fast)
conditions.push(
  or(
    ilike(documents.title, `%${q}%`),
    ilike(documents.content, `%${q}%`),
  )!,
);

// Relevance ranking (title match weighted higher)
const rankExpr = sql`
  CASE WHEN ${documents.title} ILIKE ${`%${q}%`} THEN 2 ELSE 0 END +
  CASE WHEN ${documents.content} ILIKE ${`%${q}%`} THEN 1 ELSE 0 END
`;
```

---

### 2. Server-Side Diff: `diff` package (Already Installed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `diff` (jsdiff) | ^8.0.4 | Line-level diff computation | Already used client-side; reuse server-side for consistency. Built-in TypeScript types since v8. |

**Confidence:** HIGH

The `diff` package (by kpdecker) is already a dependency in `apps/web` at version ^8.0.4. The frontend uses `diffLines()` and `Change` type. Reusing the same library server-side ensures **identical diff output** between client and server.

**Why this and not alternatives:**
- `fast-myers-diff`: 6-50x faster than alternatives, but optimized for character-level diff of short strings. `diffLines()` from `diff` is appropriate for document-level comparison.
- `myers-diff`: Lower-level API, less ergonomic. No advantage for line-level diff.
- Custom implementation: No benefit when a battle-tested library is already in the dependency tree.

**Installation:** Add `diff` to `apps/api/package.json` (currently only in `apps/web`).

```bash
cd apps/api && pnpm add diff
```

**API design:**
```typescript
// apps/api/src/services/diff-service.ts
import { diffLines, type Change } from 'diff';

interface DiffResult {
  changes: Array<{
    type: 'added' | 'removed' | 'unchanged';
    value: string;
    lineStart: number;
    lineCount: number;
  }>;
  stats: { added: number; removed: number; unchanged: number };
}

export function computeDiff(oldContent: string, newContent: string): DiffResult {
  const changes = diffLines(oldContent, newContent);
  // Transform Change[] to structured DiffResult
}
```

---

### 3. OG Metadata Extraction: `open-graph-scraper`

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `open-graph-scraper` | ^6.11.0 | Extract OG/Twitter Card metadata from URLs | Most popular Node.js OG scraper. Built-in TypeScript types. Uses Fetch API (no heavy deps). |

**Confidence:** HIGH

**Why `open-graph-scraper`:**
- 6.11.0 is the latest stable version
- TypeScript declarations built-in (no @types needed)
- Framework-agnostic -- works with any Node.js server including Fastify
- Uses standard Fetch API for HTTP requests
- Supports Open Graph, Twitter Card, JSON-LD, and HTML meta fallbacks
- Configurable timeout, user-agent, and proxy support
- Actively maintained (published ~4 months ago as of research date)

**Why NOT alternatives:**
- `metascraper`: Plugin-based architecture adds complexity. Requires installing separate plugins for each metadata type. Overkill for OG + Twitter Card extraction.
- `link-preview-js`: Less popular, fewer features, primarily targets mobile.
- `open-graph-extractor`: Newer, less battle-tested.
- OpenGraph.io API: External SaaS dependency. Adds cost and latency.

**Installation:**
```bash
cd apps/api && pnpm add open-graph-scraper
```

**Caching strategy:** Store extracted metadata in a new `link_previews` table with 24h TTL. Avoids re-fetching on every request.

```typescript
// apps/api/src/services/og-service.ts
import ogs from 'open-graph-scraper';

interface OGResult {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
  fetchedAt: Date;
}

export async function fetchOGMetadata(url: string): Promise<OGResult> {
  const { result } = await ogs({
    url,
    timeout: 5000,
    fetchOptions: {
      headers: { 'User-Agent': 'MarkFlow-Bot/1.0' },
    },
  });
  return {
    title: result.ogTitle ?? null,
    description: result.ogDescription ?? null,
    image: result.ogImage?.[0]?.url ?? null,
    siteName: result.ogSiteName ?? null,
    url,
    fetchedAt: new Date(),
  };
}
```

**Security considerations:**
- Rate limit the OG preview endpoint by URL (not IP) to prevent abuse
- Sanitize all returned strings (strip HTML tags, limit length)
- URL allowlist/denylist for SSRF prevention (block private IP ranges)
- Set request timeout (5s max) to prevent slow-loris from external sites

---

### 4. Embed Page Rendering: Next.js Route + Sandbox Pattern

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js App Router | 16.2.1 | Public embed page route | Already in stack. `/embed/[token]/page.tsx` is a natural fit. |
| `@markflow/editor` (preview mode) | workspace:* | Render markdown as HTML | Already built and available. Preview-only mode exists. |
| CSP headers | - | Security sandbox | Restrict embedded page capabilities |

**Confidence:** HIGH

**Architecture:**
1. **Backend:** `GET /api/v1/public/embed/:token/document` -- verify token, check expiry, return document
2. **Frontend:** `apps/web/app/(public)/embed/[token]/page.tsx` -- fetch via public API, render
3. **Rendering:** Use `@markflow/editor`'s `parseMarkdown()` utility for preview HTML

**No iframe needed for first-party rendering.** The embed page is a standalone public route that renders the document directly. External consumers embed this page via iframe on their sites.

**Security headers for the embed page:**
```typescript
// apps/web/app/(public)/embed/[token]/page.tsx
export const metadata = {
  other: {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src * data:; frame-ancestors *;",
  },
};
```

Key CSP decisions:
- `script-src 'none'`: No JavaScript execution in embed view (pure HTML render)
- `frame-ancestors *`: Allow any site to embed via iframe
- `img-src * data:`: Allow images from any source (document may reference external images)
- `style-src 'self' 'unsafe-inline'`: Allow MarkFlow CSS + inline styles from markdown rendering

**Token verification pattern:**
```typescript
// Server Component -- no client-side token exposure
async function EmbedPage({ params }: { params: { token: string } }) {
  const doc = await fetch(`${API_URL}/public/embed/${params.token}/document`);
  if (!doc.ok) return <ExpiredOrInvalidToken />;
  const { title, content, updatedAt } = await doc.json();
  const html = parseMarkdown(content);
  return (
    <article className="mf-embed">
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <footer>Updated: {updatedAt} | Powered by MarkFlow</footer>
    </article>
  );
}
```

---

### 5. Worker Authentication: Shared Secret via Cloudflare Secrets

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare Workers Secrets | - | Store auth token | Built-in, encrypted at rest, invisible in dashboard after set |
| Bearer token pattern | - | Request authentication | Simple, stateless, matches existing app auth pattern |

**Confidence:** HIGH

**Why shared secret (not JWT):**
- The R2 Worker is a **single-purpose upload proxy**, not a general API
- Only one consumer: the MarkFlow app itself
- JWT verification adds complexity (key management, token refresh) for zero benefit here
- Shared secret is the standard Cloudflare Workers pattern for service-to-service auth

**Why NOT JWT in Worker:**
- `cloudflare-worker-jwt` or `jose` are for scenarios where multiple parties issue tokens
- Our Worker has exactly one trusted caller (the MarkFlow frontend/API)
- JWT adds ~4KB bundle size and key rotation complexity

**Implementation:**

```typescript
// apps/worker/src/index.ts
interface Env {
  BUCKET: R2Bucket;
  PUBLIC_URL: string;
  ALLOWED_ORIGINS?: string;
  UPLOAD_SECRET?: string;  // NEW: via `wrangler secret put UPLOAD_SECRET`
}

// In the upload handler, before processing:
if (env.UPLOAD_SECRET) {
  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token !== env.UPLOAD_SECRET) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401, cors);
  }
}
```

**Deployment:**
```bash
# Set secret (never in wrangler.toml or git)
wrangler secret put UPLOAD_SECRET
# Enter a random 64-char hex string

# Local dev: .dev.vars file (gitignored)
echo "UPLOAD_SECRET=dev-secret-for-local-testing" > apps/worker/.dev.vars
```

**Frontend sends token:**
```typescript
// apps/web or apps/api -- wherever upload is triggered
const response = await fetch(`${WORKER_URL}/upload`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_UPLOAD_SECRET}`,
  },
  body: formData,
});
```

**Important:** `NEXT_PUBLIC_UPLOAD_SECRET` is exposed to the browser. This is acceptable because:
1. CORS restricts which origins can call the Worker
2. The secret prevents casual/automated abuse, not determined attackers
3. For true security, route uploads through the Fastify API (Phase 3 consideration)

---

## Supporting Libraries (New Dependencies Summary)

| Library | Version | Target Package | Purpose | Confidence |
|---------|---------|----------------|---------|------------|
| `diff` | ^8.0.4 | `apps/api` | Server-side diff computation | HIGH |
| `open-graph-scraper` | ^6.11.0 | `apps/api` | OG metadata extraction | HIGH |

**Note:** pg_trgm and Worker auth require zero new npm packages -- they use PostgreSQL built-in extensions and Cloudflare platform features respectively.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Full-text search | pg_trgm + GIN (ILIKE accel) | Meilisearch | External service overkill at MVP scale |
| Full-text search | pg_trgm + GIN | tsvector FTS | No Korean tokenizer without pg_cjk_parser |
| Full-text search | pg_trgm + GIN | pg_bigm | Requires extension install; defer until fuzzy Korean search is demanded |
| Diff library | `diff` (jsdiff) | `fast-myers-diff` | Optimized for char diff, not line diff; less ergonomic API |
| Diff library | `diff` (jsdiff) | Custom Myers | No benefit over battle-tested library |
| OG scraper | `open-graph-scraper` | `metascraper` | Plugin architecture is overkill |
| OG scraper | `open-graph-scraper` | OpenGraph.io API | External SaaS dependency |
| Worker auth | Shared secret | JWT via `cloudflare-worker-jwt` | Unnecessary complexity for single-consumer Worker |
| Worker auth | Shared secret | JWT via `jose` | Same -- too heavy for simple service auth |
| Embed rendering | Next.js public route | Separate static site | Unnecessary separation when Next.js already serves public routes |

## Installation Summary

```bash
# API server -- new dependencies
cd apps/api && pnpm add diff open-graph-scraper

# Database -- migration (manual SQL, not Drizzle schema)
# Create: packages/db/src/migrations/0004_add_pg_trgm_search.sql

# Worker -- no new packages, just code changes + secret
cd apps/worker && echo "UPLOAD_SECRET=dev-secret" > .dev.vars

# Frontend -- no new packages (diff already installed, embed uses existing components)
```

## Sources

### Full-Text Search
- [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html) -- HIGH confidence
- [PGroonga vs textsearch vs pg_trgm comparison](https://pgroonga.github.io/reference/pgroonga-versus-textsearch-and-pg-trgm.html) -- HIGH confidence
- [Comparing Text Search Strategies](https://dev.to/neon-postgres/comparing-text-search-strategies-pgsearch-vs-tsvector-vs-external-engines-54f0) -- MEDIUM confidence
- [pg_cjk_parser for CJK tokenization](https://github.com/huangjimmy/pg_cjk_parser) -- MEDIUM confidence
- [pg_bigm for CJK bigram search](https://github.com/pgbigm/pg_bigm) -- HIGH confidence
- [Drizzle ORM PostgreSQL Extensions](https://orm.drizzle.team/docs/extensions/pg) -- HIGH confidence

### Diff Libraries
- [jsdiff GitHub](https://github.com/kpdecker/jsdiff) -- HIGH confidence
- [diff npm package](https://www.npmjs.com/package/diff) -- HIGH confidence
- [fast-myers-diff npm](https://www.npmjs.com/package/fast-myers-diff) -- MEDIUM confidence

### OG Metadata
- [open-graph-scraper GitHub](https://github.com/jshemas/openGraphScraper) -- HIGH confidence
- [open-graph-scraper npm](https://www.npmjs.com/package/open-graph-scraper) -- HIGH confidence
- [metascraper](https://metascraper.js.org/) -- MEDIUM confidence

### Embed Security
- [MDN CSP sandbox directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox) -- HIGH confidence
- [MDN iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) -- HIGH confidence
- [Next.js CSP Guide](https://nextjs.org/docs/pages/guides/content-security-policy) -- HIGH confidence

### Worker Authentication
- [Cloudflare Workers Secrets docs](https://developers.cloudflare.com/workers/configuration/secrets/) -- HIGH confidence
- [cloudflare-worker-jwt](https://github.com/tsndr/cloudflare-worker-jwt) -- HIGH confidence
- [Cloudflare JWT Validation docs](https://developers.cloudflare.com/api-shield/security/jwt-validation/jwt-worker/) -- HIGH confidence
