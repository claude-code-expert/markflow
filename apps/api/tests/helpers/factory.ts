import { users, workspaces, workspaceMembers, invitations, joinRequests } from '@markflow/db';
import { hashPassword } from '../../src/utils/password.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import type { Db } from '@markflow/db';
import crypto from 'node:crypto';

let counter = 0;
function nextId() {
  counter++;
  return counter;
}

interface CreateUserOptions {
  email?: string;
  name?: string;
  password?: string;
  emailVerified?: boolean;
}

export async function createUser(db: Db, options: CreateUserOptions = {}) {
  const id = nextId();
  const email = options.email ?? `user${id}@test.com`;
  const passwordHash = await hashPassword(options.password ?? 'Test123!@#');

  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    name: options.name ?? `Test User ${id}`,
    emailVerified: options.emailVerified ?? true,
  }).returning();

  const accessToken = signAccessToken({ userId: user!.id, email: user!.email });

  return { user: user!, accessToken };
}

interface CreateWorkspaceOptions {
  name?: string;
  slug?: string;
  isRoot?: boolean;
  isPublic?: boolean;
}

export async function createWorkspace(db: Db, ownerId: string, options: CreateWorkspaceOptions = {}) {
  const id = nextId();
  const [workspace] = await db.insert(workspaces).values({
    name: options.name ?? `Workspace ${id}`,
    slug: options.slug ?? `workspace-${id}`,
    isRoot: options.isRoot ?? false,
    isPublic: options.isPublic ?? true,
    ownerId,
  }).returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace!.id,
    userId: ownerId,
    role: 'owner',
  });

  return workspace!;
}

export async function addMember(db: Db, workspaceId: string, userId: string, role: 'admin' | 'editor' | 'viewer') {
  const [member] = await db.insert(workspaceMembers).values({
    workspaceId,
    userId,
    role,
  }).returning();
  return member!;
}

interface CreateInvitationOptions {
  email?: string;
  role?: 'admin' | 'editor' | 'viewer';
  status?: 'pending' | 'accepted' | 'expired';
  expiresAt?: Date;
}

export async function createInvitation(
  db: Db,
  workspaceId: string,
  inviterId: string,
  options: CreateInvitationOptions = {},
) {
  const id = nextId();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = options.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invitation] = await db.insert(invitations).values({
    workspaceId,
    inviterId,
    email: options.email ?? `invited${id}@test.com`,
    role: options.role ?? 'editor',
    token,
    status: options.status ?? 'pending',
    expiresAt,
  }).returning();

  return invitation!;
}

interface CreateJoinRequestOptions {
  message?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export async function createJoinRequest(
  db: Db,
  workspaceId: string,
  userId: string,
  options: CreateJoinRequestOptions = {},
) {
  const [joinRequest] = await db.insert(joinRequests).values({
    workspaceId,
    userId,
    message: options.message ?? 'I would like to join this workspace',
    status: options.status ?? 'pending',
  }).returning();

  return joinRequest!;
}
