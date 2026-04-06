// MarkFlow KMS API Response Types
// TypeScript strict mode — `any` type is forbidden.

// === Entity Types ===

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: number;
  name: string;
  isRoot: boolean;
  isPublic: boolean;
  ownerId: number;
  themePreset: string;
  themeCss: string;
  createdAt: string;
  updatedAt: string;
  role: WorkspaceRole;
  lastActivityAt?: string;
}

export interface Document {
  id: number;
  workspaceId: number;
  authorId: number;
  title: string;
  slug: string;
  content: string;
  categoryId: number | null;
  currentVersion: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Category {
  id: number;
  workspaceId: number;
  name: string;
  parentId: number | null;
  depth: number;
  createdAt: string;
}

export interface Tag {
  id: number;
  workspaceId: number;
  name: string;
}

export interface WorkspaceMember {
  id: number;
  userId: number;
  role: WorkspaceRole;
  joinedAt: string;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
}

export interface Invitation {
  id: number;
  workspaceId: number;
  inviterId: number;
  email: string;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

// === API Response Wrapper Types ===

// Auth
export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface UserResponse {
  user: User;
}

// Workspaces
export interface WorkspacesResponse {
  workspaces: Workspace[];
}

export interface WorkspaceResponse {
  workspace: Workspace & { memberCount?: number };
}

export interface CreateWorkspaceResponse {
  workspace: Workspace;
}

// Documents
export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
}

export interface DocumentResponse {
  document: Document;
}

// Categories
export interface CategoriesResponse {
  categories: Category[];
}

export interface CategoryResponse {
  category: Category;
}

// Tags
export interface TagsResponse {
  tags: Tag[];
}

// Members
export interface MembersResponse {
  members: WorkspaceMember[];
}

export interface MemberResponse {
  member: {
    id: number;
    workspaceId: number;
    userId: number;
    role: WorkspaceRole;
    joinedAt: string;
  };
}

// Invitations
export interface InvitationResponse {
  invitation: Invitation;
}

export interface InvitationAcceptResponse {
  workspaceId: number;
  role: WorkspaceRole;
}

// Trash
export interface TrashResponse {
  documents: Document[];
}

export interface RestoreResponse {
  document: Document;
}

// API Error
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Save status for editor
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
