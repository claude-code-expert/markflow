/**
 * POST /api/v1/auth/forgot-password
 *
 * Password reset request flow
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';

const FORGOT_URL = '/api/v1/auth/forgot-password';

describe('POST /api/v1/auth/forgot-password', () => {
  it('should return 200 with sent:true for existing verified user', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, { email: 'reset@test.com', emailVerified: true });

    const res = await app.inject({
      method: 'POST',
      url: FORGOT_URL,
      payload: { email: 'reset@test.com' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { sent: boolean };
    expect(body.sent).toBe(true);

    // Verify passwordResetToken is set in DB
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(dbUser).toBeDefined();
    expect(dbUser!.passwordResetToken).toBeTruthy();
    expect(dbUser!.passwordResetExpiresAt).toBeTruthy();
    expect(dbUser!.passwordResetExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should return 200 even when email does not exist (prevent email enumeration)', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: FORGOT_URL,
      payload: { email: 'nonexistent@test.com' },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { sent: boolean };
    expect(body.sent).toBe(true);
  });

  it('should return 400 when email is missing', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: FORGOT_URL,
      payload: {},
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('MISSING_FIELDS');
  });
});
