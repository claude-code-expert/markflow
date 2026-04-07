/**
 * T026 — POST /api/v1/auth/register
 *
 * User Story 1: Authentication — Registration flow
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users, workspaces } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';

const REGISTER_URL = '/api/v1/auth/register';

describe('POST /api/v1/auth/register', () => {
  // ─── Success Cases ───

  it('should register a new user and return 201 with user object (no passwordHash)', async () => {
    const app = getApp();
    const payload = {
      email: 'newuser@example.com',
      password: 'Str0ng!Pass',
      name: 'Jane Doe',
    };

    const res = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload,
    });

    expect(res.statusCode).toBe(201);

    const body = res.json() as { user: Record<string, unknown> };

    // User object must be returned
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('id');
    expect(typeof body.user.id).toBe('number');

    // passwordHash must NEVER be exposed
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.user).not.toHaveProperty('password_hash');
    expect(body.user).not.toHaveProperty('password');

    // Verify persisted in DB
    const db = getDb();
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'newuser@example.com'));

    expect(dbUser).toBeDefined();
    expect(dbUser!.email).toBe('newuser@example.com');
    expect(dbUser!.name).toBe('Jane Doe');
    expect(dbUser!.emailVerified).toBe(false);
    expect(dbUser!.passwordHash).toBeTruthy();
    // passwordHash should not equal plaintext
    expect(dbUser!.passwordHash).not.toBe(payload.password);
  });

  it('should not auto-create a workspace for the new user', async () => {
    const app = getApp();
    const db = getDb();

    const res = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'workspace-test@example.com',
        password: 'W0rkspace!',
        name: 'Workspace Tester',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { user: { id: number } };

    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, body.user.id));

    expect(userWorkspaces.length).toBe(0);
  });

  // ─── Error Cases ───

  it('should return 409 EMAIL_EXISTS for duplicate email', async () => {
    const app = getApp();

    // Register first user
    await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'dupe@example.com',
        password: 'Str0ng!Pass',
        name: 'First',
      },
    });

    // Attempt duplicate
    const res = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'dupe@example.com',
        password: 'Str0ng!Pass',
        name: 'Second',
      },
    });

    expect(res.statusCode).toBe(409);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('EMAIL_EXISTS');
  });

  it('should return 400 INVALID_PASSWORD when password is too short', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'short-pass@example.com',
        password: 'Ab1!',
        name: 'Short Pass',
      },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INVALID_PASSWORD');
    expect(body.error.message).toBeDefined();
  });

  it('should return 400 INVALID_PASSWORD when password is missing special characters', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'no-special@example.com',
        password: 'Abcdefgh123',
        name: 'No Special',
      },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INVALID_PASSWORD');
    expect(body.error.message).toBeDefined();
  });

  it('should return 400 when required fields are missing', async () => {
    const app = getApp();

    // Missing email
    const res1 = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        password: 'Str0ng!Pass',
        name: 'No Email',
      },
    });
    expect(res1.statusCode).toBe(400);

    // Missing password
    const res2 = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'no-pass@example.com',
        name: 'No Pass',
      },
    });
    expect(res2.statusCode).toBe(400);

    // Missing name
    const res3 = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'no-name@example.com',
        password: 'Str0ng!Pass',
      },
    });
    expect(res3.statusCode).toBe(400);

    // Empty body
    const res4 = await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {},
    });
    expect(res4.statusCode).toBe(400);
  });
});
