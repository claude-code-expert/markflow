
<!-- GSD:project-start source:PROJECT.md -->
## Project

**MarkFlow KMS — Phase 2 MVP**

마크다운 기반 지식 관리 시스템(KMS). 팀이 마크다운 문서를 생성·편집·공유하고, 워크스페이스 단위로 협업할 수 있는 웹 애플리케이션. Phase 0(에디터 패키지)과 Phase 1(프로토타입)이 완료된 상태에서, Phase 2 MVP를 통해 베타 사용자 10팀 온보딩을 목표로 한다.

**Core Value:** **팀이 마크다운으로 지식을 체계적으로 관리하고 공유할 수 있어야 한다** — 문서 생성/편집, 카테고리 계층 구조, 버전 관리, 관계 그래프가 안정적으로 동작해야 한다.

### Constraints

- **TypeScript**: strict mode, `any` 금지
- **CSS**: `.mf-` 접두사, `--mf-` CSS 변수
- **테스트**: 새 기능 구현 시 테스트 코드 먼저 작성 (TDD)
- **커밋**: Conventional Commits
- **보안**: rehype-sanitize 필수, dangerouslySetInnerHTML은 sanitize 통과 HTML만
- **DB**: 삭제/리셋 시 사용자 승인 필수, 마이그레이션 롤백 가능해야 함
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
## New Stack for Phase 2
### 1. Full-Text Search: pg_trgm + GIN Index (Hybrid Approach)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL `pg_trgm` extension | built-in (PG 16) | ILIKE acceleration + fuzzy similarity | Built into PostgreSQL, zero external deps, GIN index accelerates ILIKE 100x+ |
| `drizzle-orm` raw SQL | 0.39.0 | Extension queries | Drizzle doesn't natively support pg_trgm; use `sql` template literals |
### 2. Server-Side Diff: `diff` package (Already Installed)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `diff` (jsdiff) | ^8.0.4 | Line-level diff computation | Already used client-side; reuse server-side for consistency. Built-in TypeScript types since v8. |
- `fast-myers-diff`: 6-50x faster than alternatives, but optimized for character-level diff of short strings. `diffLines()` from `diff` is appropriate for document-level comparison.
- `myers-diff`: Lower-level API, less ergonomic. No advantage for line-level diff.
- Custom implementation: No benefit when a battle-tested library is already in the dependency tree.
### 3. OG Metadata Extraction: `open-graph-scraper`
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `open-graph-scraper` | ^6.11.0 | Extract OG/Twitter Card metadata from URLs | Most popular Node.js OG scraper. Built-in TypeScript types. Uses Fetch API (no heavy deps). |
- 6.11.0 is the latest stable version
- TypeScript declarations built-in (no @types needed)
- Framework-agnostic -- works with any Node.js server including Fastify
- Uses standard Fetch API for HTTP requests
- Supports Open Graph, Twitter Card, JSON-LD, and HTML meta fallbacks
- Configurable timeout, user-agent, and proxy support
- Actively maintained (published ~4 months ago as of research date)
- `metascraper`: Plugin-based architecture adds complexity. Requires installing separate plugins for each metadata type. Overkill for OG + Twitter Card extraction.
- `link-preview-js`: Less popular, fewer features, primarily targets mobile.
- `open-graph-extractor`: Newer, less battle-tested.
- OpenGraph.io API: External SaaS dependency. Adds cost and latency.
- Rate limit the OG preview endpoint by URL (not IP) to prevent abuse
- Sanitize all returned strings (strip HTML tags, limit length)
- URL allowlist/denylist for SSRF prevention (block private IP ranges)
- Set request timeout (5s max) to prevent slow-loris from external sites
### 4. Embed Page Rendering: Next.js Route + Sandbox Pattern
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js App Router | 16.2.1 | Public embed page route | Already in stack. `/embed/[token]/page.tsx` is a natural fit. |
| `@markflow/editor` (preview mode) | workspace:* | Render markdown as HTML | Already built and available. Preview-only mode exists. |
| CSP headers | - | Security sandbox | Restrict embedded page capabilities |
- `script-src 'none'`: No JavaScript execution in embed view (pure HTML render)
- `frame-ancestors *`: Allow any site to embed via iframe
- `img-src * data:`: Allow images from any source (document may reference external images)
- `style-src 'self' 'unsafe-inline'`: Allow MarkFlow CSS + inline styles from markdown rendering
### 5. Worker Authentication: Shared Secret via Cloudflare Secrets
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare Workers Secrets | - | Store auth token | Built-in, encrypted at rest, invisible in dashboard after set |
| Bearer token pattern | - | Request authentication | Simple, stateless, matches existing app auth pattern |
- The R2 Worker is a **single-purpose upload proxy**, not a general API
- Only one consumer: the MarkFlow app itself
- JWT verification adds complexity (key management, token refresh) for zero benefit here
- Shared secret is the standard Cloudflare Workers pattern for service-to-service auth
- `cloudflare-worker-jwt` or `jose` are for scenarios where multiple parties issue tokens
- Our Worker has exactly one trusted caller (the MarkFlow frontend/API)
- JWT adds ~4KB bundle size and key rotation complexity
# Set secret (never in wrangler.toml or git)
# Enter a random 64-char hex string
# Local dev: .dev.vars file (gitignored)
## Supporting Libraries (New Dependencies Summary)
| Library | Version | Target Package | Purpose | Confidence |
|---------|---------|----------------|---------|------------|
| `diff` | ^8.0.4 | `apps/api` | Server-side diff computation | HIGH |
| `open-graph-scraper` | ^6.11.0 | `apps/api` | OG metadata extraction | HIGH |
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
# API server -- new dependencies
# Database -- migration (manual SQL, not Drizzle schema)
# Create: packages/db/src/migrations/0004_add_pg_trgm_search.sql
# Worker -- no new packages, just code changes + secret
# Frontend -- no new packages (diff already installed, embed uses existing components)
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->