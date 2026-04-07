import {
  workspaces,
  workspaceMembers,
  documents,
  categories,
  joinRequests,
  eq,
  and,
  count,
  ilike,
  inArray,
  notInArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, notFound } from '../utils/errors.js';

export function createWorkspaceService(db: Db) {
  async function create(userId: string, name: string) {
    const numUserId = Number(userId);

    const inserted = await db
      .insert(workspaces)
      .values({
        name,
        isPublic: true,
        ownerId: numUserId,
      })
      .returning();

    const workspace = inserted[0];
    if (!workspace) {
      throw new Error('Failed to create workspace');
    }

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: numUserId,
      role: 'owner',
    });

    return workspace;
  }

  async function getById(workspaceId: string) {
    const numWorkspaceId = Number(workspaceId);
    const found = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, numWorkspaceId))
      .limit(1);

    const workspace = found[0];
    if (!workspace) {
      throw notFound('Workspace not found');
    }

    const memberCountResult = await db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, numWorkspaceId));

    const memberCount = memberCountResult[0]?.value ?? 0;

    return { ...workspace, memberCount };
  }

  async function listForUser(userId: string) {
    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        isRoot: workspaces.isRoot,
        isPublic: workspaces.isPublic,
        ownerId: workspaces.ownerId,
        themePreset: workspaces.themePreset,
        themeCss: workspaces.themeCss,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, Number(userId)));

    // Batch-fetch document & category counts (parallel, filtered to user's workspaces)
    const wsIds = rows.map((r) => r.id);

    const [docCounts, catCounts] = wsIds.length > 0
      ? await Promise.all([
          db.select({ workspaceId: documents.workspaceId, value: count() })
            .from(documents)
            .where(and(eq(documents.isDeleted, false), inArray(documents.workspaceId, wsIds)))
            .groupBy(documents.workspaceId),
          db.select({ workspaceId: categories.workspaceId, value: count() })
            .from(categories)
            .where(inArray(categories.workspaceId, wsIds))
            .groupBy(categories.workspaceId),
        ])
      : [[], []];

    const docCountMap = new Map(docCounts.map((r) => [r.workspaceId, Number(r.value)]));
    const catCountMap = new Map(catCounts.map((r) => [r.workspaceId, Number(r.value)]));

    // Batch-fetch pending join request counts (admin/owner only)
    const joinCountMap = new Map<number, number>();
    const adminWsIds = rows.filter((r) => r.role === 'owner' || r.role === 'admin').map((r) => r.id);
    if (adminWsIds.length > 0) {
      const joinCounts = await db
        .select({ workspaceId: joinRequests.workspaceId, value: count() })
        .from(joinRequests)
        .where(and(eq(joinRequests.status, 'pending'), inArray(joinRequests.workspaceId, adminWsIds)))
        .groupBy(joinRequests.workspaceId);
      for (const r of joinCounts) {
        joinCountMap.set(r.workspaceId, Number(r.value));
      }
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isRoot: row.isRoot,
      isPublic: row.isPublic,
      ownerId: row.ownerId,
      themePreset: row.themePreset,
      themeCss: row.themeCss,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role,
      lastActivityAt: row.updatedAt,
      documentCount: docCountMap.get(row.id) ?? 0,
      categoryCount: catCountMap.get(row.id) ?? 0,
      pendingJoinCount: joinCountMap.get(row.id) ?? 0,
    }));
  }

  async function update(workspaceId: string, data: { name?: string; isPublic?: boolean }) {
    const numWorkspaceId = Number(workspaceId);
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
      .where(eq(workspaces.id, numWorkspaceId))
      .returning();

    const workspace = updated[0];
    if (!workspace) {
      throw notFound('Workspace not found');
    }

    return workspace;
  }

  async function remove(workspaceId: string, confirmName: string) {
    const numWorkspaceId = Number(workspaceId);
    const found = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, numWorkspaceId))
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

    await db.delete(workspaces).where(eq(workspaces.id, numWorkspaceId));
  }

  async function transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ) {
    const numWorkspaceId = Number(workspaceId);
    const numCurrentOwnerId = Number(currentOwnerId);
    const numNewOwnerId = Number(newOwnerId);

    // Verify new owner is an admin
    const [newOwnerMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, numWorkspaceId),
          eq(workspaceMembers.userId, numNewOwnerId),
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
          eq(workspaceMembers.workspaceId, numWorkspaceId),
          eq(workspaceMembers.userId, numCurrentOwnerId),
        ),
      );

    // Promote new owner
    await db
      .update(workspaceMembers)
      .set({ role: 'owner' })
      .where(
        and(
          eq(workspaceMembers.workspaceId, numWorkspaceId),
          eq(workspaceMembers.userId, numNewOwnerId),
        ),
      );

    // Update workspace ownerId
    await db
      .update(workspaces)
      .set({ ownerId: numNewOwnerId, updatedAt: new Date() })
      .where(eq(workspaces.id, numWorkspaceId));
  }

  async function listPublicWorkspaces(userId: string, query: string, page: number, limit: number) {
    // Get workspace IDs where user is already a member
    const memberRows = await db
      .select({ wsId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, Number(userId)));
    const memberWsIds = memberRows.map((r) => r.wsId);

    // Build conditions: public + not a member
    const conditions = [eq(workspaces.isPublic, true)];
    if (memberWsIds.length > 0) {
      conditions.push(notInArray(workspaces.id, memberWsIds));
    }
    if (query.trim()) {
      conditions.push(
        ilike(workspaces.name, `%${query}%`),
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
              eq(joinRequests.userId, Number(userId)),
              eq(joinRequests.status, 'pending'),
            ),
          );
        const pendingRequest = Number(pendingResult[0]?.value ?? 0) > 0;

        return {
          id: ws.id,
          name: ws.name,
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
