/**
 * Password Change — PUT /api/v1/users/me/password
 *
 * AUTH-01: 비밀번호 변경 API 통합 테스트
 * - 현재 비밀번호 확인 후 새 비밀번호로 변경
 * - 전체 세션 무효화 + 새 토큰 발급
 * - 실패 카운트 기반 계정 잠금
 */
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '@markflow/db';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser } from '../helpers/factory.js';

const PASSWORD_CHANGE_URL = '/api/v1/users/me/password';
const LOGIN_URL = '/api/v1/auth/login';
const REFRESH_URL = '/api/v1/auth/refresh';

const DEFAULT_PASSWORD = 'Test123!@#';
const NEW_PASSWORD = 'NewStr0ng!Pass';

describe('PUT /api/v1/users/me/password', () => {
  // ─── Success Cases ───

  it('Test 1: should return 200 with accessToken and refreshToken on valid password change', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, {
      email: 'change@example.com',
      password: DEFAULT_PASSWORD,
      emailVerified: true,
    });

    const res = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      accessToken: string;
      refreshToken: string;
    };

    expect(body.accessToken).toBeTruthy();
    expect(typeof body.accessToken).toBe('string');
    expect(body.refreshToken).toBeTruthy();
    expect(typeof body.refreshToken).toBe('string');

    // refreshToken cookie should be set
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('Test 2: should invalidate previous refresh tokens after password change', async () => {
    const app = getApp();
    const db = getDb();

    const password = 'Str0ng!Pass1';

    const { accessToken } = await createUser(db, {
      email: 'invalidate@example.com',
      password,
      emailVerified: true,
    });

    // Login to get a refresh token cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: LOGIN_URL,
      payload: { email: 'invalidate@example.com', password },
    });
    expect(loginRes.statusCode).toBe(200);

    // Extract refresh token cookie
    const loginCookieHeader = loginRes.headers['set-cookie'];
    const loginCookieStr = Array.isArray(loginCookieHeader)
      ? loginCookieHeader.join('; ')
      : loginCookieHeader ?? '';
    const oldRefreshMatch = /refreshToken=([^;]+)/.exec(loginCookieStr);
    expect(oldRefreshMatch).toBeTruthy();
    const oldRefreshCookie = oldRefreshMatch![1];

    // Change password
    const changeRes = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: password,
        newPassword: NEW_PASSWORD,
      },
    });
    expect(changeRes.statusCode).toBe(200);

    // Try to use old refresh token — should fail
    const refreshRes = await app.inject({
      method: 'POST',
      url: REFRESH_URL,
      cookies: {
        refreshToken: oldRefreshCookie!,
      },
    });

    expect(refreshRes.statusCode).not.toBe(200);
  });

  it('Test 3: should allow refresh with the new token returned from password change', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, {
      email: 'newtoken@example.com',
      password: DEFAULT_PASSWORD,
      emailVerified: true,
    });

    // Change password
    const changeRes = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
      },
    });
    expect(changeRes.statusCode).toBe(200);

    // Extract new refresh token from the set-cookie header
    const changeCookieHeader = changeRes.headers['set-cookie'];
    const changeCookieStr = Array.isArray(changeCookieHeader)
      ? changeCookieHeader.join('; ')
      : changeCookieHeader ?? '';
    const newRefreshMatch = /refreshToken=([^;]+)/.exec(changeCookieStr);
    expect(newRefreshMatch).toBeTruthy();
    const newRefreshCookie = newRefreshMatch![1];

    // Use new refresh token — should succeed
    const refreshRes = await app.inject({
      method: 'POST',
      url: REFRESH_URL,
      cookies: {
        refreshToken: newRefreshCookie!,
      },
    });

    expect(refreshRes.statusCode).toBe(200);
    const refreshBody = refreshRes.json() as { accessToken: string };
    expect(refreshBody.accessToken).toBeTruthy();
  });

  // ─── Error Cases ───

  it('Test 4: should return 401 INVALID_CREDENTIALS for wrong current password', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, {
      email: 'wrongcurrent@example.com',
      password: DEFAULT_PASSWORD,
      emailVerified: true,
    });

    const res = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: 'Wrong!Pass123',
        newPassword: NEW_PASSWORD,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('Test 5: should return 400 INVALID_PASSWORD for invalid new password (too short)', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, {
      email: 'shortpw@example.com',
      password: DEFAULT_PASSWORD,
      emailVerified: true,
    });

    const res = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: 'Ab1!',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_PASSWORD');
  });

  it('Test 6: should return 401 ACCOUNT_LOCKED after 5 consecutive wrong current password attempts', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, {
      email: 'lockpwchange@example.com',
      password: DEFAULT_PASSWORD,
      emailVerified: true,
    });

    // Fail 5 times with wrong current password
    for (let i = 0; i < 5; i++) {
      const failRes = await app.inject({
        method: 'PUT',
        url: PASSWORD_CHANGE_URL,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          currentPassword: 'Wrong!Pass123',
          newPassword: NEW_PASSWORD,
        },
      });
      expect(failRes.statusCode).toBe(401);
    }

    // 6th attempt — account should be locked
    const lockedRes = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
      },
    });

    expect(lockedRes.statusCode).toBe(401);
    const body = lockedRes.json() as { error: { code: string } };
    expect(body.error.code).toBe('ACCOUNT_LOCKED');

    // Verify DB: lockedUntil is set
    const [lockedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'lockpwchange@example.com'));

    expect(lockedUser!.lockedUntil).not.toBeNull();
    const lockedUntil = new Date(lockedUser!.lockedUntil!).getTime();
    expect(lockedUntil).toBeGreaterThan(Date.now());
  });

  it('Test 7: should allow password change after lock expires', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db, {
      email: 'unlocked@example.com',
      password: DEFAULT_PASSWORD,
      emailVerified: true,
    });

    // Manually set account as locked in the past (lock already expired)
    await db
      .update(users)
      .set({
        loginFailCount: 5,
        lockedUntil: new Date(Date.now() - 60 * 1000), // locked 1 minute ago (already expired)
      })
      .where(eq(users.id, user.id));

    // Should be able to change password now
    const res = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      accessToken: string;
      refreshToken: string;
    };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();

    // Verify loginFailCount was reset
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updatedUser!.loginFailCount).toBe(0);
    expect(updatedUser!.lockedUntil).toBeNull();
  });

  it('Test 8: should return 401 for unauthenticated requests', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'PUT',
      url: PASSWORD_CHANGE_URL,
      payload: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
