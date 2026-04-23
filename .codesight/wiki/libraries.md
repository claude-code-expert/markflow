# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**39 library files** across 5 modules

## Web (31 files)

- `apps/web/lib/image-upload.ts` — getWorkerUrl, getUploadConfig, saveWorkerUrl, clearWorkerUrl, isImageUploadEnabled, setImageUploadEnabled, …
- `apps/web/lib/server/utils/errors.ts` — notFound, forbidden, unauthorized, badRequest, conflict, gone, …
- `apps/web/lib/server/middleware.ts` — extractCurrentUser, checkRole, handleApiError, CurrentUser, WorkspaceMember, ApiContext
- `apps/web/lib/server/utils/jwt.ts` — signAccessToken, signRefreshToken, signTokenPair, verifyAccessToken, verifyRefreshToken, getRefreshTokenExpiry
- `apps/web/lib/date.ts` — formatKstDate, formatKstDateTime, formatKstDateWithOptions, formatKstRelative, formatKstRelativeLong
- `apps/web/lib/server/utils/email.ts` — sendEmail, verificationEmailHtml, passwordResetEmailHtml, invitationEmailHtml, FRONTEND_URL
- `apps/web/lib/category-utils.ts` — flattenCategories, collectAllDocs, FlatCategory, FlatDocument
- `apps/web/lib/api.ts` — setAccessToken, clearAccessToken, apiFetch
- `apps/web/lib/server/services/category-service.ts` — createCategoryService, CategoryTreeDocument, CategoryTreeNode
- `apps/web/lib/server/utils/password.ts` — hashPassword, comparePassword, validatePassword
- `apps/web/hooks/use-permissions.ts` — usePermissions, hasMinRole
- `apps/web/lib/server/services/document-service.ts` — createDocumentService, DocumentStatus
- `apps/web/lib/parse-theme-css.ts` — parseThemeCss
- `apps/web/lib/server/db.ts` — getDb
- `apps/web/lib/server/services/auth-service.ts` — createAuthService
- `apps/web/lib/server/services/comment-service.ts` — createCommentService
- `apps/web/lib/server/services/document-visibility.ts` — draftVisibilityClause
- `apps/web/lib/server/services/embed-token-service.ts` — createEmbedTokenService
- `apps/web/lib/server/services/export-service.ts` — createExportService
- `apps/web/lib/server/services/graph-service.ts` — createGraphService
- `apps/web/lib/server/services/import-service.ts` — createImportService
- `apps/web/lib/server/services/invitation-service.ts` — createInvitationService
- `apps/web/lib/server/services/join-request-service.ts` — createJoinRequestService
- `apps/web/lib/server/services/member-service.ts` — createMemberService
- `apps/web/lib/server/services/relation-service.ts` — createRelationService
- _…and 6 more files_

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