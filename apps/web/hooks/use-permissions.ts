'use client';

import { useMemo } from 'react';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

interface Permissions {
  canEditWorkspace: boolean;
  canDeleteWorkspace: boolean;
  canTransferOwnership: boolean;
  canInviteMember: boolean;
  canManageJoinRequests: boolean;
  canChangeRole: boolean;
  canRemoveMember: boolean;
  canCreateDocument: boolean;
  canEditDocument: boolean;
  canDeleteDocument: boolean;
  canViewDocument: boolean;
  canCreateCategory: boolean;
  canDeleteCategory: boolean;
  canManageTags: boolean;
  canImportExport: boolean;
}

export function usePermissions(role: string | null | undefined): Permissions {
  return useMemo(() => {
    if (!role) {
      return {
        canEditWorkspace: false,
        canDeleteWorkspace: false,
        canTransferOwnership: false,
        canInviteMember: false,
        canManageJoinRequests: false,
        canChangeRole: false,
        canRemoveMember: false,
        canCreateDocument: false,
        canEditDocument: false,
        canDeleteDocument: false,
        canViewDocument: false,
        canCreateCategory: false,
        canDeleteCategory: false,
        canManageTags: false,
        canImportExport: false,
      };
    }

    const level = ROLE_HIERARCHY[role as Role] ?? 0;

    return {
      canEditWorkspace: level >= ROLE_HIERARCHY.owner,
      canDeleteWorkspace: level >= ROLE_HIERARCHY.owner,
      canTransferOwnership: level >= ROLE_HIERARCHY.owner,
      canInviteMember: level >= ROLE_HIERARCHY.admin,
      canManageJoinRequests: level >= ROLE_HIERARCHY.admin,
      canChangeRole: level >= ROLE_HIERARCHY.admin,
      canRemoveMember: level >= ROLE_HIERARCHY.admin,
      canCreateDocument: level >= ROLE_HIERARCHY.editor,
      canEditDocument: level >= ROLE_HIERARCHY.editor,
      canDeleteDocument: level >= ROLE_HIERARCHY.editor,
      canViewDocument: level >= ROLE_HIERARCHY.viewer,
      canCreateCategory: level >= ROLE_HIERARCHY.editor,
      canDeleteCategory: level >= ROLE_HIERARCHY.editor,
      canManageTags: level >= ROLE_HIERARCHY.editor,
      canImportExport: level >= ROLE_HIERARCHY.editor,
    };
  }, [role]);
}

export function hasMinRole(userRole: string, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
  return userLevel >= ROLE_HIERARCHY[requiredRole];
}
