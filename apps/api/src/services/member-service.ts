import {
  workspaceMembers,
  users,
  eq,
  and,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, notFound } from '../utils/errors.js';

type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export function createMemberService(db: Db) {
  async function list(workspaceId: string) {
    const rows = await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return rows;
  }

  async function updateRole(workspaceId: string, targetUserId: string, newRole: MemberRole) {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!member) {
      throw notFound('Member not found');
    }

    if (member.role === 'owner') {
      throw badRequest('CANNOT_CHANGE_OWNER_ROLE', 'Cannot change the owner role directly. Use ownership transfer instead.');
    }

    const updated = await db
      .update(workspaceMembers)
      .set({ role: newRole as 'owner' | 'admin' | 'editor' | 'viewer' })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .returning();

    return updated[0];
  }

  async function remove(workspaceId: string, targetUserId: string, requesterId: string) {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!member) {
      throw notFound('Member not found');
    }

    if (member.role === 'owner' && targetUserId === requesterId) {
      throw badRequest('CANNOT_REMOVE_OWNER', 'Owner cannot remove themselves. Transfer ownership first.');
    }

    if (member.role === 'owner') {
      throw badRequest('CANNOT_REMOVE_OWNER', 'Cannot remove the workspace owner');
    }

    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );
  }

  return { list, updateRole, remove };
}
