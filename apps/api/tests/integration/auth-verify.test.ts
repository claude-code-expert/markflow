/**
 * T028 — GET /api/v1/auth/verify-email?token=xxx
 *
 * User Story 1: Authentication — Email verification flow
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';

const VERIFY_URL = '/api/v1/auth/verify-email';

describe('GET /api/v1/auth/verify-email', () => {
  // ─── Success Cases ───

  it('should return 200 and set emailVerified=true for a valid token', async () => {
    const app = getApp();
    const db = getDb();

    // Create an unverified user with a known verification token
    const { user } = await createUser(db, {
      email: 'verify-me@example.com',
      emailVerified: false,
    });

    const verifyToken = 'valid-verify-token-123';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

    await db
      .update(users)
      .set({
        emailVerifyToken: verifyToken,
        emailVerifyExpiresAt: expiresAt,
      })
      .where(eq(users.id, user.id));

    const res = await app.inject({
      method: 'GET',
      url: `${VERIFY_URL}?token=${verifyToken}`,
    });

    expect(res.statusCode).toBe(200);

    // Verify DB state: emailVerified should now be true
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(updatedUser!.emailVerified).toBe(true);

    // Token should be cleared after successful verification
    expect(updatedUser!.emailVerifyToken).toBeNull();
  });

  // ─── Error Cases ───

  it('should return 400 INVALID_TOKEN for an unknown or invalid token', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: `${VERIFY_URL}?token=nonexistent-token-xyz`,
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('should return 400 INVALID_TOKEN when no token is provided', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: VERIFY_URL,
    });

    expect(res.statusCode).toBe(400);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('should return 410 TOKEN_EXPIRED for an expired verification token', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, {
      email: 'expired-verify@example.com',
      emailVerified: false,
    });

    const expiredToken = 'expired-verify-token-456';
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    await db
      .update(users)
      .set({
        emailVerifyToken: expiredToken,
        emailVerifyExpiresAt: pastDate,
      })
      .where(eq(users.id, user.id));

    const res = await app.inject({
      method: 'GET',
      url: `${VERIFY_URL}?token=${expiredToken}`,
    });

    expect(res.statusCode).toBe(410);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('TOKEN_EXPIRED');

    // User should still be unverified
    const [unchanged] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(unchanged!.emailVerified).toBe(false);
  });
});
