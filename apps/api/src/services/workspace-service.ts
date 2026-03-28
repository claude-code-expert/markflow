import {
  workspaces,
  workspaceMembers,
  joinRequests,
  users,
  eq,
  and,
  count,
  ilike,
  or,
  sql,
  notInArray,
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

  async function update(workspaceId: string, data: { name?: string; slug?: string; isPublic?: boolean }) {
    const updates: { name?: string; slug?: string; isPublic?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updates.name = data.name;
    }
    if (data.slug !== undefined) {
      const existing = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, data.slug))
        .limit(1);
      if (existing[0] && existing[0].id !== workspaceId) {
        throw badRequest('SLUG_EXISTS', 'This URL is already in use');
      }
      updates.slug = data.slug;
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

  async function listPublicWorkspaces(userId: string, query: string, page: number, limit: number) {
    // Get workspace IDs where user is already a member
    const memberRows = await db
      .select({ wsId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId));
    const memberWsIds = memberRows.map((r) => r.wsId);

    // Build conditions: public + not a member
    const conditions = [eq(workspaces.isPublic, true)];
    if (memberWsIds.length > 0) {
      conditions.push(notInArray(workspaces.id, memberWsIds));
    }
    if (query.trim()) {
      conditions.push(
        or(
          ilike(workspaces.name, `%${query}%`),
          ilike(workspaces.slug, `%${query}%`),
        )!,
      );
    }

    const where = and(...conditions)!;

    // Count total
    const totalResult = await db
      .select({ value: count() })
      .from(workspaces)
      .where(where);
    const total = Number(totalResult[0]?.value ?? 0);

    // Fetch page
    const rows = await db
      .select()
      .from(workspaces)
      .where(where)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(workspaces.name);

    // Get member counts + pending requests
    const results = await Promise.all(
      rows.map(async (ws) => {
        const mcResult = await db
          .select({ value: count() })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, ws.id));
        const memberCount = Number(mcResult[0]?.value ?? 0);

        const pendingResult = await db
          .select({ value: count() })
          .from(joinRequests)
          .where(
            and(
              eq(joinRequests.workspaceId, ws.id),
              eq(joinRequests.userId, userId),
              eq(joinRequests.status, 'pending'),
            ),
          );
        const pendingRequest = Number(pendingResult[0]?.value ?? 0) > 0;

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          memberCount,
          isPublic: ws.isPublic,
          pendingRequest,
        };
      }),
    );

    return { workspaces: results, total, page, limit };
  }

  return { create, getById, listForUser, listPublicWorkspaces, update, remove, transferOwnership };
}
