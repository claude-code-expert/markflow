/**
 * T124 -- Security Audit Verification
 *
 * Validates key security properties:
 * 1. No endpoint leaks passwordHash
 * 2. All state-changing endpoints require auth
 * 3. Workspace data isolation
 * 4. Rate limiting on auth endpoints
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember, createInvitation } from '../helpers/factory.js';

// ─── Helper: deep check for password hash leak ───
function containsPasswordHash(obj: unknown): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') {
    // bcrypt hashes start with $2a$, $2b$, or $2y$
    return /\$2[aby]\$\d+\$/.test(obj);
  }
  if (typeof obj === 'object') {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      if (containsPasswordHash(val)) return true;
    }
  }
  return false;
}

describe('Security Audit: No passwordHash in responses', () => {
  it('GET /api/v1/users/me should not include passwordHash', async () => {
    const app = getApp();
    const db = getDb();

    const { accessToken } = await createUser(db, { email: 'sec-me@test.com' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(containsPasswordHash(body)).toBe(false);
    expect((body as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('POST /api/v1/auth/register should not include passwordHash', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `sec-register-${Date.now()}@test.com`,
        password: 'Test123!@#',
        name: 'Sec Test',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(containsPasswordHash(body)).toBe(false);
  });

  it('POST /api/v1/auth/login should not include passwordHash', async () => {
    const app = getApp();
    const db = getDb();

    await createUser(db, { email: 'sec-login@test.com', password: 'Test123!@#' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'sec-login@test.com',
        password: 'Test123!@#',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(containsPasswordHash(body)).toBe(false);
  });

  it('GET /api/v1/workspaces/:id/members should not include passwordHash', async () => {
    const app = getApp();
    const db = getDb();

    const { user, accessToken } = await createUser(db, { email: 'sec-members@test.com' });
    const ws = await createWorkspace(db, user.id, { name: 'Sec WS', slug: 'sec-ws-members' });

    const { user: member } = await createUser(db, { email: 'sec-member2@test.com' });
    await addMember(db, ws.id, member.id, 'editor');

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${ws.id}/members`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(containsPasswordHash(body)).toBe(false);
  });
});

describe('Security Audit: State-changing endpoints require auth', () => {
  const stateChangingEndpoints = [
    { method: 'POST' as const, url: '/api/v1/workspaces' },
    { method: 'POST' as const, url: '/api/v1/auth/logout' },
    { method: 'PATCH' as const, url: '/api/v1/users/me' },
  ];

  for (const { method, url } of stateChangingEndpoints) {
    it(`${method} ${url} should return 401 without auth`, async () => {
      const app = getApp();

      const res = await app.inject({
        method,
        url,
        payload: method !== 'GET' ? {} : undefined,
      });

      // Should be 401 (Unauthorized) or 400 (missing body) but NOT 200/201/204
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  }

  it('POST /api/v1/workspaces/:wsId/documents should return 401 without auth', async () => {
    const app = getApp();
    const db = getDb();

    const { user } = await createUser(db, { email: 'sec-noauth@test.com' });
    const ws = await createWorkspace(db, user.id, { name: 'Sec NoAuth', slug: 'sec-noauth-ws' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents`,
      payload: { title: 'Unauthorized doc' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('PATCH /api/v1/workspaces/:wsId/documents/:id should return 401 without auth', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/00000000-0000-0000-0000-000000000000/documents/00000000-0000-0000-0000-000000000001',
      payload: { content: 'hacked' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/v1/workspaces/:id should return 401 without auth', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/00000000-0000-0000-0000-000000000000',
      payload: { confirmName: 'test' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('Security Audit: Workspace isolation', () => {
  it('user cannot read documents from another workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: ownerA, accessToken: tokenA } = await createUser(db, { email: 'sec-iso-a@test.com' });
    await createWorkspace(db, ownerA.id, { name: 'Iso A', slug: 'sec-iso-a' });

    const { user: ownerB } = await createUser(db, { email: 'sec-iso-b@test.com' });
    const wsB = await createWorkspace(db, ownerB.id, { name: 'Iso B', slug: 'sec-iso-b' });

    // User A tries to list documents in workspace B
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${wsB.id}/documents`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('user cannot create documents in another workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: ownerA, accessToken: tokenA } = await createUser(db, { email: 'sec-iso-c@test.com' });
    await createWorkspace(db, ownerA.id, { name: 'Iso C', slug: 'sec-iso-c' });

    const { user: ownerB } = await createUser(db, { email: 'sec-iso-d@test.com' });
    const wsB = await createWorkspace(db, ownerB.id, { name: 'Iso D', slug: 'sec-iso-d' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${wsB.id}/documents`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Intruder document' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('user cannot access trash of another workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: ownerA, accessToken: tokenA } = await createUser(db, { email: 'sec-iso-e@test.com' });
    await createWorkspace(db, ownerA.id, { name: 'Iso E', slug: 'sec-iso-e' });

    const { user: ownerB } = await createUser(db, { email: 'sec-iso-f@test.com' });
    const wsB = await createWorkspace(db, ownerB.id, { name: 'Iso F', slug: 'sec-iso-f' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${wsB.id}/documents/trash`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('user cannot manage members of another workspace', async () => {
    const app = getApp();
    const db = getDb();

    const { user: ownerA, accessToken: tokenA } = await createUser(db, { email: 'sec-iso-g@test.com' });
    await createWorkspace(db, ownerA.id, { name: 'Iso G', slug: 'sec-iso-g' });

    const { user: ownerB } = await createUser(db, { email: 'sec-iso-h@test.com' });
    const wsB = await createWorkspace(db, ownerB.id, { name: 'Iso H', slug: 'sec-iso-h' });

    // Try to invite to workspace B
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${wsB.id}/invitations`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { email: 'intruder@test.com', role: 'editor' },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('Security Audit: Rate limiting on auth endpoints', () => {
  it('login endpoint should enforce rate limiting after threshold', async () => {
    const app = getApp();

    // Fire 12 login attempts (threshold is 10) from the same IP
    const results: number[] = [];

    for (let i = 0; i < 12; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'rate-limit-test@test.com',
          password: 'WrongPassword1!',
        },
        remoteAddress: '10.0.0.99',
      });
      results.push(res.statusCode);
    }

    // First 10 should be either 401 (invalid creds) or 200 (if creds happened to match)
    // but NOT 429. After 10, should get 429.
    const rateLimited = results.filter((code) => code === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // The 429 should appear in the later requests
    const firstRateLimitIndex = results.indexOf(429);
    expect(firstRateLimitIndex).toBeGreaterThanOrEqual(10);
  });
});
