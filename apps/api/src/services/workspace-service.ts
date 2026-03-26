import {
  workspaces,
  workspaceMembers,
  users,
  eq,
  and,
  count,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, conflict, notFound } from '../utils/errors.js';

export function createWorkspaceService(db: Db) {
  async function create(userId: string, name: string, slug: string) {
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw conflict('SLUG_EXISTS', 'A workspace with this slug already exists');
    }

    const inserted = await db
      .insert(workspaces)
      .values({
        name,
        slug,
        isPublic: true,
        ownerId: userId,
      })
      .returning();

    const workspace = inserted[0];
    if (!workspace) {
      throw new Error('Failed to create workspace');
    }

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    });

    return workspace;
  }

  async function getById(workspaceId: string) {
    const found = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const workspace = found[0];
    if (!workspace) {
      throw notFound('Workspace not found');
    }

    const memberCountResult = await db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    const memberCount = memberCountResult[0]?.value ?? 0;

    return { ...workspace, memberCount };
  }

  async function listForUser(userId: string) {
    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isRoot: workspaces.isRoot,
        isPublic: workspaces.isPublic,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isRoot: row.isRoot,
      isPublic: row.isPublic,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role,
      lastActivityAt: row.updatedAt,
    }));
  }

  async function update(workspaceId: string, data: { name?: string; isPublic?: boolean }) {
    const updates: { name?: string; isPublic?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updates.name = data.name;
    }
    if (data.isPublic !== undefined) {
      updates.isPublic = data.isPublic;
    }

    const updated = await db
      .update(workspaces)
      .set(updates)
      .where(eq(workspaces.id, workspaceId))
      .returning();

    const workspace = updated[0];
    if (!workspace) {
      throw notFound('Workspace not found');
    }

    return workspace;
  }

  async function remove(workspaceId: string, confirmName: string) {
    const found = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const workspace = found[0];
    if (!workspace) {
      throw notFound('Workspace not found');
    }

    if (workspace.isRoot) {
      throw badRequest('CANNOT_DELETE_ROOT', 'Cannot delete the root workspace');
    }

    if (workspace.name !== confirmName) {
      throw badRequest('NAME_MISMATCH', 'Confirmation name does not match workspace name');
    }

    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  }

  async function transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ) {
    // Verify new owner is an admin
    const [newOwnerMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, newOwnerId),
        ),
      )
      .limit(1);

    if (!newOwnerMember) {
      throw notFound('Target user is not a member of this workspace');
    }

    if (newOwnerMember.role !== 'admin') {
      throw badRequest('NOT_ADMIN', 'New owner must be an admin');
    }

    // Demote current owner to admin
    await db
      .update(workspaceMembers)
      .set({ role: 'admin' })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, currentOwnerId),
        ),
      );

    // Promote new owner
    await db
      .update(workspaceMembers)
      .set({ role: 'owner' })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, newOwnerId),
        ),
      );

    // Update workspace ownerId
    await db
      .update(workspaces)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));
  }

  return { create, getById, listForUser, update, remove, transferOwnership };
}
