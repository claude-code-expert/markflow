# Dependency Graph

## Most Imported Files (change these carefully)

- `apps/web/lib/api.ts` — imported by **40** files
- `apps/api/tests/helpers/setup.ts` — imported by **34** files
- `apps/api/src/utils/errors.ts` — imported by **33** files
- `apps/api/tests/helpers/factory.ts` — imported by **33** files
- `apps/web/stores/toast-store.ts` — imported by **21** files
- `apps/web/stores/workspace-store.ts` — imported by **19** files
- `apps/api/src/middleware/auth.ts` — imported by **17** files
- `apps/web/lib/types.ts` — imported by **17** files
- `apps/api/src/utils/logger.ts` — imported by **15** files
- `apps/api/src/middleware/rbac.ts` — imported by **14** files
- `apps/api/src/utils/email.ts` — imported by **12** files
- `packages/db/src/schema/users.ts` — imported by **9** files
- `apps/web/stores/auth-store.ts` — imported by **8** files
- `packages/db/src/schema/workspaces.ts` — imported by **8** files
- `apps/web/components/category-tree.tsx` — imported by **7** files
- `apps/web/components/mark-flow-logo.tsx` — imported by **7** files
- `apps/web/hooks/use-permissions.ts` — imported by **6** files
- `apps/web/stores/sidebar-store.ts` — imported by **5** files
- `apps/web/components/tooltip.tsx` — imported by **5** files
- `packages/editor/src/types/index.ts` — imported by **5** files

## Import Map (who imports what)

- `apps/web/lib/api.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx` +35 more
- `apps/api/tests/helpers/setup.ts` ← `apps/api/tests/integration/auth-forgot-password.test.ts`, `apps/api/tests/integration/auth-login.test.ts`, `apps/api/tests/integration/auth-refresh.test.ts`, `apps/api/tests/integration/auth-register.test.ts`, `apps/api/tests/integration/auth-resend-verification.test.ts` +29 more
- `apps/api/src/utils/errors.ts` ← `apps/api/src/index.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/csrf.ts`, `apps/api/src/middleware/rbac.ts`, `apps/api/src/middleware/workspace-scope.ts` +28 more
- `apps/api/tests/helpers/factory.ts` ← `apps/api/tests/helpers/setup.ts`, `apps/api/tests/integration/auth-forgot-password.test.ts`, `apps/api/tests/integration/auth-login.test.ts`, `apps/api/tests/integration/auth-refresh.test.ts`, `apps/api/tests/integration/auth-reset-password.test.ts` +28 more
- `apps/web/stores/toast-store.ts` ← `apps/web/__tests__/stores/toast-store.test.ts`, `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx` +16 more
- `apps/web/stores/workspace-store.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/layout.tsx` +14 more
- `apps/api/src/middleware/auth.ts` ← `apps/api/src/routes/auth.ts`, `apps/api/src/routes/categories.ts`, `apps/api/src/routes/comments.ts`, `apps/api/src/routes/documents.ts`, `apps/api/src/routes/embed-tokens.ts` +12 more
- `apps/web/lib/types.ts` ← `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx`, `apps/web/app/(app)/[workspaceSlug]/trash/page.tsx` +12 more
- `apps/api/src/utils/logger.ts` ← `apps/api/src/index.ts`, `apps/api/src/jobs/cleanup-trash.ts`, `apps/api/src/middleware/csrf.ts`, `apps/api/src/routes/upload-token.ts`, `apps/api/src/services/auth-service.ts` +10 more
- `apps/api/src/middleware/rbac.ts` ← `apps/api/src/routes/categories.ts`, `apps/api/src/routes/comments.ts`, `apps/api/src/routes/documents.ts`, `apps/api/src/routes/embed-tokens.ts`, `apps/api/src/routes/graph.ts` +9 more
