# markflow — AI Context Map

> **Stack:** fastify, next-app | drizzle | react | typescript
> **Monorepo:** @markflow/db, @markflow/editor, @markflow/api, @markflow/demo, @markflow/web, markflow-r2-uploader

> 67 routes | 15 models | 82 components | 42 lib files | 22 env vars | 16 middleware | 82% test coverage
> **Token savings:** this file is ~8,900 tokens. Without it, AI exploration would cost ~94,400 tokens. **Saves ~85,500 tokens per conversation.**
> **Last scanned:** 2026-04-16 06:37 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/workspaces/:wsId/categories`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Categorie
- **`/workspaces/:wsId/documents/:docId/comments`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Comment
- **`/workspaces/:wsId/documents`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Document
- **`/workspaces/:id/embed-tokens`** GET | POST | GET/:id | DELETE/:id → Embed-token
- **`/workspaces/:id/join-requests`** GET | POST | GET/:id | PATCH/:id → Join-request
- **`/workspaces`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Workspace
- **`/workspaces/:id/members`** GET | GET/:id | PATCH/:id | DELETE/:id → Member

## Other Routes

- `GET` `/health` params() [auth, upload]
- `POST` `/register` params() [auth, email] ✓
- `GET` `/verify-email` params() [auth, email]
- `POST` `/resend-verification` params() [auth, email]
- `POST` `/login` params() [auth, email] ✓
- `POST` `/refresh` params() [auth, email]
- `POST` `/forgot-password` params() [auth, email]
- `POST` `/reset-password` params() [auth, email]
- `POST` `/logout` params() [auth, email]
- `GET` `/workspaces/:wsId/categories/tree` params(wsId) [auth] ✓
- `PUT` `/workspaces/:wsId/categories/reorder` params(wsId) [auth] ✓
- `GET` `/workspaces/:wsId/categories/:id/ancestors` params(wsId, id) [auth] ✓
- `GET` `/workspaces/:wsId/categories/:id/descendants` params(wsId, id) [auth] ✓
- `GET` `/workspaces/:wsId/graph` params(wsId) [auth] ✓
- `GET` `/workspaces/:wsId/graph/documents/:id/context` params(wsId, id) [auth] ✓
- `POST` `/workspaces/:wsId/import` params(wsId) [auth, upload]
- `GET` `/workspaces/:wsId/documents/:docId/export` params(wsId, docId) [auth, upload]
- `GET` `/workspaces/:wsId/categories/:catId/export` params(wsId, catId) [auth, upload]
- `POST` `/workspaces/:id/invitations` params(id) [auth] ✓
- `GET` `/invitations/:token` params(token) [auth] ✓
- `POST` `/invitations/:token/accept` params(token) [auth] ✓
- `PATCH` `/workspaces/:id/join-requests/batch` params(id) [auth] ✓
- `PUT` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth] ✓
- `GET` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth] ✓
- `GET` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth] ✓
- `PUT` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth] ✓
- `GET` `/workspaces/:wsId/tags` params(wsId) [auth] ✓
- `GET` `/workspaces/:id/theme` params(id) [auth] ✓
- `PATCH` `/workspaces/:id/theme` params(id) [auth] ✓
- `GET` `/workspaces/:wsId/trash` params(wsId) [auth] ✓
- `POST` `/workspaces/:wsId/trash/:docId/restore` params(wsId, docId) [auth] ✓
- `DELETE` `/workspaces/:wsId/trash/:docId` params(wsId, docId) [auth] ✓
- `GET` `/` params() [auth, upload] ✓
- `GET` `/me` params() [auth, db]
- `PATCH` `/me` params() [auth, db]
- `PUT` `/me/password` params() [auth, db]
- `GET` `/workspaces/:wsId/documents/:docId/versions` params(wsId, docId) [auth]
- `POST` `/workspaces/:wsId/documents/:docId/restore-version` params(wsId, docId) [auth]
- `GET` `/workspaces/public` params() [auth, db] ✓
- `POST` `/workspaces/:id/transfer` params(id) [auth, db] ✓

---

# Schema

### categories
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- name: varchar (required)
- parentId: bigint (fk)
- orderIndex: doublePrecision (default, required)
- _relations_: workspaceId -> workspaces.id, parentId -> categories.id

### category_closure
- ancestorId: bigint (fk, required)
- descendantId: bigint (fk, required)
- depth: integer (required)
- _relations_: ancestorId -> categories.id, descendantId -> categories.id

### comments
- id: bigserial (pk)
- documentId: bigint (fk, required)
- authorId: bigint (fk, required)
- content: text (required)
- parentId: bigint (fk)
- resolved: boolean (default, required)
- resolvedBy: bigint (fk)
- _relations_: documentId -> documents.id, authorId -> users.id, parentId -> comments.id, resolvedBy -> users.id

### document_relations
- id: bigserial (pk)
- sourceId: bigint (fk, required)
- targetId: bigint (fk, required)
- type: varchar (required)
- _relations_: sourceId -> documents.id, targetId -> documents.id

### documents
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- categoryId: bigint (fk)
- authorId: bigint (fk, required)
- title: varchar (required)
- content: text (default, required)
- currentVersion: integer (default, required)
- isDeleted: boolean (default, required)
- _relations_: workspaceId -> workspaces.id, categoryId -> categories.id, authorId -> users.id

### document_versions
- id: bigserial (pk)
- documentId: bigint (fk, required)
- version: integer (required)
- content: text (required)
- authorId: bigint (fk)
- _relations_: documentId -> documents.id, authorId -> users.id

### embed_tokens
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- creatorId: bigint (fk, required)
- label: varchar (required)
- tokenHash: varchar (unique, required)
- scope: varchar (required)
- expiresAt: timestamp (required)
- revokedAt: timestamp
- _relations_: workspaceId -> workspaces.id, creatorId -> users.id

### invitations
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- inviterId: bigint (fk, required)
- email: varchar (required)
- role: varchar (required)
- token: varchar (unique, required)
- status: varchar (default, required)
- expiresAt: timestamp (required)
- _relations_: workspaceId -> workspaces.id, inviterId -> users.id

### join_requests
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- userId: bigint (fk, required)
- message: text
- status: varchar (default, required)
- reviewedBy: bigint (fk)
- assignedRole: varchar
- _relations_: workspaceId -> workspaces.id, userId -> users.id, reviewedBy -> users.id

### refresh_tokens
- id: bigserial (pk)
- userId: bigint (fk, required)
- tokenHash: varchar (unique, required)
- expiresAt: timestamp (required)
- _relations_: userId -> users.id

### tags
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- name: varchar (required)
- _relations_: workspaceId -> workspaces.id

### document_tags
- documentId: bigint (fk, required)
- tagId: bigint (fk, required)
- _relations_: documentId -> documents.id, tagId -> tags.id

### users
- id: bigserial (pk)
- email: varchar (unique, required)
- passwordHash: varchar (required)
- name: varchar (required)
- avatarUrl: varchar
- emailVerified: boolean (default, required)
- emailVerifyToken: varchar
- emailVerifyExpiresAt: timestamp
- passwordResetToken: varchar
- passwordResetExpiresAt: timestamp
- lockedUntil: timestamp
- loginFailCount: integer (default, required)

### workspace_members
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- userId: bigint (fk, required)
- role: varchar (required)
- joinedAt: timestamp (default, required)
- _relations_: workspaceId -> workspaces.id, userId -> users.id

### workspaces
- id: bigserial (pk)
- name: varchar (required)
- isRoot: boolean (default, required)
- isPublic: boolean (default, required)
- ownerId: bigint (fk, required)
- themePreset: varchar (default, required)
- themeCss: text (default, required)
- _relations_: ownerId -> users.id

---

# Components

- **RootLayout** — `apps/demo/app/layout.tsx`
- **Home** [client] — `apps/demo/app/page.tsx`
- **DocLayout** — props: params — `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx`
- **DocEditorPage** [client] — `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`
- **NewDocPage** [client] — `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`
- **DocsPage** [client] — `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`
- **GraphPage** [client] — `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`
- **WorkspaceLayout** [client] — `apps/web/app/(app)/[workspaceSlug]/layout.tsx`
- **WorkspaceHomePage** [client] — `apps/web/app/(app)/[workspaceSlug]/page.tsx`
- **EmbedSettingsPage** [client] — `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx`
- **MembersPage** [client] — `apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx`
- **WorkspaceSettingsPage** [client] — `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx`
- **StorageSettingsPage** [client] — `apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx`
- **ThemeSettingsPage** [client] — `apps/web/app/(app)/[workspaceSlug]/settings/theme/page.tsx`
- **TrashPage** [client] — props: params — `apps/web/app/(app)/[workspaceSlug]/trash/page.tsx`
- **AppLayout** [client] — `apps/web/app/(app)/layout.tsx`
- **WorkspaceListPage** [client] — `apps/web/app/(app)/workspaces/page.tsx`
- **ForgotPasswordPage** [client] — `apps/web/app/(auth)/forgot-password/page.tsx`
- **AuthLayout** — `apps/web/app/(auth)/layout.tsx`
- **LoginLayout** — `apps/web/app/(auth)/login/layout.tsx`
- **LoginPage** [client] — `apps/web/app/(auth)/login/page.tsx`
- **RegisterLayout** — `apps/web/app/(auth)/register/layout.tsx`
- **RegisterPage** [client] — `apps/web/app/(auth)/register/page.tsx`
- **ResetPasswordPage** [client] — props: searchParams — `apps/web/app/(auth)/reset-password/page.tsx`
- **VerifyEmailLayout** — `apps/web/app/(auth)/verify-email/layout.tsx`
- **VerifyEmailPage** [client] — props: searchParams — `apps/web/app/(auth)/verify-email/page.tsx`
- **PublicLayout** — `apps/web/app/(public)/layout.tsx`
- **RootPage** [client] — `apps/web/app/(public)/page.tsx`
- **InviteAcceptPage** [client] — props: params — `apps/web/app/invite/[token]/page.tsx`
- **InviteLayout** — `apps/web/app/invite/layout.tsx`
- **RootLayout** — `apps/web/app/layout.tsx`
- **OGImage** — `apps/web/app/opengraph-image.tsx`
- **PresentPage** [client] — `apps/web/app/present/[workspaceSlug]/[docId]/page.tsx`
- **Providers** [client] — `apps/web/app/providers.tsx`
- **AppHeader** [client] — props: onSearchClick, onNewDoc — `apps/web/components/app-header.tsx`
- **CategoryTree** [client] — props: categories, workspaceSlug, currentCategoryId, currentDocId, onContextMenu, onDocContextMenu, onReorder, onMoveDoc, basePl, indentPx — `apps/web/components/category-tree.tsx`
- **CommentPanel** [client] — props: workspaceId, documentId, onClose — `apps/web/components/comment-panel.tsx`
- **ConfirmModal** [client] — props: open, onClose, onConfirm, title, message, confirmLabel, cancelLabel, isLoading, variant — `apps/web/components/confirm-modal.tsx`
- **CreateWorkspaceModal** [client] — props: open, onClose — `apps/web/components/create-workspace-modal.tsx`
- **DagStructureModal** [client] — props: open, onClose, nodes, edges, currentDocId, currentTitle, categoryName, workspaceSlug, onEditLinks — `apps/web/components/dag-structure-modal.tsx`
- **DocContextMenu** [client] — props: doc, workspaceSlug, workspaceId, position, onClose, onRefresh — `apps/web/components/doc-context-menu.tsx`
- **DocumentLinksModal** [client] — props: open, onClose, workspaceId, documentId, onSaved — `apps/web/components/document-links-modal.tsx`
- **DocumentMetaPanel** [client] — props: doc, workspaceSlug, workspaceId, role, onClose — `apps/web/components/document-meta-panel.tsx`
- **FolderContextMenu** [client] — props: category, workspaceSlug, workspaceId, position, onClose, onNewDoc, onRefresh — `apps/web/components/folder-context-menu.tsx`
- **GraphPreviewModal** [client] — props: open, onClose, workspaceSlug, doc — `apps/web/components/graph-preview-modal.tsx`
- **ImportExportModal** [client] — props: open, onClose, workspaceId, workspaceSlug, currentDocId, currentCategoryId — `apps/web/components/import-export-modal.tsx`
- **JoinRequestPanel** [client] — props: onRequestSent — `apps/web/components/join-request-panel.tsx`
- **FeaturesGrid** — `apps/web/components/landing/features-grid.tsx`
- **Footer** — `apps/web/components/landing/footer.tsx`
- **Hero** — `apps/web/components/landing/hero.tsx`
- **NavBar** — `apps/web/components/landing/nav-bar.tsx`
- **PricingSection** — `apps/web/components/landing/pricing-section.tsx`
- **LinkPreview** [client] — props: containerRef, workspaceId — `apps/web/components/link-preview.tsx`
- **MarkFlowLogo** — props: height, showTagline, dark — `apps/web/components/mark-flow-logo.tsx`
- **MindMapCanvas** [client] — props: nodes, edges, categories, selectedDocId, onSelectDoc, onRightClickDoc, tagLinks, dark — `apps/web/components/mind-map-canvas.tsx`
- **MiniDagDiagram** [client] — props: currentTitle, categoryName, prev, next, related, onClickFullView — `apps/web/components/mini-dag-diagram.tsx`
- **NewDocModal** [client] — props: open, onClose, workspaceSlug, workspaceId, categories — `apps/web/components/new-doc-modal.tsx`
- **NewFolderModal** [client] — props: open, onClose, workspaceId, categories, defaultParentId, onCreated — `apps/web/components/new-folder-modal.tsx`
- **PasswordChangeModal** [client] — props: isOpen, onClose — `apps/web/components/password-change-modal.tsx`
- **PresentationMode** [client] — props: open, onClose, content, title — `apps/web/components/presentation-mode.tsx`
- **ProfileEditModal** [client] — props: open, onClose — `apps/web/components/profile-edit-modal.tsx`
- **SearchModal** [client] — props: open, onClose — `apps/web/components/search-modal.tsx`
- **InviteStatusTab** [client] — props: workspaceId — `apps/web/components/settings/invite-status-tab.tsx`
- **MemberExportTab** [client] — `apps/web/components/settings/member-export-tab.tsx`
- **EmptyState** [client] — props: icon, title, description, actionLabel, onAction — `apps/web/components/states/empty.tsx`
- **ErrorState** [client] — props: title, message, onRetry, onNavigateHome — `apps/web/components/states/error.tsx`
- **Skeleton** — props: width, height, borderRadius — `apps/web/components/states/loading.tsx`
- **WorkspaceListSkeleton** — `apps/web/components/states/loading.tsx`
- **DocumentListSkeleton** — `apps/web/components/states/loading.tsx`
- **EditorSkeleton** — `apps/web/components/states/loading.tsx`
- **StorageGuidePanel** [client] — props: onClose, onConfigured — `apps/web/components/storage-guide-panel.tsx`
- **TagInput** [client] — props: workspaceSlug, workspaceId, documentId, initialTags, disabled — `apps/web/components/tag-input.tsx`
- **ToastProvider** [client] — `apps/web/components/toast-provider.tsx`
- **VersionHistoryModal** [client] — props: open, onClose, workspaceId, documentId, currentContent, hasUnsavedChanges, onRestore — `apps/web/components/version-history-modal.tsx`
- **VersionHistoryPanel** [client] — props: open, onClose, workspaceId, documentId, currentContent, onOpenFullModal, onRestore — `apps/web/components/version-history-panel.tsx`
- **WikiPage** — `docs/seo/page.tsx`
- **MarkdownEditor** — props: value, defaultValue, onChange, layoutProp, themeProp, height, placeholder, readOnly, className, themeVars — `packages/editor/src/MarkdownEditor.tsx`
- **EditorPane** — props: value, onChange, theme, placeholder, readOnly, onScrollRatio, onImageFile, onWikiLinkSearch — `packages/editor/src/editor/EditorPane.tsx`
- **PreviewPane** — props: markdown, scrollRatio, onScrollRatio — `packages/editor/src/preview/PreviewPane.tsx`
- **ImageUploadGuide** — props: isOpen, onClose, onGoToSettings — `packages/editor/src/toolbar/ImageUploadGuide.tsx`
- **SettingsModal** — props: isOpen, onClose, onSave — `packages/editor/src/toolbar/SettingsModal.tsx`
- **Toolbar** — props: onAction, layout, onLayoutChange, theme, onThemeChange, onSettingsClick, onImageUploadClick, hasImageUpload — `packages/editor/src/toolbar/Toolbar.tsx`

---

# Libraries

- `apps/api/src/db.ts` — function getDb: () => Db, const db: Db
- `apps/api/src/index.ts` — function buildApp: () => void
- `apps/api/src/jobs/cleanup-trash.ts` — function cleanupTrash: (db) => Promise<number>, function startCleanupInterval: (db) => ReturnType<typeof setInterval>
- `apps/api/src/middleware/auth.ts` — function authMiddleware: (request, reply) => void
- `apps/api/src/middleware/csrf.ts` — function csrfMiddleware: (request, reply) => void
- `apps/api/src/middleware/rbac.ts` — function requireRole: (...allowedRoles) => void
- `apps/api/src/middleware/workspace-scope.ts` — function workspaceScopeMiddleware: (request, reply) => void
- `apps/api/src/plugins/cors.ts` — function registerCors: (app) => Promise<void>
- `apps/api/src/services/auth-service.ts` — function createAuthService: (db) => void
- `apps/api/src/services/category-service.ts`
  - function createCategoryService: (db) => void
  - interface CategoryTreeDocument
  - interface CategoryTreeNode
- `apps/api/src/services/comment-service.ts` — function createCommentService: (db) => void
- `apps/api/src/services/document-service.ts` — function createDocumentService: (db) => void
- `apps/api/src/services/embed-token-service.ts` — function createEmbedTokenService: (db) => void
- `apps/api/src/services/export-service.ts` — function createExportService: (db) => void
- `apps/api/src/services/graph-service.ts` — function createGraphService: (db) => void
- `apps/api/src/services/import-service.ts` — function createImportService: (db) => void
- `apps/api/src/services/invitation-service.ts` — function createInvitationService: (db) => void
- `apps/api/src/services/join-request-service.ts` — function createJoinRequestService: (db) => void
- `apps/api/src/services/member-service.ts` — function createMemberService: (db) => void
- `apps/api/src/services/relation-service.ts` — function createRelationService: (db) => void
- `apps/api/src/services/tag-service.ts` — function createTagService: (db) => void
- `apps/api/src/services/theme-service.ts` — function createThemeService: (db) => void
- `apps/api/src/services/trash-service.ts` — function createTrashService: (db) => void
- `apps/api/src/services/workspace-service.ts` — function createWorkspaceService: (db) => void
- `apps/api/src/utils/css-validator.ts` — function validateThemeCss: (css) => ValidationResult
- `apps/api/src/utils/email.ts`
  - function sendEmail: (params) => Promise<void>
  - function verificationEmailHtml: (verifyUrl) => string
  - function passwordResetEmailHtml: (resetUrl) => string
  - function invitationEmailHtml: (inviteUrl, workspaceName, inviterName) => string
  - const FRONTEND_URL
- `apps/api/src/utils/errors.ts`
  - function notFound: (message) => AppError
  - function forbidden: (message) => AppError
  - function unauthorized: (message) => AppError
  - function badRequest: (code, message, details?, unknown>) => AppError
  - function conflict: (code, message) => AppError
  - function gone: (code, message) => AppError
  - _...2 more_
- `apps/api/src/utils/html.ts` — function escapeHtml: (str) => string
- `apps/api/src/utils/jwt.ts`
  - function signAccessToken: (payload) => string
  - function signRefreshToken: (payload, rememberMe) => string
  - function signTokenPair: (payload, rememberMe) => TokenPair
  - function verifyAccessToken: (token) => TokenPayload
  - function verifyRefreshToken: (token) => TokenPayload
  - function getRefreshTokenExpiry: (rememberMe) => Date
- `apps/api/src/utils/password.ts`
  - function hashPassword: (password) => Promise<string>
  - function comparePassword: (password, hash) => Promise<boolean>
  - function validatePassword: (password) => void
- `apps/web/hooks/use-permissions.ts` — function usePermissions: (role) => Permissions, function hasMinRole: (userRole, requiredRole) => boolean
- `apps/web/lib/api.ts`
  - function setAccessToken: (token) => void
  - function clearAccessToken: () => void
  - function apiFetch: (path, options) => Promise<T>
- `apps/web/lib/category-utils.ts`
  - function flattenCategories: (cats, prefix) => FlatCategory[]
  - function collectAllDocs: (cats, uncategorized) => FlatDocument[]
  - interface FlatCategory
  - interface FlatDocument
- `apps/web/lib/image-upload.ts`
  - function getWorkerUrl: () => string
  - function getUploadConfig: () => ImageUploadConfig
  - function saveWorkerUrl: (url) => void
  - function clearWorkerUrl: () => void
  - function isImageUploadEnabled: () => boolean
  - function setImageUploadEnabled: (enabled) => void
  - _...8 more_
- `apps/web/lib/parse-theme-css.ts` — function parseThemeCss: (css) => Record<string, string>
- `apps/worker/src/helpers.ts`
  - function corsHeaders: (request, env) => Record<string, string>
  - function jsonResponse: (body, status, cors, string>) => Response
  - function getExtension: (contentType) => string
  - function checkAuth: (request, env, cors, string>) => Response | null
  - interface Env
  - const MAX_FILE_SIZE
  - _...1 more_
- `packages/db/src/index.ts` — function createDb: (databaseUrl) => void, type Db
- `packages/editor/src/utils/cloudflareUploader.ts` — function createCloudflareUploader: (workerUrl) => void, function createTestImage: () => File
- `packages/editor/src/utils/imageValidation.ts` — function validateImageFile: (file) => ValidationResult, interface ValidationResult
- `packages/editor/src/utils/markdownActions.ts` — function applyToolbarAction: (view, action) => void
- `packages/editor/src/utils/parseMarkdown.ts` — function parseMarkdown: (markdown) => string
- `packages/editor/src/utils/wordCount.ts` — function countWords: (text) => number

---

# Config

## Environment Variables

- `CI` **required** — apps/web/playwright.config.ts
- `CORS_ORIGIN` (has default) — .env.local
- `DATABASE_URL` (has default) — .env.local
- `E2E_BASE_URL` **required** — apps/web/playwright.config.ts
- `E2E_USER_EMAIL` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_USER_PASSWORD` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_WORKSPACE_NAME` **required** — apps/web/tests/e2e/team-management.spec.ts
- `E2E_WORKSPACE_SLUG` **required** — apps/web/tests/e2e/document-management.spec.ts
- `EMAIL_FROM` (has default) — .env.local
- `FRONTEND_URL` (has default) — .env.local
- `HOST` (has default) — .env.local
- `JWT_REFRESH_SECRET` (has default) — .env.local
- `JWT_SECRET` (has default) — .env.local
- `NEXT_PUBLIC_API_URL` **required** — apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx
- `NEXT_PUBLIC_R2_WORKER_URL` **required** — apps/web/lib/image-upload.ts
- `NEXT_PUBLIC_SITE_URL` **required** — apps/web/app/layout.tsx
- `NODE_ENV` (has default) — .env.local
- `PORT` (has default) — .env.local
- `R2_UPLOAD_SECRET` **required** — apps/api/src/routes/upload-token.ts
- `RESEND_API_KEY` **required** — apps/api/src/utils/email.ts
- `TEST_DATABASE_URL` **required** — apps/api/tests/helpers/setup.ts
- `VITEST` **required** — apps/api/src/index.ts

## Config Files

- `apps/demo/next.config.ts`
- `apps/web/next.config.ts`
- `packages/db/drizzle.config.ts`
- `tsconfig.json`

---

# Middleware

## auth
- auth — `apps/api/src/middleware/auth.ts`
- workspace-scope — `apps/api/src/middleware/workspace-scope.ts`
- auth — `apps/api/src/routes/auth.ts`
- auth-service — `apps/api/src/services/auth-service.ts`
- auth-forgot-password.test — `apps/api/tests/integration/auth-forgot-password.test.ts`
- auth-login.test — `apps/api/tests/integration/auth-login.test.ts`
- auth-refresh.test — `apps/api/tests/integration/auth-refresh.test.ts`
- auth-register.test — `apps/api/tests/integration/auth-register.test.ts`
- auth-resend-verification.test — `apps/api/tests/integration/auth-resend-verification.test.ts`
- auth-reset-password.test — `apps/api/tests/integration/auth-reset-password.test.ts`
- auth-verify.test — `apps/api/tests/integration/auth-verify.test.ts`
- auth-store — `apps/web/stores/auth-store.ts`
- auth-workspace-flow.spec — `apps/web/tests/e2e/auth-workspace-flow.spec.ts`

## cors
- csrf — `apps/api/src/middleware/csrf.ts`
- cors — `apps/api/src/plugins/cors.ts`

## custom
- rbac — `apps/api/src/middleware/rbac.ts`

---

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

---

# Test Coverage

> **82%** of routes and models are covered by tests
> 62 test files found

## Covered Routes

- POST:/register
- POST:/login
- POST:/workspaces/:wsId/categories
- GET:/workspaces/:wsId/categories
- GET:/workspaces/:wsId/categories/tree
- PATCH:/workspaces/:wsId/categories/:id
- PUT:/workspaces/:wsId/categories/reorder
- GET:/workspaces/:wsId/categories/:id/ancestors
- GET:/workspaces/:wsId/categories/:id/descendants
- DELETE:/workspaces/:wsId/categories/:id
- GET:/workspaces/:wsId/documents/:docId/comments
- POST:/workspaces/:wsId/documents/:docId/comments
- PATCH:/workspaces/:wsId/documents/:docId/comments/:commentId
- DELETE:/workspaces/:wsId/documents/:docId/comments/:commentId
- POST:/workspaces/:wsId/documents
- GET:/workspaces/:wsId/documents
- GET:/workspaces/:wsId/documents/:id
- PATCH:/workspaces/:wsId/documents/:id
- DELETE:/workspaces/:wsId/documents/:id
- POST:/workspaces/:id/embed-tokens
- GET:/workspaces/:id/embed-tokens
- DELETE:/workspaces/:id/embed-tokens/:tokenId
- GET:/workspaces/:wsId/graph
- GET:/workspaces/:wsId/graph/documents/:id/context
- POST:/workspaces/:id/invitations
- GET:/invitations/:token
- POST:/invitations/:token/accept
- POST:/workspaces/:id/join-requests
- GET:/workspaces/:id/join-requests
- PATCH:/workspaces/:id/join-requests/batch
- PATCH:/workspaces/:id/join-requests/:requestId
- PUT:/workspaces/:wsId/documents/:docId/relations
- GET:/workspaces/:wsId/documents/:docId/relations
- GET:/workspaces/:wsId/documents/:docId/tags
- PUT:/workspaces/:wsId/documents/:docId/tags
- GET:/workspaces/:wsId/tags
- GET:/workspaces/:id/theme
- PATCH:/workspaces/:id/theme
- GET:/workspaces/:wsId/trash
- POST:/workspaces/:wsId/trash/:docId/restore
- DELETE:/workspaces/:wsId/trash/:docId
- GET:/
- GET:/workspaces/public
- POST:/workspaces
- GET:/workspaces
- GET:/workspaces/:id
- PATCH:/workspaces/:id
- DELETE:/workspaces/:id
- POST:/workspaces/:id/transfer
- GET:/workspaces/:id/members
- PATCH:/workspaces/:id/members/:userId
- DELETE:/workspaces/:id/members/:userId

## Covered Models

- categories
- category_closure
- comments
- document_relations
- documents
- document_versions
- embed_tokens
- invitations
- join_requests
- refresh_tokens
- tags
- document_tags
- users
- workspace_members
- workspaces

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_