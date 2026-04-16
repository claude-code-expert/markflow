# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**45 library files** across 6 modules

## Api (31 files)

- `apps/api/src/utils/errors.ts` — notFound, forbidden, unauthorized, badRequest, conflict, gone, …
- `apps/api/src/utils/jwt.ts` — signAccessToken, signRefreshToken, signTokenPair, verifyAccessToken, verifyRefreshToken, getRefreshTokenExpiry
- `apps/api/src/utils/email.ts` — sendEmail, verificationEmailHtml, passwordResetEmailHtml, invitationEmailHtml, FRONTEND_URL
- `apps/api/src/services/category-service.ts` — createCategoryService, CategoryTreeDocument, CategoryTreeNode
- `apps/api/src/utils/password.ts` — hashPassword, comparePassword, validatePassword
- `apps/api/src/db.ts` — getDb, db
- `apps/api/src/jobs/cleanup-trash.ts` — cleanupTrash, startCleanupInterval
- `apps/api/src/services/document-service.ts` — createDocumentService, DocumentStatus
- `apps/api/src/index.ts` — buildApp
- `apps/api/src/middleware/auth.ts` — authMiddleware
- `apps/api/src/middleware/csrf.ts` — csrfMiddleware
- `apps/api/src/middleware/rbac.ts` — requireRole
- `apps/api/src/middleware/workspace-scope.ts` — workspaceScopeMiddleware
- `apps/api/src/plugins/cors.ts` — registerCors
- `apps/api/src/services/auth-service.ts` — createAuthService
- `apps/api/src/services/comment-service.ts` — createCommentService
- `apps/api/src/services/document-visibility.ts` — draftVisibilityClause
- `apps/api/src/services/embed-token-service.ts` — createEmbedTokenService
- `apps/api/src/services/export-service.ts` — createExportService
- `apps/api/src/services/graph-service.ts` — createGraphService
- `apps/api/src/services/import-service.ts` — createImportService
- `apps/api/src/services/invitation-service.ts` — createInvitationService
- `apps/api/src/services/join-request-service.ts` — createJoinRequestService
- `apps/api/src/services/member-service.ts` — createMemberService
- `apps/api/src/services/relation-service.ts` — createRelationService
- _…and 6 more files_

## Web (6 files)

- `apps/web/lib/image-upload.ts` — getWorkerUrl, getUploadConfig, saveWorkerUrl, clearWorkerUrl, isImageUploadEnabled, setImageUploadEnabled, …
- `apps/web/lib/date.ts` — formatKstDate, formatKstDateTime, formatKstDateWithOptions, formatKstRelative, formatKstRelativeLong
- `apps/web/lib/category-utils.ts` — flattenCategories, collectAllDocs, FlatCategory, FlatDocument
- `apps/web/lib/api.ts` — setAccessToken, clearAccessToken, apiFetch
- `apps/web/hooks/use-permissions.ts` — usePermissions, hasMinRole
- `apps/web/lib/parse-theme-css.ts` — parseThemeCss

## Editor (5 files)

- `packages/editor/src/utils/cloudflareUploader.ts` — createCloudflareUploader, createTestImage
- `packages/editor/src/utils/imageValidation.ts` — validateImageFile, ValidationResult
- `packages/editor/src/utils/markdownActions.ts` — applyToolbarAction
- `packages/editor/src/utils/parseMarkdown.ts` — parseMarkdown
- `packages/editor/src/utils/wordCount.ts` — countWords

## Db (1 files)

- `packages/db/src/index.ts` — createDb, Db

## Docs (1 files)

- `docs/sample/markflow-pdf-export.ts` — markdownToPdf, pdfExportRoute

## Worker (1 files)

- `apps/worker/src/helpers.ts` — corsHeaders, jsonResponse, getExtension, checkAuth, Env, MAX_FILE_SIZE, …

---
_Back to [overview.md](./overview.md)_