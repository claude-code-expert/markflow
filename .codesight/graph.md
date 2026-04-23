# Dependency Graph

## Most Imported Files (change these carefully)

- `apps/web/lib/server/db.ts` — imported by **48** files
- `apps/web/lib/server/middleware.ts` — imported by **47** files
- `apps/web/lib/server/utils/errors.ts` — imported by **42** files
- `apps/web/lib/api.ts` — imported by **39** files
- `apps/web/stores/toast-store.ts` — imported by **20** files
- `apps/web/stores/workspace-store.ts` — imported by **19** files
- `apps/web/lib/types.ts` — imported by **16** files
- `apps/web/lib/server/utils/logger.ts` — imported by **14** files
- `apps/web/lib/date.ts` — imported by **9** files
- `apps/web/lib/server/services/auth-service.ts` — imported by **9** files
- `packages/db/src/schema/users.ts` — imported by **9** files
- `apps/web/stores/auth-store.ts` — imported by **8** files
- `packages/db/src/schema/workspaces.ts` — imported by **8** files
- `apps/web/components/category-tree.tsx` — imported by **7** files
- `apps/web/components/mark-flow-logo.tsx` — imported by **7** files
- `apps/web/hooks/use-permissions.ts` — imported by **6** files
- `apps/web/lib/server/services/category-service.ts` — imported by **6** files
- `apps/web/stores/sidebar-store.ts` — imported by **5** files
- `apps/web/components/tooltip.tsx` — imported by **5** files
- `packages/editor/src/types/index.ts` — imported by **5** files

## Import Map (who imports what)

- `apps/web/lib/server/db.ts` ← `apps/web/app/api/cron/cleanup-trash/route.ts`, `apps/web/app/api/v1/auth/forgot-password/route.ts`, `apps/web/app/api/v1/auth/login/route.ts`, `apps/web/app/api/v1/auth/logout/route.ts`, `apps/web/app/api/v1/auth/refresh/route.ts` +43 more
- `apps/web/lib/server/middleware.ts` ← `apps/web/app/api/v1/auth/forgot-password/route.ts`, `apps/web/app/api/v1/auth/login/route.ts`, `apps/web/app/api/v1/auth/logout/route.ts`, `apps/web/app/api/v1/auth/refresh/route.ts`, `apps/web/app/api/v1/auth/register/route.ts` +42 more
- `apps/web/lib/server/utils/errors.ts` ← `apps/web/app/api/v1/auth/forgot-password/route.ts`, `apps/web/app/api/v1/auth/login/route.ts`, `apps/web/app/api/v1/auth/refresh/route.ts`, `apps/web/app/api/v1/auth/register/route.ts`, `apps/web/app/api/v1/auth/resend-verification/route.ts` +37 more
- `apps/web/lib/api.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx` +34 more
- `apps/web/stores/toast-store.ts` ← `apps/web/__tests__/stores/toast-store.test.ts`, `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx` +15 more
- `apps/web/stores/workspace-store.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/layout.tsx` +14 more
- `apps/web/lib/types.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/trash/page.tsx` +11 more
- `apps/web/lib/server/utils/logger.ts` ← `apps/web/app/api/cron/cleanup-trash/route.ts`, `apps/web/app/api/v1/upload-token/route.ts`, `apps/web/lib/server/middleware.ts`, `apps/web/lib/server/services/auth-service.ts`, `apps/web/lib/server/services/category-service.ts` +9 more
- `apps/web/lib/date.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/trash/page.tsx`, `apps/web/app/(app)/workspaces/page.tsx`, `apps/web/app/invite/[token]/page.tsx` +4 more
- `apps/web/lib/server/services/auth-service.ts` ← `apps/web/app/api/v1/auth/forgot-password/route.ts`, `apps/web/app/api/v1/auth/login/route.ts`, `apps/web/app/api/v1/auth/logout/route.ts`, `apps/web/app/api/v1/auth/refresh/route.ts`, `apps/web/app/api/v1/auth/register/route.ts` +4 more
