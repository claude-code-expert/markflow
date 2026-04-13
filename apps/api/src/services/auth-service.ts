import crypto from 'node:crypto';
import {
  users,
  refreshTokens,
  eq,
  and,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.js';
import { signTokenPair, signAccessToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { AppError, badRequest, conflict, unauthorized, gone } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { sendEmail, verificationEmailHtml, passwordResetEmailHtml, FRONTEND_URL } from '../utils/email.js';

interface SafeUser {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeUser(row: {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAuthService(db: Db) {
  async function register(email: string, password: string, name: string) {
    const validation = validatePassword(password);
    if (!validation.valid) {
      throw badRequest('INVALID_PASSWORD', validation.message ?? 'Invalid password');
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw conflict('EMAIL_EXISTS', 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(password);
    const emailVerifyToken = crypto.randomUUID();
    const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const inserted = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name,
        emailVerifyToken,
        emailVerifyExpiresAt,
      })
      .returning();

    const user = inserted[0];
    if (!user) {
      throw new Error('Failed to insert user');
    }

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${emailVerifyToken}`;
    await sendEmail({
      to: user.email,
      subject: 'MarkFlow 이메일 인증',
      html: verificationEmailHtml(verifyUrl),
    });

    return { user: toSafeUser(user) };
  }

  async function verifyEmail(token: string) {
    const found = await db
      .select()
      .from(users)
      .where(eq(users.emailVerifyToken, token))
      .limit(1);

    const user = found[0];
    if (!user) {
      throw badRequest('INVALID_TOKEN', 'Invalid verification token');
    }

    if (user.emailVerifyExpiresAt && user.emailVerifyExpiresAt < new Date()) {
      throw gone('TOKEN_EXPIRED', 'Verification token has expired');
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { verified: true };
  }

  async function login(email: string, password: string, rememberMe = false) {
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = found[0];
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    if (!user.emailVerified) {
      throw new AppError('EMAIL_NOT_VERIFIED', '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.', 403);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new AppError('ACCOUNT_LOCKED', `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도해주세요.`, 401);
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      const newFailCount = user.loginFailCount + 1;
      const updates: {
        loginFailCount: number;
        lockedUntil?: Date;
        updatedAt: Date;
      } = {
        loginFailCount: newFailCount,
        updatedAt: new Date(),
      };

      if (newFailCount >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        logger.warn(`Account locked for ${user.email} due to ${newFailCount} failed login attempts`);
      }

      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id));

      throw new AppError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    // Success — reset fail count and clear lock
    await db
      .update(users)
      .set({
        loginFailCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const tokenPair = signTokenPair(
      { userId: String(user.id), email: user.email },
      rememberMe,
    );

    const tokenHash = hashToken(tokenPair.refreshToken);
    const expiresAt = getRefreshTokenExpiry(rememberMe);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: toSafeUser(user),
    };
  }

  async function refresh(rawRefreshToken: string) {
    const payload = verifyRefreshToken(rawRefreshToken);
    const tokenHash = hashToken(rawRefreshToken);

    const found = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.userId, Number(payload.userId)),
        ),
      )
      .limit(1);

    const storedToken = found[0];
    if (!storedToken) {
      throw unauthorized('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, storedToken.id));
      throw unauthorized('Refresh token has expired');
    }

    const accessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
    });

    return { accessToken };
  }

  async function logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async function forgotPassword(email: string) {
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = found[0];
    if (!user) {
      return { sent: true };
    }

    const token = crypto.randomUUID();
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'MarkFlow 비밀번호 재설정',
      html: passwordResetEmailHtml(resetUrl),
    });

    return { sent: true };
  }

  async function resetPassword(token: string, newPassword: string) {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      throw badRequest('INVALID_PASSWORD', validation.message ?? 'Invalid password');
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    const user = found[0];
    if (!user) {
      throw badRequest('INVALID_TOKEN', '유효하지 않은 비밀번호 재설정 링크입니다.');
    }

    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      throw gone('TOKEN_EXPIRED', '비밀번호 재설정 링크가 만료되었습니다.');
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { reset: true };
  }

  async function changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. DB에서 user 조회
    const found = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        loginFailCount: users.loginFailCount,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = found[0];
    if (!user) {
      throw unauthorized('User not found');
    }

    // 2. 계정 잠금 확인 (D-02: 로그인 정책 동일 적용)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new AppError('ACCOUNT_LOCKED', `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도해주세요.`, 401);
    }

    // 3. 현재 비밀번호 검증
    const passwordMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      // D-02: 실패 카운트 증가 (loginFailCount 재사용)
      const newFailCount = user.loginFailCount + 1;
      const updates: { loginFailCount: number; lockedUntil?: Date; updatedAt: Date } = {
        loginFailCount: newFailCount,
        updatedAt: new Date(),
      };
      if (newFailCount >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15분 잠금
        logger.warn(`Account locked for user ${userId} due to ${newFailCount} failed password change attempts`);
      }
      await db.update(users).set(updates).where(eq(users.id, userId));
      throw new AppError('INVALID_CREDENTIALS', '현재 비밀번호가 올바르지 않습니다.', 401);
    }

    // 4. 새 비밀번호 유효성 검사
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      throw badRequest('INVALID_PASSWORD', validation.message ?? 'Invalid password');
    }

    // 5. 새 비밀번호 해시
    const newHash = await hashPassword(newPassword);

    // 6. D-01 + D-03: Atomic 트랜잭션 — 비밀번호 변경 + 전체 세션 무효화 + 새 토큰 발급
    const tokenPair = signTokenPair({ userId: String(userId), email: user.email });
    const newTokenHash = hashToken(tokenPair.refreshToken);
    const expiresAt = getRefreshTokenExpiry(false);

    await db.transaction(async (tx) => {
      // a. 비밀번호 업데이트 + 실패 카운트 리셋
      await tx.update(users).set({
        passwordHash: newHash,
        loginFailCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      // b. 해당 사용자의 모든 refresh token 삭제 (전체 세션 무효화)
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

      // c. 새 refresh token 삽입 (현재 세션 유지)
      await tx.insert(refreshTokens).values({
        userId,
        tokenHash: newTokenHash,
        expiresAt,
      });
    });

    logger.info('Password changed successfully', { userId });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    };
  }

  return { register, verifyEmail, login, refresh, logout, forgotPassword, resetPassword, changePassword };
}
