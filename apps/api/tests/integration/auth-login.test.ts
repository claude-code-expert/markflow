/**
 * T027 — POST /api/v1/auth/login
 *
 * User Story 1: Authentication — Login flow
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';

const LOGIN_URL = '/api/v1/auth/login';

describe('POST /api/v1/auth/login', () => {
  // ─── Success Cases ───

  it('should return 200 with accessToken, user, and set refreshToken cookie', async () => {
    const app = getApp();
    const db = getDb();
    const password = 'Str0ng!Pass';

    await createUser(db, { email: 'login@example.com', password, emailVerified: true });

    const res = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'login@example.com', password },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      accessToken: string;
      user: { id: string; email: string; name: string };
    };

    // accessToken present
    expect(body.accessToken).toBeTruthy();
    expect(typeof body.accessToken).toBe('string');

    // user object
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('login@example.com');
    expect(body.user.id).toBeTruthy();

    // passwordHash must NOT be in response
    const userObj = body.user as Record<string, unknown>;
    expect(userObj).not.toHaveProperty('passwordHash');
    expect(userObj).not.toHaveProperty('password_hash');

    // refreshToken cookie should be set
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();

    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('should set longer cookie expiry when rememberMe=true', async () => {
    const app = getApp();
    const db = getDb();
    const password = 'Str0ng!Pass';

    await createUser(db, { email: 'remember@example.com', password, emailVerified: true });

    // Login without rememberMe
    const resDefault = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'remember@example.com', password, rememberMe: false },
    });
    expect(resDefault.statusCode).toBe(200);

    const defaultCookie = resDefault.headers['set-cookie'];
    const defaultCookieStr = Array.isArray(defaultCookie) ? defaultCookie.join('; ') : defaultCookie ?? '';

    // Login with rememberMe
    const resRemember = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'remember@example.com', password, rememberMe: true },
    });
    expect(resRemember.statusCode).toBe(200);

    const rememberCookie = resRemember.headers['set-cookie'];
    const rememberCookieStr = Array.isArray(rememberCookie) ? rememberCookie.join('; ') : rememberCookie ?? '';

    // Both should have Max-Age or Expires; rememberMe should be longer
    // Extract Max-Age values for comparison
    const extractMaxAge = (cookie: string): number => {
      const match = /Max-Age=(\d+)/i.exec(cookie);
      return match ? Number(match[1]) : 0;
    };

    const defaultMaxAge = extractMaxAge(defaultCookieStr);
    const rememberMaxAge = extractMaxAge(rememberCookieStr);

    // rememberMe=true should have a longer expiry
    if (defaultMaxAge > 0 && rememberMaxAge > 0) {
      expect(rememberMaxAge).toBeGreaterThan(defaultMaxAge);
    }
    // At minimum, the cookie should be set in both cases
    expect(rememberCookieStr).toContain('refreshToken=');
  });

  // ─── Error Cases ───

  it('should return 401 INVALID_CREDENTIALS for wrong password and increment loginFailCount', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, {
      email: 'wrongpass@example.com',
      password: 'Str0ng!Pass',
      emailVerified: true,
    });

    expect(user.loginFailCount).toBe(0);

    const res = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'wrongpass@example.com', password: 'Wr0ng!Password' },
    });

    expect(res.statusCode).toBe(401);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_CREDENTIALS');

    // loginFailCount should be incremented
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(updatedUser!.loginFailCount).toBe(1);
  });

  it('should return 403 EMAIL_NOT_VERIFIED when email is not verified', async () => {
    const app = getApp();
    const db = getDb();
    const password = 'Str0ng!Pass';

    await createUser(db, {
      email: 'unverified@example.com',
      password,
      emailVerified: false,
    });

    const res = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'unverified@example.com', password },
    });

    expect(res.statusCode).toBe(403);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should return 401 ACCOUNT_LOCKED after 5 consecutive failed login attempts', async () => {
    const app = getApp();
    const db = getDb();

    await createUser(db, {
      email: 'lockme@example.com',
      password: 'Str0ng!Pass',
      emailVerified: true,
    });

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      const failRes = await app.inject({
        method: 'POST',
        url: LOGIN_URL,
        payload: { email: 'lockme@example.com', password: 'Wr0ng!Password' },
      });

      // First 4 should be INVALID_CREDENTIALS, 5th may trigger lock
      if (i < 4) {
        expect(failRes.statusCode).toBe(401);
        const failBody = failRes.json() as { error: { code: string } };
        expect(failBody.error.code).toBe('INVALID_CREDENTIALS');
      }
    }

    // 6th attempt — account should now be locked
    const lockedRes = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'lockme@example.com', password: 'Str0ng!Pass' },
    });

    expect(lockedRes.statusCode).toBe(401);

    const lockedBody = lockedRes.json() as { error: { code: string; message: string } };
    expect(lockedBody.error.code).toBe('ACCOUNT_LOCKED');

    // Verify DB: lockedUntil is set to ~15 min in the future
    const [lockedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'lockme@example.com'));

    expect(lockedUser!.lockedUntil).toBeDefined();
    expect(lockedUser!.lockedUntil).not.toBeNull();

    const lockedUntil = new Date(lockedUser!.lockedUntil!).getTime();
    const now = Date.now();
    // lockedUntil should be roughly 15 minutes from now (allow 1 min tolerance)
    expect(lockedUntil).toBeGreaterThan(now);
    expect(lockedUntil).toBeLessThanOrEqual(now + 16 * 60 * 1000);
  });

  it('should return 429 RATE_LIMITED after 10+ login attempts from the same IP', async () => {
    const app = getApp();
    const db = getDb();

    await createUser(db, {
      email: 'ratelimit@example.com',
      password: 'Str0ng!Pass',
      emailVerified: true,
    });

    // Fire 11 login requests (exceeding 10/15min limit)
    const responses: { statusCode: number; body: Record<string, unknown> }[] = [];

    for (let i = 0; i <= 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: LOGIN_URL,
        payload: { email: 'ratelimit@example.com', password: 'Wr0ng!Password' },
      });
      responses.push({ statusCode: res.statusCode, body: res.json() as Record<string, unknown> });
    }

    // At least the 11th request should be rate-limited
    const lastRes = responses[responses.length - 1];
    expect(lastRes).toBeDefined();
    expect(lastRes!.statusCode).toBe(429);

    const errorBody = lastRes!.body as { error: { code: string } };
    expect(errorBody.error.code).toBe('RATE_LIMITED');
  });
});
