import crypto from 'node:crypto';
import {
  users,
  workspaces,
  workspaceMembers,
  refreshTokens,
  eq,
  and,
} from '@markflow/db';
import type { Db } from '@markflow/db';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.js';
import { signTokenPair, signAccessToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { AppError, badRequest, conflict, unauthorized, gone } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface SafeUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeUser(row: {
  id: string;
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

    const slug = `my-notes-${user.id.slice(0, 8)}`;

    const insertedWorkspace = await db
      .insert(workspaces)
      .values({
        name: 'My Notes',
        slug,
        isRoot: true,
        ownerId: user.id,
      })
      .returning();

    const workspace = insertedWorkspace[0];
    if (!workspace) {
      throw new Error('Failed to create root workspace');
    }

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    });

    logger.info(`Email verification link for ${user.email}: /api/v1/auth/verify-email?token=${emailVerifyToken}`);

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
      { userId: user.id, email: user.email },
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
          eq(refreshTokens.userId, payload.userId),
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

  return { register, verifyEmail, login, refresh, logout };
}
