# Feature Landscape: KMS Phase 2 MVP

**Domain:** Markdown Knowledge Management System (search, diff, embed, link preview, hierarchy, graph)
**Researched:** 2026-04-11
**Overall Confidence:** MEDIUM-HIGH

---

## Table Stakes

Features users expect from any KMS/wiki product. Missing = users feel the product is incomplete and will not adopt it for team use.

| # | Feature | Why Expected | Complexity | Current State | Notes |
|---|---------|-------------|------------|---------------|-------|
| T1 | **Full-text search with relevance ranking** | Every KMS (Notion, Confluence, Obsidian) has instant search with ranked results. Users type and expect relevant documents immediately. | Medium | ILIKE only, no fuzzy matching, no ranking beyond title-first heuristic | `pg_trgm` migration + GiST index + similarity scoring. Existing 200ms debounce search modal is good UX foundation. |
| T2 | **Search result snippets with match highlighting** | Users need context around matches to decide which result to click. Notion shows highlighted excerpts; Confluence shows snippet + match context. | Low | Client-side `content.slice(0, 100)` only, no server-side excerpt extraction around match locations | Server returns excerpt with surrounding context. Frontend already has `highlightMatch()` function. |
| T3 | **Version diff view (inline/unified)** | GitHub, Google Docs, Confluence all show what changed between versions. Users need to see additions/removals to understand document evolution. | Medium | Client-side `diffLines()` from `diff` package works but no server API, no structured output | Server diff API + keep existing client-side diff as fallback. Current UI shows green/red line-level diff. |
| T4 | **Public document embedding** | Teams need to share knowledge externally (stakeholders, public docs). Notion, Confluence, GitBook all offer public page sharing. | Medium | Embed token CRUD complete, token hash stored with expiry/revoke. Zero rendering: no public endpoint, no render page. | Token infrastructure is done. Need: public verification endpoint + Next.js render page using `@markflow/editor` preview mode. |
| T5 | **Category breadcrumb navigation** | Hierarchical KMS requires "where am I?" context. Every file manager, wiki, CMS shows ancestor path. | Low | Closure table schema exists (`category_closure` with `ancestor_id`, `descendant_id`, `depth`). No REST endpoint to query ancestors. | Single SQL query: `SELECT ancestor_id FROM category_closure WHERE descendant_id = ? ORDER BY depth DESC`. Minimal effort. |
| T6 | **Document context (related docs sidebar)** | Users viewing a document need to see what's connected to it. Obsidian shows backlinks panel; Confluence shows "Related pages". | Low | Relations CRUD works (prev/next/related with cycle detection). No single "context" endpoint combining forward + backward links. | One new endpoint aggregating existing data. Frontend likely already expects this shape. |

---

## Differentiators

Features that set MarkFlow apart from generic wiki tools. Not expected, but create competitive advantage for the "10 beta teams" target.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **Fuzzy/typo-tolerant search** | Most small KMS tools only do exact matching. Searching "markdwon" finding "markdown" feels magical. Notion struggles with this at scale; Confluence relies on CQL. | Low (incremental over T1) | `pg_trgm` `similarity()` function handles this automatically once GiST index is in place. Set threshold at 0.3 for typo tolerance. Adds zero extra effort on top of T1. |
| D2 | **Category-scoped search with filters** | Search within a specific category subtree. Confluence has CQL filters; most small KMS tools lack scoping. | Low | Frontend already has category filter dropdown in search modal (`selectedCategoryId`). Backend needs to accept `categoryId` parameter for descendant filtering via closure table. |
| D3 | **Side-by-side (split) diff view** | GitHub offers unified + split view toggle. Most wiki tools only show inline diff. Power users prefer split view for large changes. | Medium | Current UI is unified inline only. Libraries like `react-diff-viewer-continued` or `@git-diff-view/react` provide split view out-of-box. Server `diff` output is format-agnostic. |
| D4 | **Version-to-version comparison (any two)** | Most tools only compare "this version vs current". GitHub lets you compare any two commits. | Low | Backend needs optional `?base=versionNum` parameter on diff endpoint. Frontend needs version selector for base. Minimal backend change. |
| D5 | **Embed with theme/branding control** | Embed page matches consumer's site design (light/dark, custom CSS). Notion embeds look like Notion; GitBook offers custom domains. | Low-Medium | `@markflow/editor` already supports `theme` prop. Embed page can accept `?theme=dark` query parameter. Later: custom CSS injection. |
| D6 | **Local graph view (single document context)** | Obsidian's "local graph" showing 1-2 hop connections from current document. Most KMS tools have no graph at all. | Medium | Workspace-wide graph exists (`getWorkspaceGraph`). Need filtered version: given a document, return nodes/edges within N hops. Frontend graph component (particle effects) exists. |
| D7 | **Link preview cards (OG metadata)** | Pasting a URL in a document shows a rich preview card with title, description, image. Notion, Slack, and Discord all do this. | Medium | No backend proxy. Need: OG scraping endpoint with caching, SSRF protection, rate limiting. Frontend needs preview card component. |

---

## Anti-Features

Features to explicitly NOT build in Phase 2. These are tempting but premature or harmful.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|-------------|-----------|-------------------|
| A1 | **External search engine (Elasticsearch/Meilisearch)** | Massive operational overhead for 10 beta teams. PostgreSQL pg_trgm handles 100K+ documents per workspace comfortably. Notion's search degrades at 5K pages because of their block-based architecture, not because of PG limitations. | Use `pg_trgm` with GiST indexes. Revisit at Phase 3 if 100K+ documents per workspace becomes real. |
| A2 | **Real-time collaborative diff (CRDT)** | Phase 2 is single-user editing with version history. y-websocket/Yjs CRDT adds months of complexity. Already marked out-of-scope in PROJECT.md. | Keep version-based diff. Flag real-time collab for Phase 3. |
| A3 | **AI-powered semantic search** | Requires embedding generation pipeline, vector DB, LLM API costs. Confluence Rovo AI and Notion AI are enterprise-grade investments. | Stick with trigram fuzzy matching. If beta users demand it, consider `pgvector` in Phase 3. |
| A4 | **Public page with custom domain** | DNS configuration, SSL certificates, subdomain routing add significant infrastructure complexity. Already out-of-scope in PROJECT.md. | Phase 2 embed pages use token-based URLs on MarkFlow domain. Custom domains are Phase 3. |
| A5 | **Rendered diff (visual HTML diff)** | Diffing rendered markdown output (DOM diffing) is extremely complex and fragile. GitHub doesn't even attempt it. | Diff raw markdown source only. This is what users of a markdown-based KMS expect. |
| A6 | **oEmbed provider registration** | Becoming an oEmbed provider (so Slack/Notion auto-unfurl MarkFlow links) requires public discovery endpoint, standards compliance, and third-party integration testing. | Phase 2: manual embed via iframe. Phase 3+: consider oEmbed provider registration if demand exists. |
| A7 | **Full OG metadata generation for MarkFlow pages** | Generating OG tags for every MarkFlow document (so links to MarkFlow show previews elsewhere) requires public-facing page architecture and metadata generation pipeline. | Phase 2: focus on consuming OG data from external links, not producing it. Public embed pages can add basic OG tags as a low-effort win. |

---

## Feature Dependencies

```
T1 (Full-text search) ──────► D1 (Fuzzy/typo-tolerant search)
       │                             │
       └───► T2 (Snippet highlighting) │
                                      └───► D2 (Category-scoped search)
                                               │
                                               └── requires T5 (Category breadcrumb/closure table queries)

T3 (Version diff) ──────────► D3 (Split diff view)
       │
       └───► D4 (Any-to-any version comparison)

T4 (Public embed) ──────────► D5 (Theme/branding control)

T5 (Category breadcrumb) ───► D2 (Category-scoped search via descendants)

T6 (Document context) ──────► D6 (Local graph view)

D7 (Link preview) ─────────── Independent (no dependencies on other features)
```

### Critical Path

1. **pg_trgm migration** must happen first -- T1, D1, D2 all depend on it
2. **Closure table REST endpoints** (T5) unblock both breadcrumbs and category-scoped search (D2)
3. **Diff server API** (T3) unblocks split view (D3) and any-to-any comparison (D4)
4. **Embed public endpoint** (T4) is self-contained and can be parallelized with search work

---

## MVP Recommendation

### Must Ship (Table Stakes)

1. **T1 + T2: Full-text search with ranking and snippets** -- This is the single most impactful feature. Users cannot find their documents today with ILIKE. pg_trgm + GiST index + server-side excerpt extraction. The search modal and debounce UX already work.

2. **T3: Version diff server API** -- Current client-side diff works for small documents but will freeze UI on large content. Server-side diff is a 4-hour effort (the `diff` npm package is already in the project). Keep client-side as fallback.

3. **T4: Public embed rendering** -- Token CRUD is done. The "last mile" is a public verification endpoint + a single Next.js page using `@markflow/editor` in preview mode. Without this, embed tokens are dead features.

4. **T5: Category breadcrumb API** -- Closure table schema exists. This is a ~2 hour endpoint addition. Unlocks proper "where am I?" navigation.

5. **T6: Document context API** -- Single endpoint aggregating existing relation queries. ~3 hour effort. Eliminates N+1 API calls from the frontend sidebar.

### Ship If Time Allows (Differentiators)

6. **D1: Fuzzy search** -- Free with pg_trgm (same migration as T1). No reason to not include it.

7. **D7: OG Link preview proxy** -- Independent work stream, ~4 hours. Use `open-graph-scraper` npm package. Cache in DB with 24h TTL. Adds polish to the editing experience.

8. **D4: Any-to-any version comparison** -- Low effort addition to the diff API (`?base=versionNum` parameter).

### Defer to Phase 3

- **D3: Split diff view** -- Requires new React component (react-diff-viewer or git-diff-view). Nice-to-have but unified diff serves 80% of use cases.
- **D5: Embed branding control** -- Theme toggle is easy; custom CSS injection needs design thought.
- **D6: Local graph view** -- Workspace graph already works. Local graph filtering is algorithmic work that can wait.

---

## Implementation Notes by Feature

### T1 + D1: Search (pg_trgm)

**Migration:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_doc_title_trgm ON documents USING GIST (title gist_trgm_ops);
CREATE INDEX idx_doc_content_trgm ON documents USING GIST (content gist_trgm_ops);
```

**Query pattern:**
```sql
SELECT id, title,
  similarity(title, $1) AS title_score,
  similarity(content, $1) AS content_score,
  ts_headline('simple', content, plainto_tsquery('simple', $1),
    'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') AS excerpt
FROM documents
WHERE workspace_id = $2
  AND NOT is_deleted
  AND (title % $1 OR content % $1)
ORDER BY
  GREATEST(similarity(title, $1), similarity(content, $1)) DESC
LIMIT 10;
```

**Note:** `ts_headline` is tsvector-based; for trigram, use custom excerpt extraction with `position()`. Alternatively, use hybrid: tsvector for full-text ranking + pg_trgm for fuzzy fallback. Confidence: MEDIUM -- needs testing with Korean text content to verify trigram behavior with CJK characters. PostgreSQL pg_trgm works with CJK but may need `pg_bigm` extension for better Korean/Japanese handling.

### T3: Version Diff API

**Endpoint:** `GET /workspaces/:wsId/documents/:docId/versions/:versionNum/diff?base=<versionNum>`

**Server-side:** Use existing `diff` package (`diffLines` for line-level, `diffWords` for word-level).

**Response shape:**
```json
{
  "base": { "version": 2, "createdAt": "..." },
  "target": { "version": 5, "createdAt": "..." },
  "changes": [
    { "type": "equal", "value": "unchanged text\n" },
    { "type": "added", "value": "new text\n" },
    { "type": "removed", "value": "old text\n" }
  ],
  "stats": { "additions": 12, "deletions": 5 }
}
```

### T4: Public Embed

**Backend:** `GET /api/v1/public/embed/:token/document`
- Accept raw token, iterate workspace embed tokens, `comparePassword()` against each hash (or add token prefix index for O(1) lookup)
- Check `expiresAt > now()` and `revokedAt IS NULL`
- Return: `{ title, content, updatedAt, workspaceName }`

**Frontend:** `apps/web/app/(public)/embed/[token]/page.tsx`
- Fetch document via public endpoint (no auth)
- Render with `@markflow/editor` in read-only preview mode
- Add CSP headers: `frame-ancestors *` to allow iframe embedding
- Add `X-Frame-Options: ALLOWALL` for legacy browser support

### T5: Category Ancestors

**Endpoint:** `GET /workspaces/:wsId/categories/:id/ancestors`

**Query:**
```sql
SELECT c.id, c.name, cc.depth
FROM category_closure cc
JOIN categories c ON c.id = cc.ancestor_id
WHERE cc.descendant_id = $1
ORDER BY cc.depth DESC;
```

Returns: `[{ id: 1, name: "Root" }, { id: 3, name: "Engineering" }, { id: 7, name: "API Docs" }]`

### D7: OG Link Preview

**Endpoint:** `GET /api/v1/og-preview?url=<encoded-url>`

**Security (SSRF prevention):**
1. Parse URL, reject private IPs (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
2. DNS resolve and re-check resolved IP against private ranges
3. Timeout: 5 seconds max
4. Response size limit: 1MB max HTML
5. Rate limit: 10 requests/minute per user

**Cache:** Store in `og_cache` table with `url_hash`, `title`, `description`, `image_url`, `fetched_at`. TTL 24 hours. Serve stale on fetch failure.

**Library:** `open-graph-scraper` (728 stars, 90K weekly downloads, actively maintained). Prefer over `link-preview-js` which has SSRF concerns with redirect following.

---

## Competitive Reference

| Feature | Notion | Confluence | Obsidian Publish | GitBook | MarkFlow Phase 2 Target |
|---------|--------|------------|------------------|---------|------------------------|
| Full-text search | Yes (degrades >5K pages) | Yes + CQL + Rovo AI | Basic | Yes | pg_trgm fuzzy search |
| Typo tolerance | Limited | Via CQL | No | Yes | pg_trgm similarity |
| Snippet highlighting | Yes | Yes | No | Yes | Server-side excerpts |
| Version diff | Side panel, no true diff view | Inline diff | No versions | Inline diff | Unified diff (split later) |
| Any-to-any version compare | No (current vs selected only) | Yes | N/A | No | Yes (D4) |
| Public embed | iframe embed | Public link | Built-in | Public docs | Token-based embed |
| Link preview cards | Rich unfurling | Smart Links | N/A | N/A | OG proxy (D7) |
| Category breadcrumbs | Breadcrumb in page header | Breadcrumb in page header | Flat structure | Breadcrumb | Closure table ancestors |
| Document graph | No | No | Graph view | No | Local + workspace graph |
| Backlinks | Yes (mentions) | Yes (incoming links) | Yes | No | Forward + backward relations |

---

## Sources

### Search
- [PostgreSQL Full-Text Search vs Elasticsearch](https://iniakunhuda.medium.com/postgresql-full-text-search-a-powerful-alternative-to-elasticsearch-for-small-to-medium-d9524e001fe0) -- MEDIUM confidence
- [pg_trgm vs tsvector comparison](https://www.aapelivuorinen.com/blog/2021/02/24/postgres-text-search/) -- MEDIUM confidence
- [Sourcegraph on Postgres text search](https://sourcegraph.com/blog/postgres-text-search-balancing-query-time-and-relevancy) -- HIGH confidence
- [Search UX Best Practices 2026](https://www.designmonks.co/blog/search-ux-best-practices) -- MEDIUM confidence
- [KMS Search Experience Design](https://knowledge-base.software/guides/designing-a-search-experience/) -- MEDIUM confidence

### Version Diff
- [JSDiff library (diff npm)](https://github.com/kpdecker/jsdiff) -- HIGH confidence (already in project)
- [react-diff-viewer-continued](https://github.com/Aeolun/react-diff-viewer-continued) -- MEDIUM confidence
- [@git-diff-view/react](https://github.com/MrWangJustToDo/git-diff-view) -- MEDIUM confidence
- [Notion Page History](https://ones.com/blog/notion-page-history-version-control/) -- LOW confidence

### Document Embedding
- [Notion iframe embed feature](https://www.embednotionpages.com/blog/notion-feature-iframe-embed) -- MEDIUM confidence
- [CSP frame-ancestors](https://content-security-policy.com/frame-ancestors/) -- HIGH confidence (W3C spec)

### Link Preview
- [open-graph-scraper npm](https://github.com/jshemas/openGraphScraper) -- HIGH confidence (90K downloads/week)
- [Link unfurling guide](https://www.opengraph.io/unfurl-url) -- MEDIUM confidence
- [SSRF prevention in link preview](https://dev.to/bengreenberg/i-built-a-link-preview-api-heres-what-i-learned-about-open-graph-2j99) -- MEDIUM confidence

### Category Hierarchy
- [Closure Table subtree operations](https://www.percona.com/blog/moving-subtrees-in-closure-table/) -- HIGH confidence (Percona)
- [Materialized Path vs Closure Table](https://bojanz.github.io/storing-hierarchical-data-materialized-path/) -- MEDIUM confidence

### Document Graph
- [Obsidian local graph view](https://help.obsidian.md/plugins/graph) -- HIGH confidence (official docs)
- [Obsidian backlinks](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-graph-view) -- MEDIUM confidence
