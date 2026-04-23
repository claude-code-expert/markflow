# UI

> **Navigation aid.** Component inventory and prop signatures extracted via AST. Read the source files before adding props or modifying component logic.

**85 components** (react)

## Client Components

- **DocEditorPage** — `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/page.tsx`
- **NewDocPage** — `apps/web/app/(app)/[workspaceSlug]/doc/new/page.tsx`
- **DocsPage** — `apps/web/app/(app)/[workspaceSlug]/doc/page.tsx`
- **GraphPage** — `apps/web/app/(app)/[workspaceSlug]/graph/page.tsx`
- **WorkspaceLayout** — `apps/web/app/(app)/[workspaceSlug]/layout.tsx`
- **WorkspaceHomePage** — `apps/web/app/(app)/[workspaceSlug]/page.tsx`
- **EmbedSettingsPage** — `apps/web/app/(app)/[workspaceSlug]/settings/embed/page.tsx`
- **MembersPage** — `apps/web/app/(app)/[workspaceSlug]/settings/members/page.tsx`
- **WorkspaceSettingsPage** — `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx`
- **StorageSettingsPage** — `apps/web/app/(app)/[workspaceSlug]/settings/storage/page.tsx`
- **ThemeSettingsPage** — `apps/web/app/(app)/[workspaceSlug]/settings/theme/page.tsx`
- **TrashPage** — props: params — `apps/web/app/(app)/[workspaceSlug]/trash/page.tsx`
- **AppLayout** — `apps/web/app/(app)/layout.tsx`
- **WorkspaceListPage** — `apps/web/app/(app)/workspaces/page.tsx`
- **ForgotPasswordPage** — `apps/web/app/(auth)/forgot-password/page.tsx`
- **LoginPage** — `apps/web/app/(auth)/login/page.tsx`
- **RegisterPage** — `apps/web/app/(auth)/register/page.tsx`
- **ResetPasswordPage** — props: searchParams — `apps/web/app/(auth)/reset-password/page.tsx`
- **VerifyEmailPage** — props: searchParams — `apps/web/app/(auth)/verify-email/page.tsx`
- **RootPage** — `apps/web/app/(public)/page.tsx`
- **InviteAcceptPage** — props: params — `apps/web/app/invite/[token]/page.tsx`
- **PresentPage** — `apps/web/app/present/[workspaceSlug]/[docId]/page.tsx`
- **Providers** — `apps/web/app/providers.tsx`
- **AppHeader** — props: onSearchClick, onNewDoc — `apps/web/components/app-header.tsx`
- **CategoryTree** — props: categories, workspaceSlug, currentCategoryId, currentDocId, onContextMenu, onDocContextMenu, onReorder, onMoveDoc, basePl, indentPx — `apps/web/components/category-tree.tsx`
- **CommentPanel** — props: workspaceId, documentId, onClose — `apps/web/components/comment-panel.tsx`
- **ConfirmModal** — props: open, onClose, onConfirm, title, message, confirmLabel, cancelLabel, isLoading, variant — `apps/web/components/confirm-modal.tsx`
- **CreateWorkspaceModal** — props: open, onClose — `apps/web/components/create-workspace-modal.tsx`
- **DagStructureModal** — props: open, onClose, nodes, edges, currentDocId, currentTitle, categoryName, workspaceSlug, onEditLinks — `apps/web/components/dag-structure-modal.tsx`
- **DocContextMenu** — props: doc, workspaceSlug, workspaceId, position, onClose, onRefresh — `apps/web/components/doc-context-menu.tsx`
- **DocumentLinksModal** — props: open, onClose, workspaceId, documentId, onSaved — `apps/web/components/document-links-modal.tsx`
- **DocumentMetaPanel** — props: doc, workspaceSlug, workspaceId, role, onClose — `apps/web/components/document-meta-panel.tsx`
- **FolderContextMenu** — props: category, workspaceSlug, workspaceId, position, onClose, onNewDoc, onRefresh — `apps/web/components/folder-context-menu.tsx`
- **GraphPreviewModal** — props: open, onClose, workspaceSlug, doc — `apps/web/components/graph-preview-modal.tsx`
- **ImportExportModal** — props: open, onClose, workspaceId, workspaceSlug, currentDocId, currentCategoryId — `apps/web/components/import-export-modal.tsx`
- **JoinRequestPanel** — props: onRequestSent — `apps/web/components/join-request-panel.tsx`
- **LinkPreview** — props: containerRef, workspaceId — `apps/web/components/link-preview.tsx`
- **MindMapCanvas** — props: nodes, edges, categories, selectedDocId, onSelectDoc, onRightClickDoc, tagLinks, dark — `apps/web/components/mind-map-canvas.tsx`
- **MiniDagDiagram** — props: currentTitle, categoryName, prev, next, related, onClickFullView — `apps/web/components/mini-dag-diagram.tsx`
- **NewDocModal** — props: open, onClose, workspaceSlug, workspaceId, categories — `apps/web/components/new-doc-modal.tsx`
- **NewFolderModal** — props: open, onClose, workspaceId, categories, defaultParentId, onCreated — `apps/web/components/new-folder-modal.tsx`
- **PasswordChangeModal** — props: isOpen, onClose — `apps/web/components/password-change-modal.tsx`
- **PresentationMode** — props: open, onClose, content, title — `apps/web/components/presentation-mode.tsx`
- **ProfileEditModal** — props: open, onClose — `apps/web/components/profile-edit-modal.tsx`
- **SearchModal** — props: open, onClose — `apps/web/components/search-modal.tsx`
- **InviteStatusTab** — props: workspaceId — `apps/web/components/settings/invite-status-tab.tsx`
- **MemberExportTab** — `apps/web/components/settings/member-export-tab.tsx`
- **EmptyState** — props: icon, title, description, actionLabel, onAction — `apps/web/components/states/empty.tsx`
- **ErrorState** — props: title, message, onRetry, onNavigateHome — `apps/web/components/states/error.tsx`
- **StorageGuidePanel** — props: onClose, onConfigured — `apps/web/components/storage-guide-panel.tsx`
- **TagInput** — props: workspaceSlug, workspaceId, documentId, initialTags, disabled — `apps/web/components/tag-input.tsx`
- **ToastProvider** — `apps/web/components/toast-provider.tsx`
- **VersionHistoryModal** — props: open, onClose, workspaceId, documentId, currentContent, hasUnsavedChanges, onRestore — `apps/web/components/version-history-modal.tsx`
- **VersionHistoryPanel** — props: open, onClose, workspaceId, documentId, currentContent, onOpenFullModal, onRestore — `apps/web/components/version-history-panel.tsx`

## Components

- **DocLayout** — props: params — `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx`
- **AuthLayout** — `apps/web/app/(auth)/layout.tsx`
- **LoginLayout** — `apps/web/app/(auth)/login/layout.tsx`
- **RegisterLayout** — `apps/web/app/(auth)/register/layout.tsx`
- **VerifyEmailLayout** — `apps/web/app/(auth)/verify-email/layout.tsx`
- **PublicLayout** — `apps/web/app/(public)/layout.tsx`
- **InviteLayout** — `apps/web/app/invite/layout.tsx`
- **RootLayout** — `apps/web/app/layout.tsx`
- **OGImage** — `apps/web/app/opengraph-image.tsx`
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
- **MarkFlowLogo** — props: height, showTagline, dark — `apps/web/components/mark-flow-logo.tsx`
- **Skeleton** — props: width, height, borderRadius — `apps/web/components/states/loading.tsx`
- **WorkspaceListSkeleton** — `apps/web/components/states/loading.tsx`
- **DocumentListSkeleton** — `apps/web/components/states/loading.tsx`
- **EditorSkeleton** — `apps/web/components/states/loading.tsx`
- **WikiPage** — `docs/seo/page.tsx`
- **MarkdownEditor** — props: value, defaultValue, onChange, layoutProp, themeProp, height, placeholder, readOnly, className, themeVars — `packages/editor/src/MarkdownEditor.tsx`
- **EditorPane** — props: value, onChange, theme, placeholder, readOnly, onScrollRatio, onImageFile, onWikiLinkSearch — `packages/editor/src/editor/EditorPane.tsx`
- **PreviewPane** — props: markdown, scrollRatio, onScrollRatio — `packages/editor/src/preview/PreviewPane.tsx`
- **ImageUploadGuide** — props: isOpen, onClose, onGoToSettings — `packages/editor/src/toolbar/ImageUploadGuide.tsx`
- **SettingsModal** — props: isOpen, onClose, onSave — `packages/editor/src/toolbar/SettingsModal.tsx`
- **Toolbar** — props: onAction, layout, onLayoutChange, theme, onThemeChange, onSettingsClick, onImageUploadClick, hasImageUpload — `packages/editor/src/toolbar/Toolbar.tsx`

---
_Back to [overview.md](./overview.md)_