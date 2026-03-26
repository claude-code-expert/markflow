import crypto from 'node:crypto';
import {
  invitations,
  workspaces,
  workspaceMembers,
  users,
  eq,
  and,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { conflict, gone, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const INVITATION_EXPIRY_HOURS = 72;

type InvitationRole = 'admin' | 'editor' | 'viewer';

export function createInvitationService(db: Db) {
  async function create(
    workspaceId: string,
    inviterId: string,
    email: string,
    role: InvitationRole,
  ) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const inserted = await db
      .insert(invitations)
      .values({
        workspaceId,
        inviterId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
      })
      .returning();

    const invitation = inserted[0];
    if (!invitation) {
      throw new Error('Failed to create invitation');
    }

    logger.info(`Invitation link for ${email}: /api/v1/invitations/${token}`);

    return invitation;
  }

  async function getByToken(token: string) {
    const rows = await db
      .select({
        id: invitations.id,
        workspaceId: invitations.workspaceId,
        inviterId: invitations.inviterId,
        email: invitations.email,
        role: invitations.role,
        token: invitations.token,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        inviterName: users.name,
      })
      .from(invitations)
      .innerJoin(workspaces, eq(invitations.workspaceId, workspaces.id))
      .innerJoin(users, eq(invitations.inviterId, users.id))
      .where(eq(invitations.token, token))
      .limit(1);

    const invitation = rows[0];
    if (!invitation) {
      throw notFound('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw gone('INVITATION_ALREADY_USED', 'This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw gone('INVITATION_EXPIRED', 'This invitation has expired');
    }

    return invitation;
  }

  async function accept(token: string, userId: string) {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    const invitation = rows[0];
    if (!invitation) {
      throw notFound('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw gone('INVITATION_ALREADY_USED', 'This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw gone('INVITATION_EXPIRED', 'This invitation has expired');
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invitation.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw conflict('ALREADY_MEMBER', 'You are already a member of this workspace');
    }

    // Add user as member
    await db.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
    });

    // Update invitation status
    await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitation.id));

    return {
      workspaceId: invitation.workspaceId,
      role: invitation.role,
    };
  }

  return { create, getByToken, accept };
}
