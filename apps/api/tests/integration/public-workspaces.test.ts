import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember, createJoinRequest } from '../helpers/factory.js';

describe('GET /api/v1/workspaces/public', () => {
  it('returns public workspaces the user is NOT a member of', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner, accessToken: ownerToken } = await createUser(db, { email: 'owner@test.com' });
    const { user: searcher, accessToken: searcherToken } = await createUser(db, { email: 'searcher@test.com' });

    // Create public workspace (owner is member, searcher is not)
    const publicWs = await createWorkspace(db, owner.id, { name: 'Public Docs', slug: 'public-docs', isPublic: true });
    // Create private workspace (should not appear)
    await createWorkspace(db, owner.id, { name: 'Private WS', slug: 'private-ws', isPublic: false });
    // Create workspace where searcher is member (should not appear)
    const memberWs = await createWorkspace(db, owner.id, { name: 'Member WS', slug: 'member-ws', isPublic: true });
    await addMember(db, memberWs.id, searcher.id, 'editor');

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces/public',
      headers: { authorization: `Bearer ${searcherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.workspaces).toHaveLength(1);
    expect(body.workspaces[0].name).toBe('Public Docs');
    expect(body.workspaces[0].memberCount).toBeGreaterThanOrEqual(1);
    expect(body.workspaces[0].pendingRequest).toBe(false);
  });

  it('sets pendingRequest to true when user has pending join request', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db, { email: 'owner2@test.com' });
    const { user: searcher, accessToken: searcherToken } = await createUser(db, { email: 'searcher2@test.com' });

    const publicWs = await createWorkspace(db, owner.id, { name: 'Team WS', slug: 'team-ws', isPublic: true });
    await createJoinRequest(db, publicWs.id, searcher.id, { status: 'pending' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces/public',
      headers: { authorization: `Bearer ${searcherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.workspaces[0].pendingRequest).toBe(true);
  });

  it('filters by search query', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const { accessToken: searcherToken } = await createUser(db);

    await createWorkspace(db, owner.id, { name: 'Alpha Docs', slug: 'alpha-docs', isPublic: true });
    await createWorkspace(db, owner.id, { name: 'Beta Notes', slug: 'beta-notes', isPublic: true });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces/public?q=alpha',
      headers: { authorization: `Bearer ${searcherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.workspaces).toHaveLength(1);
    expect(body.workspaces[0].name).toBe('Alpha Docs');
  });

  it('paginates results', async () => {
    const app = getApp();
    const db = getDb();

    const { user: owner } = await createUser(db);
    const { accessToken: searcherToken } = await createUser(db);

    for (let i = 1; i <= 5; i++) {
      await createWorkspace(db, owner.id, { name: `WS ${i}`, slug: `ws-${i}`, isPublic: true });
    }

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces/public?page=1&limit=2',
      headers: { authorization: `Bearer ${searcherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.workspaces).toHaveLength(2);
    expect(body.total).toBe(5);
    expect(body.page).toBe(1);
  });

  it('requires authentication', async () => {
    const app = getApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/workspaces/public',
    });

    expect(res.statusCode).toBe(401);
  });
});
