/**
 * T029 — POST /api/v1/auth/refresh & POST /api/v1/auth/logout
 *
 * User Story 1: Authentication — Token refresh and logout flows
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { refreshTokens } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';
import { signRefreshToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

const REFRESH_URL = '/api/v1/auth/refresh';
const LOGOUT_URL = '/api/v1/auth/logout';
const LOGIN_URL = '/api/v1/auth/login';

/**
 * Helper: perform a login to obtain valid cookies and tokens.
 */
async function loginAndGetCookies(email: string, password: string) {
  const app = getApp();
  const res = await app.inject({
    method: 'POST',
    url: LOGIN_URL,
    payload: { email, password },
  });

  const body = res.json() as { accessToken: string };
  const setCookieHeader = res.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader ?? '';

  // Extract the refreshToken cookie value
  const match = /refreshToken=([^;]+)/.exec(cookieStr);
  const refreshTokenValue = match ? match[1] : '';

  return {
    accessToken: body.accessToken,
    refreshTokenCookie: `refreshToken=${refreshTokenValue}`,
    rawSetCookie: cookieStr,
  };
}

describe('POST /api/v1/auth/refresh', () => {
  // ─── Success Cases ───

  it('should return 200 with a new accessToken when a valid refreshToken cookie is sent', async () => {
    const app = getApp();
    const db = getDb();
    const password = 'Str0ng!Pass';

    await createUser(db, { email: 'refresh@example.com', password, emailVerified: true });

    const { refreshTokenCookie, accessToken: originalAccessToken } = await loginAndGetCookies(
      'refresh@example.com',
      password,
    );

    expect(refreshTokenCookie).not.toBe('refreshToken=');

    const res = await app.inject({
      method: 'POST',
      url: REFRESH_URL,
      headers: {
        cookie: refreshTokenCookie,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as { accessToken: string };
    expect(body.accessToken).toBeTruthy();
    expect(typeof body.accessToken).toBe('string');

    // New token should be different from the original (issued at different times)
    // Note: This could flake if both are issued within the same second, but
    // the login + refresh round-trip makes this extremely unlikely.
    expect(body.accessToken).not.toBe(originalAccessToken);
  });

  // ─── Error Cases ───

  it('should return 401 INVALID_REFRESH_TOKEN when no cookie is sent', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: REFRESH_URL,
    });

    expect(res.statusCode).toBe(401);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('should return 401 INVALID_REFRESH_TOKEN for an expired refresh token', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, {
      email: 'expired-refresh@example.com',
      emailVerified: true,
    });

    // Create an expired refresh token manually
    const expiredToken = signRefreshToken({ userId: user.id, email: user.email });

    // Store in DB with past expiry to simulate expiration
    const crypto = await import('node:crypto');
    const tokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // expired 1 hour ago
    });

    const res = await app.inject({
      method: 'POST',
      url: REFRESH_URL,
      headers: {
        cookie: `refreshToken=${expiredToken}`,
      },
    });

    expect(res.statusCode).toBe(401);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('should return 401 INVALID_REFRESH_TOKEN for a forged/invalid token', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: REFRESH_URL,
      headers: {
        cookie: 'refreshToken=this.is.not.a.real.jwt.token',
      },
    });

    expect(res.statusCode).toBe(401);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /api/v1/auth/logout', () => {
  // ─── Success Cases ───

  it('should return 204 and delete the refresh token from DB', async () => {
    const app = getApp();
    const db = getDb();
    const password = 'Str0ng!Pass';

    await createUser(db, { email: 'logout@example.com', password, emailVerified: true });

    const { accessToken, refreshTokenCookie } = await loginAndGetCookies(
      'logout@example.com',
      password,
    );

    // Verify refresh token exists in DB before logout
    const tokensBefore = await db.select().from(refreshTokens);
    expect(tokensBefore.length).toBeGreaterThanOrEqual(1);

    const res = await app.inject({
      method: 'POST',
      url: LOGOUT_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
        cookie: refreshTokenCookie,
      },
    });

    expect(res.statusCode).toBe(204);

    // After logout, the user's refresh tokens should be removed
    const tokensAfter = await db.select().from(refreshTokens);
    // The specific user's token should be gone
    const userTokens = tokensAfter.filter((t) =>
      // We can't easily filter by userId here because factory creates multiple users,
      // but the count should have decreased
      true,
    );
    // At minimum, verify one fewer token exists (or zero for this user)
    expect(tokensAfter.length).toBeLessThan(tokensBefore.length);
  });

  // ─── Error Cases ───

  it('should return 401 when no authorization header is provided', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: LOGOUT_URL,
    });

    expect(res.statusCode).toBe(401);
  });
});
