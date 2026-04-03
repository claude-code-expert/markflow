import { embedTokens, eq, and } from '@markflow/db';
import type { Db } from '@markflow/db';
import { badRequest, notFound } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';
import crypto from 'node:crypto';

export function createEmbedTokenService(db: Db) {
  function generateToken(): string {
    return 'mf_gt_' + crypto.randomBytes(32).toString('hex');
  }

  async function create(workspaceId: number, creatorId: number, label: string, scope: string, expiresAt: string) {
    if (!label.trim()) throw badRequest('MISSING_LABEL', 'Label is required');
    if (!['read', 'read_write'].includes(scope)) throw badRequest('INVALID_SCOPE', 'Scope must be "read" or "read_write"');

    const expDate = new Date(expiresAt);
    if (isNaN(expDate.getTime()) || expDate <= new Date()) {
      throw badRequest('INVALID_EXPIRY', 'expiresAt must be a future date');
    }

    const rawToken = generateToken();
    const tokenHash = await hashPassword(rawToken);

    const [inserted] = await db
      .insert(embedTokens)
      .values({
        workspaceId,
        creatorId,
        label: label.trim(),
        tokenHash,
        scope: scope as 'read' | 'read_write',
        expiresAt: expDate,
      })
      .returning();

    return {
      id: inserted!.id,
      label: inserted!.label,
      token: rawToken,
      scope: inserted!.scope,
      expiresAt: inserted!.expiresAt.toISOString(),
      createdAt: inserted!.createdAt.toISOString(),
    };
  }

  async function list(workspaceId: number) {
    const tokens = await db
      .select()
      .from(embedTokens)
      .where(eq(embedTokens.workspaceId, workspaceId))
      .orderBy(embedTokens.createdAt);

    return {
      tokens: tokens.map((t) => ({
        id: t.id,
        label: t.label,
        tokenPreview: 'mf_gt_' + t.tokenHash.slice(0, 8) + '...••••',
        scope: t.scope,
        expiresAt: t.expiresAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        isActive: !t.revokedAt && t.expiresAt > new Date(),
      })),
    };
  }

  async function revoke(workspaceId: number, tokenId: number) {
    const [token] = await db
      .select({ id: embedTokens.id })
      .from(embedTokens)
      .where(and(eq(embedTokens.id, tokenId), eq(embedTokens.workspaceId, workspaceId)))
      .limit(1);

    if (!token) throw notFound('Token not found');

    await db
      .update(embedTokens)
      .set({ revokedAt: new Date() })
      .where(eq(embedTokens.id, tokenId));
  }

  return { create, list, revoke };
}
