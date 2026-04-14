/**
 * POST /api/v1/auth/resend-verification
 *
 * Email verification resend API — 이메일 인증 재발송
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';

const RESEND_URL = '/api/v1/auth/resend-verification';
const REGISTER_URL = '/api/v1/auth/register';
const VERIFY_URL = '/api/v1/auth/verify-email';

describe('POST /api/v1/auth/resend-verification', () => {
  it('should resend verification email for unverified user and issue new token', async () => {
    const app = getApp();
    const db = getDb();

    // Register a user (unverified)
    await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'resend-test@example.com',
        password: 'Str0ng!Pass',
        name: 'Resend Tester',
      },
    });

    // Get original token from DB
    const [beforeUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'resend-test@example.com'));
    expect(beforeUser).toBeDefined();
    const originalToken = beforeUser!.emailVerifyToken;
    expect(originalToken).toBeTruthy();

    // Request resend
    const res = await app.inject({
      method: 'POST',
      url: RESEND_URL,
      payload: { email: 'resend-test@example.com' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { sent: boolean };
    expect(body.sent).toBe(true);

    // Verify new token was issued (different from original)
    const [afterUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'resend-test@example.com'));
    expect(afterUser!.emailVerifyToken).toBeTruthy();
    expect(afterUser!.emailVerifyToken).not.toBe(originalToken);
    expect(afterUser!.emailVerifyExpiresAt).toBeDefined();
  });

  it('should return 200 { sent: true } for non-existent email (email enumeration prevention)', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: RESEND_URL,
      payload: { email: 'nonexistent@example.com' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { sent: boolean };
    expect(body.sent).toBe(true);
  });

  it('should return 200 { sent: true } for already verified user without changing token', async () => {
    const app = getApp();
    const db = getDb();

    // Register and verify a user
    await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'verified@example.com',
        password: 'Str0ng!Pass',
        name: 'Verified User',
      },
    });

    // Get token and verify
    const [regUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'verified@example.com'));
    await app.inject({
      method: 'GET',
      url: `${VERIFY_URL}?token=${regUser!.emailVerifyToken}`,
    });

    // Confirm verified
    const [verifiedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'verified@example.com'));
    expect(verifiedUser!.emailVerified).toBe(true);

    // Request resend for already verified user
    const res = await app.inject({
      method: 'POST',
      url: RESEND_URL,
      payload: { email: 'verified@example.com' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { sent: boolean };
    expect(body.sent).toBe(true);

    // Token should remain null (not changed)
    const [afterUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'verified@example.com'));
    expect(afterUser!.emailVerifyToken).toBeNull();
  });

  it('should return 400 MISSING_FIELDS when email body is missing', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: RESEND_URL,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('MISSING_FIELDS');
  });

  it('should allow verifyEmail with the new token after resend', async () => {
    const app = getApp();
    const db = getDb();

    // Register
    await app.inject({
      method: 'POST',
      url: REGISTER_URL,
      payload: {
        email: 'resend-verify@example.com',
        password: 'Str0ng!Pass',
        name: 'Resend Verify',
      },
    });

    // Resend
    await app.inject({
      method: 'POST',
      url: RESEND_URL,
      payload: { email: 'resend-verify@example.com' },
    });

    // Get new token from DB
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'resend-verify@example.com'));
    const newToken = user!.emailVerifyToken;
    expect(newToken).toBeTruthy();

    // Verify with new token
    const res = await app.inject({
      method: 'GET',
      url: `${VERIFY_URL}?token=${newToken}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { verified: boolean };
    expect(body.verified).toBe(true);

    // Confirm user is now verified
    const [verifiedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'resend-verify@example.com'));
    expect(verifiedUser!.emailVerified).toBe(true);
  });
});
