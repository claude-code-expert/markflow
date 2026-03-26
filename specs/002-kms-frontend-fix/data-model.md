# Data Model: KMS 프론트엔드 버그 수정 및 UI 재정비

**Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)

> 이 문서는 프론트엔드에서 사용하는 데이터 모델(TypeScript 타입)을 정의한다.
> 백엔드 DB 스키마(`packages/db`)는 변경하지 않으며, API 응답을 프론트엔드에서 소비하는 형태를 문서화한다.

## 1. 핵심 엔티티

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}
```

**사용처**: auth-store, 사이드바 프로필, 멤버 목록
**API 소스**: `GET /users/me` → `{ user: User }`

### Workspace

```typescript
interface Workspace {
  id: string;
  name: string;
  slug: string;
  isRoot: boolean;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  role: WorkspaceRole; // 현재 사용자의 역할
  lastActivityAt?: string;
}

type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
```

**사용처**: workspace-store, 워크스페이스 목록, 사이드바 셀렉터, 설정 페이지
**API 소스**: `GET /workspaces` → `{ workspaces: Workspace[] }`

### Document

```typescript
interface Document {
  id: string;
  workspaceId: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  categoryId: string | null;
  currentVersion: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**사용처**: 문서 목록, 에디터, 휴지통
**API 소스**: `GET /workspaces/:wsId/documents` → `{ documents: Document[], total: number, page: number }`

### Category (폴더)

```typescript
interface Category {
  id: string;
  workspaceId: string;
  name: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
}
```

**사용처**: 사이드바 폴더 트리, 문서 생성 모달, 문서 목록 필터
**API 소스**: `GET /workspaces/:wsId/categories` → `{ categories: Category[] }`

### Tag

```typescript
interface Tag {
  id: string;
  workspaceId: string;
  name: string;
}
```

**사용처**: 문서 목록 필터, 태그 입력
**API 소스**: `GET /workspaces/:wsId/tags` → `{ tags: Tag[] }`

### WorkspaceMember

```typescript
interface WorkspaceMember {
  id: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
}
```

**사용처**: 멤버 관리 페이지
**API 소스**: `GET /workspaces/:id/members` → `{ members: WorkspaceMember[] }`

### Invitation

```typescript
interface Invitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  email: string;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}
```

**사용처**: 멤버 초대
**API 소스**: `POST /workspaces/:id/invitations` → `{ invitation: Invitation }`

---

## 2. API 응답 래퍼 타입

```typescript
// 목록 응답
interface WorkspacesResponse {
  workspaces: Workspace[];
}

interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
}

interface CategoriesResponse {
  categories: Category[];
}

interface TagsResponse {
  tags: Tag[];
}

interface MembersResponse {
  members: WorkspaceMember[];
}

// 단일 응답
interface WorkspaceResponse {
  workspace: Workspace;
}

interface DocumentResponse {
  document: Document;
}

interface CategoryResponse {
  category: Category;
}

// 인증 응답
interface LoginResponse {
  accessToken: string;
  user: User;
}

interface UserResponse {
  user: User;
}
```

---

## 3. 클라이언트 상태 (Zustand Stores)

### AuthState

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login(email: string, password: string, rememberMe?: boolean): Promise<void>;
  logout(): Promise<void>;
  fetchUser(): Promise<void>;
  setUser(user: User | null): void;
}
```

**상태 전이**:
- 초기: `{ user: null, isLoading: true, isAuthenticated: false }`
- 인증 시도: `fetchUser()` → GET /users/me
  - 성공: `{ user: {...}, isLoading: false, isAuthenticated: true }`
  - 실패: `{ user: null, isLoading: false, isAuthenticated: false }` → /login 리다이렉트

### WorkspaceState

```typescript
interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  fetchWorkspaces(): Promise<void>;
  setCurrentWorkspace(ws: Workspace | null): void;
}
```

**상태 전이**:
- 초기: `{ workspaces: [], currentWorkspace: null, isLoading: true }`
- 로딩 완료: `{ workspaces: [...], isLoading: false }`
- 워크스페이스 진입: `setCurrentWorkspace(ws)`

### EditorState

```typescript
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorState {
  documentId: string | null;
  content: string;
  title: string;
  saveStatus: SaveStatus;
  setDocument(id: string, title: string, content: string): void;
  setContent(content: string): void;
  setTitle(title: string): void;
  setSaveStatus(status: SaveStatus): void;
  reset(): void;
}
```

**상태 전이**:
- 문서 로드: `setDocument()` → `saveStatus: 'saved'`
- 편집: `setContent()` → `saveStatus: 'unsaved'`
- 저장 시작: `setSaveStatus('saving')`
- 저장 완료: `setSaveStatus('saved')`
- 저장 실패: `setSaveStatus('error')`

### SidebarState

```typescript
interface SidebarState {
  expandedCategoryIds: Set<string>;
  isSidebarOpen: boolean;
  toggleCategory(id: string): void;
  toggleSidebar(): void;
  expandCategory(id: string): void;
  collapseCategory(id: string): void;
}
```

---

## 4. 라우팅 파라미터

| Route | Params | Source |
|-------|--------|--------|
| `/(app)/page.tsx` | — | 워크스페이스 목록 (루트) |
| `/(app)/[workspaceSlug]/...` | `workspaceSlug: string` | URL path segment |
| `/(app)/[workspaceSlug]/docs/[docId]/page.tsx` | `docId: string` | URL path segment |

**중요**: `workspaceSlug`는 워크스페이스의 `slug` 필드와 일치해야 한다. `undefined`가 되면 `/undefined` 라우팅 버그 발생.

---

## 5. 외부 패키지 인터페이스

### @markflow/editor (workspace:*)

에디터 페이지(US3)에서 사용하는 마크다운 에디터 컴포넌트.

```typescript
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

// 주요 Props
interface MarkdownEditorProps {
  value?: string;              // Controlled mode
  defaultValue?: string;       // Uncontrolled mode
  onChange?: (value: string) => void;
  layout?: 'split' | 'editor' | 'preview';  // default: 'split'
  theme?: 'light' | 'dark';
  height?: string;             // CSS height (e.g., "calc(100vh - 56px)")
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}
```

**apps/web에서의 사용 패턴**: Controlled mode (`value` + `onChange`)로 editor-store와 연동. `onChange` 콜백에서 `setContent()`를 호출하여 자동 저장 디바운스 트리거.

## 6. 데이터 검증 규칙 (프론트엔드)

| Field | Rule | Where |
|-------|------|-------|
| 이메일 | RFC 5322 형식 | 로그인/회원가입 폼 |
| 비밀번호 | 8자 이상, 영문+숫자+특수문자 | 회원가입 폼 |
| 워크스페이스 이름 | 1~100자 | 워크스페이스 생성 모달 |
| 워크스페이스 slug | 영문 소문자+숫자+하이픈, 고유 | 워크스페이스 생성 모달 |
| 문서 제목 | 1~300자 | 문서 생성 모달 |
| 카테고리 이름 | 1~100자 | 폴더 생성 모달 |
