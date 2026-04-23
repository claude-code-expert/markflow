# markflow — AI Context Map

> **Stack:** next-app | drizzle | react | typescript
> **Monorepo:** @markflow/db, @markflow/editor, @markflow/web, markflow-r2-uploader

> 64 routes | 15 models | 85 components | 39 lib files | 21 env vars | 4 middleware | 6% test coverage
> **Token savings:** this file is ~8,500 tokens. Without it, AI exploration would cost ~89,800 tokens. **Saves ~81,200 tokens per conversation.**
> **Last scanned:** 2026-04-23 10:34 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/api/v1/workspaces/[id]/documents/[docId]`** GET | PATCH/:id | DELETE/:id → [docId]
- **`/api/v1/workspaces/[id]`** GET | PATCH/:id | DELETE/:id → [id]

## Other Routes

- `GET` `/api/cron/cleanup-trash` → out: { error } [auth, db]
- `POST` `/api/v1/auth/forgot-password` [auth]
- `POST` `/api/v1/auth/login` → out: { accessToken, user } [auth]
- `POST` `/api/v1/auth/logout` [auth, db]
- `POST` `/api/v1/auth/refresh` [auth]
- `POST` `/api/v1/auth/register` [auth]
- `POST` `/api/v1/auth/resend-verification` [auth, email]
- `POST` `/api/v1/auth/reset-password` [auth]
- `GET` `/api/v1/auth/verify-email` [auth]
- `POST` `/api/v1/invitations/[token]/accept` params(token) [auth]
- `GET` `/api/v1/invitations/[token]` params(token) → out: { invitation } [auth]
- `GET` `/api/v1/upload-token` → out: { token } [auth, upload]
- `PUT` `/api/v1/users/me/password` → out: { accessToken, refreshToken } [auth]
- `GET` `/api/v1/users/me` → out: { user } [db]
- `PATCH` `/api/v1/users/me` → out: { user } [db]
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/ancestors` params(id, catId) → out: { ancestors }
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/descendants` params(id, catId)
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/export` params(id, catId)
- `PATCH` `/api/v1/workspaces/[id]/categories/[catId]` params(id, catId) → out: { category }
- `DELETE` `/api/v1/workspaces/[id]/categories/[catId]` params(id, catId) → out: { category }
- `PUT` `/api/v1/workspaces/[id]/categories/reorder` params(id) → out: { ok }
- `GET` `/api/v1/workspaces/[id]/categories` params(id) → out: { categories }
- `POST` `/api/v1/workspaces/[id]/categories` params(id) → out: { categories }
- `GET` `/api/v1/workspaces/[id]/categories/tree` params(id)
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/comments` params(id, docId) → out: { comments }
- `POST` `/api/v1/workspaces/[id]/documents/[docId]/comments` params(id, docId) → out: { comments }
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/export` params(id, docId)
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/relations` params(id, docId)
- `PUT` `/api/v1/workspaces/[id]/documents/[docId]/relations` params(id, docId)
- `POST` `/api/v1/workspaces/[id]/documents/[docId]/restore-version` params(id, docId)
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/tags` params(id, docId) → out: { tags }
- `PUT` `/api/v1/workspaces/[id]/documents/[docId]/tags` params(id, docId) → out: { tags }
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/versions` params(id, docId) → out: { versions }
- `GET` `/api/v1/workspaces/[id]/documents` params(id) → out: { document }
- `POST` `/api/v1/workspaces/[id]/documents` params(id) → out: { document }
- `DELETE` `/api/v1/workspaces/[id]/embed-tokens/[tokenId]` params(id, tokenId) [auth]
- `GET` `/api/v1/workspaces/[id]/embed-tokens` params(id) [auth]
- `POST` `/api/v1/workspaces/[id]/embed-tokens` params(id) [auth]
- `GET` `/api/v1/workspaces/[id]/graph` params(id)
- `POST` `/api/v1/workspaces/[id]/import` params(id) → out: { imported, documents, title, categoryId } [upload]
- `POST` `/api/v1/workspaces/[id]/invitations` params(id) → out: { invitation }
- `PATCH` `/api/v1/workspaces/[id]/join-requests/[requestId]` params(id, requestId) → out: { success }
- `PATCH` `/api/v1/workspaces/[id]/join-requests/batch` params(id)
- `GET` `/api/v1/workspaces/[id]/join-requests` params(id) → out: { joinRequest }
- `POST` `/api/v1/workspaces/[id]/join-requests` params(id) → out: { joinRequest }
- `PATCH` `/api/v1/workspaces/[id]/members/[userId]` params(id, userId) → out: { member }
- `DELETE` `/api/v1/workspaces/[id]/members/[userId]` params(id, userId) → out: { member }
- `GET` `/api/v1/workspaces/[id]/members` params(id) → out: { members }
- `GET` `/api/v1/workspaces/[id]/tags` params(id) → out: { tags }
- `GET` `/api/v1/workspaces/[id]/theme` params(id)
- `PATCH` `/api/v1/workspaces/[id]/theme` params(id)
- `POST` `/api/v1/workspaces/[id]/transfer` params(id) → out: { transferred }
- `POST` `/api/v1/workspaces/[id]/trash/[docId]/restore` params(id, docId) → out: { document }
- `DELETE` `/api/v1/workspaces/[id]/trash/[docId]` params(id, docId)
- `GET` `/api/v1/workspaces/[id]/trash` params(id) → out: { documents }
- `GET` `/api/v1/workspaces/public`
- `GET` `/api/v1/workspaces` → out: { workspaces }
- `POST` `/api/v1/workspaces` → out: { workspaces }

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
- status: varchar (default, required)
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
- **CTASection** — `apps/web/components/landing/cta-section.tsx`
- **Differentiators** — `apps/web/components/landing/differentiators.tsx`
- **FAQ** — `apps/web/components/landing/faq.tsx`
- **FeaturesGrid** — `apps/web/components/landing/features-grid.tsx`
- **Footer** — `apps/web/components/landing/footer.tsx`
- **Hero** — `apps/web/components/landing/hero.tsx`
- **HowItWorks** — `apps/web/components/landing/how-it-works.tsx`
- **NavBar** — `apps/web/components/landing/nav-bar.tsx`
- **PainPoints** — `apps/web/components/landing/pain-points.tsx`
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
- `apps/web/lib/date.ts`
  - function formatKstDate: (value) => string
  - function formatKstDateTime: (value) => string
  - function formatKstDateWithOptions: (value, options) => string
  - function formatKstRelative: (value, fallbackAfterDays) => string
  - function formatKstRelativeLong: (value) => string
- `apps/web/lib/image-upload.ts`
  - function getWorkerUrl: () => string
  - function getUploadConfig: () => ImageUploadConfig
  - function saveWorkerUrl: (url) => void
  - function clearWorkerUrl: () => void
  - function isImageUploadEnabled: () => boolean
  - function setImageUploadEnabled: (enabled) => void
  - _...8 more_
- `apps/web/lib/parse-theme-css.ts` — function parseThemeCss: (css) => Record<string, string>
- `apps/web/lib/server/db.ts` — function getDb: () => Db
- `apps/web/lib/server/middleware.ts`
  - function extractCurrentUser: (request) => CurrentUser
  - function checkRole: (currentUser, workspaceId, ...allowedRoles) => Promise<WorkspaceMember>
  - function handleApiError: (error) => NextResponse
  - interface CurrentUser
  - interface WorkspaceMember
  - interface ApiContext
- `apps/web/lib/server/services/auth-service.ts` — function createAuthService: (db) => void
- `apps/web/lib/server/services/category-service.ts`
  - function createCategoryService: (db) => void
  - interface CategoryTreeDocument
  - interface CategoryTreeNode
- `apps/web/lib/server/services/comment-service.ts` — function createCommentService: (db) => void
- `apps/web/lib/server/services/document-service.ts` — function createDocumentService: (db) => void, type DocumentStatus
- `apps/web/lib/server/services/document-visibility.ts` — function draftVisibilityClause: (currentUserId?) => SQL
- `apps/web/lib/server/services/embed-token-service.ts` — function createEmbedTokenService: (db) => void
- `apps/web/lib/server/services/export-service.ts` — function createExportService: (db) => void
- `apps/web/lib/server/services/graph-service.ts` — function createGraphService: (db) => void
- `apps/web/lib/server/services/import-service.ts` — function createImportService: (db) => void
- `apps/web/lib/server/services/invitation-service.ts` — function createInvitationService: (db) => void
- `apps/web/lib/server/services/join-request-service.ts` — function createJoinRequestService: (db) => void
- `apps/web/lib/server/services/member-service.ts` — function createMemberService: (db) => void
- `apps/web/lib/server/services/relation-service.ts` — function createRelationService: (db) => void
- `apps/web/lib/server/services/tag-service.ts` — function createTagService: (db) => void
- `apps/web/lib/server/services/theme-service.ts` — function createThemeService: (db) => void
- `apps/web/lib/server/services/trash-service.ts` — function createTrashService: (db) => void
- `apps/web/lib/server/services/workspace-service.ts` — function createWorkspaceService: (db) => void
- `apps/web/lib/server/utils/css-validator.ts` — function validateThemeCss: (css) => ValidationResult
- `apps/web/lib/server/utils/email.ts`
  - function sendEmail: (params) => Promise<void>
  - function verificationEmailHtml: (verifyUrl) => string
  - function passwordResetEmailHtml: (resetUrl) => string
  - function invitationEmailHtml: (inviteUrl, workspaceName, inviterName) => string
  - const FRONTEND_URL
- `apps/web/lib/server/utils/errors.ts`
  - function notFound: (message) => AppError
  - function forbidden: (message) => AppError
  - function unauthorized: (message) => AppError
  - function badRequest: (code, message, details?, unknown>) => AppError
  - function conflict: (code, message) => AppError
  - function gone: (code, message) => AppError
  - _...2 more_
- `apps/web/lib/server/utils/html.ts` — function escapeHtml: (str) => string
- `apps/web/lib/server/utils/jwt.ts`
  - function signAccessToken: (payload) => string
  - function signRefreshToken: (payload, rememberMe) => string
  - function signTokenPair: (payload, rememberMe) => TokenPair
  - function verifyAccessToken: (token) => TokenPayload
  - function verifyRefreshToken: (token) => TokenPayload
  - function getRefreshTokenExpiry: (rememberMe) => Date
- `apps/web/lib/server/utils/password.ts`
  - function hashPassword: (password) => Promise<string>
  - function comparePassword: (password, hash) => Promise<boolean>
  - function validatePassword: (password) => void
- `apps/worker/src/helpers.ts`
  - function corsHeaders: (request, env) => Record<string, string>
  - function jsonResponse: (body, status, cors, string>) => Response
  - function getExtension: (contentType) => string
  - function checkAuth: (request, env, cors, string>) => Response | null
  - interface Env
  - const MAX_FILE_SIZE
  - _...1 more_
- `docs/sample/markflow-pdf-export.ts` — function markdownToPdf: (opts) => Promise<Buffer>, function pdfExportRoute: (app) => void
- `packages/db/src/index.ts` — function createDb: (databaseUrl, options?) => void, type Db
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
- `CRON_SECRET` **required** — apps/web/app/api/cron/cleanup-trash/route.ts
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
- `NEXT_PUBLIC_R2_WORKER_URL` **required** — apps/web/lib/image-upload.ts
- `NEXT_PUBLIC_SITE_URL` **required** — apps/web/app/layout.tsx
- `NODE_ENV` (has default) — .env.local
- `PGHOST` (has default) — .env.local
- `PORT` (has default) — .env.local
- `R2_UPLOAD_SECRET` **required** — apps/web/app/api/v1/upload-token/route.ts
- `RESEND_API_KEY` **required** — apps/web/lib/server/utils/email.ts

## Config Files

- `apps/web/next.config.ts`
- `packages/db/drizzle.config.ts`
- `tsconfig.json`

---

# Middleware

## auth
- middleware — `apps/web/lib/server/middleware.ts`
- auth-service — `apps/web/lib/server/services/auth-service.ts`
- auth-store — `apps/web/stores/auth-store.ts`
- auth-workspace-flow.spec — `apps/web/tests/e2e/auth-workspace-flow.spec.ts`

---

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

---

# Test Coverage

> **6%** of routes and models are covered by tests
> 25 test files found

## Covered Models

- comments
- documents
- invitations
- users
- workspaces

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_