/**
 * POST /api/v1/auth/reset-password
 *
 * Password reset execution flow
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';

const RESET_URL = '/api/v1/auth/reset-password';

describe('POST /api/v1/auth/reset-password', () => {
  it('should reset password with valid token', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, { email: 'reset@test.com', password: 'OldPass1!@#' });

    const token = 'test-reset-token';
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }).where(eq(users.id, user.id));

    const res = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: { token, password: 'NewPass1!@#' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { reset: boolean };
    expect(body.reset).toBe(true);

    // Verify passwordHash changed and token cleared
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(dbUser).toBeDefined();
    expect(dbUser!.passwordResetToken).toBeNull();
    expect(dbUser!.passwordResetExpiresAt).toBeNull();
    expect(dbUser!.passwordHash).not.toBe(user.passwordHash);
  });

  it('should return 400 for invalid token', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: { token: 'nonexistent-token', password: 'NewPass1!@#' },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('should return 410 for expired token', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, { email: 'expired@test.com' });

    const token = 'expired-reset-token';
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    }).where(eq(users.id, user.id));

    const res = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: { token, password: 'NewPass1!@#' },
    });

    expect(res.statusCode).toBe(410);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should return 400 for invalid password format', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, { email: 'weakpass@test.com' });

    const token = 'weak-pass-token';
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }).where(eq(users.id, user.id));

    const res = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: { token, password: 'weak' },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_PASSWORD');
  });

  it('should return 400 when token or password is missing', async () => {
    const app = getApp();

    // Missing password
    const res1 = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: { token: 'some-token' },
    });
    expect(res1.statusCode).toBe(400);

    const body1 = res1.json() as { error: { code: string } };
    expect(body1.error.code).toBe('MISSING_FIELDS');

    // Missing token
    const res2 = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: { password: 'NewPass1!@#' },
    });
    expect(res2.statusCode).toBe(400);

    const body2 = res2.json() as { error: { code: string } };
    expect(body2.error.code).toBe('MISSING_FIELDS');

    // Empty body
    const res3 = await app.inject({
      method: 'POST',
      url: RESET_URL,
      payload: {},
    });
    expect(res3.statusCode).toBe(400);
  });
});
