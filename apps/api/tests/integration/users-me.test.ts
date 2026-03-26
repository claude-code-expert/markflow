/**
 * T030 — GET /api/v1/users/me & PATCH /api/v1/users/me
 *
 * User Story 1: Authentication — Current user profile endpoints
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';

const USERS_ME_URL = '/api/v1/users/me';

describe('GET /api/v1/users/me', () => {
  // ─── Success Cases ───

  it('should return 200 with user data when authenticated', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db, {
      email: 'me@example.com',
      name: 'Current User',
      emailVerified: true,
    });

    const res = await app.inject({
      method: 'GET',
      url: USERS_ME_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      emailVerified: boolean;
      createdAt: string;
    };

    expect(body.id).toBe(user.id);
    expect(body.email).toBe('me@example.com');
    expect(body.name).toBe('Current User');
    expect(body.emailVerified).toBe(true);
    expect(body.createdAt).toBeDefined();

    // Sensitive fields must NOT be exposed
    const bodyRaw = body as Record<string, unknown>;
    expect(bodyRaw).not.toHaveProperty('passwordHash');
    expect(bodyRaw).not.toHaveProperty('password_hash');
    expect(bodyRaw).not.toHaveProperty('emailVerifyToken');
    expect(bodyRaw).not.toHaveProperty('loginFailCount');
    expect(bodyRaw).not.toHaveProperty('lockedUntil');
  });

  // ─── Error Cases ───

  it('should return 401 when no auth token is provided', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: USERS_ME_URL,
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 401 when an invalid token is provided', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: USERS_ME_URL,
      headers: {
        authorization: 'Bearer invalid.jwt.token.here',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /api/v1/users/me', () => {
  // ─── Success: Update name ───

  it('should return 200 with updated user when name is changed', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db, {
      email: 'update-name@example.com',
      name: 'Old Name',
      emailVerified: true,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: USERS_ME_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: { name: 'New Name' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { id: string; name: string; email: string };
    expect(body.name).toBe('New Name');
    expect(body.email).toBe('update-name@example.com');

    // Verify DB is updated
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(dbUser!.name).toBe('New Name');
  });

  // ─── Success: Update avatarUrl ───

  it('should return 200 with updated user when avatarUrl is changed', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db, {
      email: 'update-avatar@example.com',
      emailVerified: true,
    });

    const newAvatarUrl = 'https://cdn.example.com/avatars/new-avatar.png';

    const res = await app.inject({
      method: 'PATCH',
      url: USERS_ME_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: { avatarUrl: newAvatarUrl },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { id: string; avatarUrl: string };
    expect(body.avatarUrl).toBe(newAvatarUrl);

    // Verify DB is updated
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(dbUser!.avatarUrl).toBe(newAvatarUrl);
  });

  // ─── Error: No auth ───

  it('should return 401 when no auth token is provided', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'PATCH',
      url: USERS_ME_URL,
      payload: { name: 'Hacker' },
    });

    expect(res.statusCode).toBe(401);
  });

  // ─── Edge: Update with empty payload ───

  it('should handle an empty update payload gracefully', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, {
      email: 'empty-update@example.com',
      emailVerified: true,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: USERS_ME_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {},
    });

    // Should either return 200 with unchanged data or 400 for empty body.
    // Both are valid behaviors; we just ensure it doesn't crash.
    expect([200, 400]).toContain(res.statusCode);
  });
});
