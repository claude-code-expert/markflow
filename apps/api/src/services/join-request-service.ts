import {
  joinRequests,
  workspaces,
  workspaceMembers,
  users,
  eq,
  and,
  inArray,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, conflict, notFound } from '../utils/errors.js';

type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
type AssignableRole = 'admin' | 'editor' | 'viewer';
type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export function createJoinRequestService(db: Db) {
  async function create(workspaceId: string, userId: string, message?: string) {
    // Check workspace is public
    const [workspace] = await db
      .select({ isPublic: workspaces.isPublic })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw notFound('Workspace not found');
    }

    if (!workspace.isPublic) {
      throw badRequest('WORKSPACE_NOT_PUBLIC', 'This workspace does not accept join requests');
    }

    // Check not already a member
    const [existingMember] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw conflict('ALREADY_MEMBER', 'You are already a member of this workspace');
    }

    // Check not already requested (pending)
    const statusPending: JoinRequestStatus = 'pending';
    const [existingRequest] = await db
      .select({ id: joinRequests.id })
      .from(joinRequests)
      .where(
        and(
          eq(joinRequests.workspaceId, workspaceId),
          eq(joinRequests.userId, userId),
          eq(joinRequests.status, statusPending),
        ),
      )
      .limit(1);

    if (existingRequest) {
      throw conflict('ALREADY_REQUESTED', 'You already have a pending join request for this workspace');
    }

    const inserted = await db
      .insert(joinRequests)
      .values({
        workspaceId,
        userId,
        message: message ?? null,
      })
      .returning();

    const request = inserted[0];
    if (!request) {
      throw new Error('Failed to create join request');
    }

    return request;
  }

  async function list(workspaceId: string, status?: string) {
    const conditions = [eq(joinRequests.workspaceId, workspaceId)];

    if (status) {
      conditions.push(eq(joinRequests.status, status as JoinRequestStatus));
    }

    const rows = await db
      .select({
        id: joinRequests.id,
        workspaceId: joinRequests.workspaceId,
        userId: joinRequests.userId,
        message: joinRequests.message,
        status: joinRequests.status,
        reviewedBy: joinRequests.reviewedBy,
        assignedRole: joinRequests.assignedRole,
        createdAt: joinRequests.createdAt,
        updatedAt: joinRequests.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
      })
      .from(joinRequests)
      .innerJoin(users, eq(joinRequests.userId, users.id))
      .where(and(...conditions));

    return rows;
  }

  async function approve(requestId: string, reviewerId: string, role: MemberRole) {
    const [request] = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw notFound('Join request not found');
    }

    if (request.status !== 'pending') {
      throw badRequest('ALREADY_REVIEWED', 'This join request has already been reviewed');
    }

    const assignedRole: AssignableRole = role === 'owner' ? 'admin' : role;

    // Update request
    await db
      .update(joinRequests)
      .set({
        status: 'approved' as JoinRequestStatus,
        assignedRole,
        reviewedBy: reviewerId,
        updatedAt: new Date(),
      })
      .where(eq(joinRequests.id, requestId));

    // Add user as member
    await db.insert(workspaceMembers).values({
      workspaceId: request.workspaceId,
      userId: request.userId,
      role,
    });
  }

  async function reject(requestId: string, reviewerId: string) {
    const [request] = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw notFound('Join request not found');
    }

    if (request.status !== 'pending') {
      throw badRequest('ALREADY_REVIEWED', 'This join request has already been reviewed');
    }

    await db
      .update(joinRequests)
      .set({
        status: 'rejected' as JoinRequestStatus,
        reviewedBy: reviewerId,
        updatedAt: new Date(),
      })
      .where(eq(joinRequests.id, requestId));
  }

  async function batchApprove(requestIds: string[], reviewerId: string, role: MemberRole) {
    let approvedCount = 0;

    const statusPending: JoinRequestStatus = 'pending';
    const requests = await db
      .select()
      .from(joinRequests)
      .where(
        and(
          inArray(joinRequests.id, requestIds),
          eq(joinRequests.status, statusPending),
        ),
      );

    const assignedRole: AssignableRole = role === 'owner' ? 'admin' : role;

    for (const request of requests) {
      // Update request
      await db
        .update(joinRequests)
        .set({
          status: 'approved' as JoinRequestStatus,
          assignedRole,
          reviewedBy: reviewerId,
          updatedAt: new Date(),
        })
        .where(eq(joinRequests.id, request.id));

      // Add user as member
      await db.insert(workspaceMembers).values({
        workspaceId: request.workspaceId,
        userId: request.userId,
        role,
      });

      approvedCount++;
    }

    return { count: approvedCount };
  }

  return { create, list, approve, reject, batchApprove };
}
