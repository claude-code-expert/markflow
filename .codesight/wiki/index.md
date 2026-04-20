# markflow — Wiki

_Generated 2026-04-20 — re-run `npx codesight --wiki` if the codebase has changed._

Structural map compiled from source code via AST. No LLM — deterministic, 200ms.

> **How to use safely:** These articles tell you WHERE things live and WHAT exists. They do not show full implementation logic. Always read the actual source files before implementing new features or making changes. Never infer how a function works from the wiki alone.

## Articles

- [Overview](./overview.md)
- [Database](./database.md)
- [Auth](./auth.md)
- [Payments](./payments.md)
- [Api-keys](./api-keys.md)
- [Broadcasts](./broadcasts.md)
- [Close](./close.md)
- [Connect](./connect.md)
- [Contact-properties](./contact-properties.md)
- [Contacts](./contacts.md)
- [Data](./data.md)
- [Domains](./domains.md)
- [Drain](./drain.md)
- [Emails](./emails.md)
- [Error](./error.md)
- [Forgot-password](./forgot-password.md)
- [Invitations](./invitations.md)
- [Markflow-pdf-export](./markflow-pdf-export.md)
- [Me](./me.md)
- [Resend-verification](./resend-verification.md)
- [Reset-password](./reset-password.md)
- [Secureconnect](./secureconnect.md)
- [Segments](./segments.md)
- [Start](./start.md)
- [Templates](./templates.md)
- [Timeout](./timeout.md)
- [Topics](./topics.md)
- [Verify-email](./verify-email.md)
- [Workspaces](./workspaces.md)
- [Infra](./infra.md)
- [Ui](./ui.md)
- [Libraries](./libraries.md)

## Quick Stats

- Routes: **88**
- Models: **15**
- Components: **87**
- Env vars: **26** required, **11** with defaults

## How to Use

- **New session:** read `index.md` (this file) for orientation — WHERE things are
- **Architecture question:** read `overview.md` (~500 tokens)
- **Domain question:** read the relevant article, then **read those source files**
- **Database question:** read `database.md`, then read the actual schema files
- **Library question:** read `libraries.md`, then read the listed source files
- **Before implementing anything:** read the source files listed in the article
- **Full source context:** read `.codesight/CODESIGHT.md`

## What the Wiki Does Not Cover

These exist in your codebase but are **not** reflected in wiki articles:
- Routes registered dynamically at runtime (loops, plugin factories, `app.use(dynamicRouter)`)
- Internal routes from npm packages (e.g. Better Auth's built-in `/api/auth/*` endpoints)
- WebSocket and SSE handlers
- Raw SQL tables not declared through an ORM
- Computed or virtual fields absent from schema declarations
- TypeScript types that are not actual database columns
- Routes marked `[inferred]` were detected via regex and may have lower precision
- gRPC, tRPC, and GraphQL resolvers may be partially captured

When in doubt, search the source. The wiki is a starting point, not a complete inventory.

---
_Last compiled: 2026-04-20 · 33 articles · [codesight](https://github.com/Houseofmvps/codesight)_