/**
 * T127 -- Comment CRUD Integration Tests
 *
 * 댓글 생성/조회/수정/삭제/해결/권한/스레딩 7개 시나리오
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, addMember, createDocument, createComment } from '../helpers/factory.js';

const BASE_URL = '/api/v1/workspaces';

function commentUrl(wsId: number, docId: number, commentId?: number) {
  const base = `${BASE_URL}/${wsId}/documents/${docId}/comments`;
  return commentId ? `${base}/${commentId}` : base;
}

interface CommentResponse {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  documentId: number;
  parentId: number | null;
  resolved: boolean;
  resolvedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

describe('Comments API (/api/v1/workspaces/:wsId/documents/:docId/comments)', () => {
  // --- Scenario 1: Create (POST) ---

  describe('Create (POST)', () => {
    it('should create a comment and return 201 with content/authorId/authorName', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      const res = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'This is a test comment' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json() as { comment: CommentResponse };
      expect(body.comment.content).toBe('This is a test comment');
      expect(body.comment.authorId).toBe(user.id);
      expect(body.comment.authorName).toBeTruthy();
    });

    it('should return 400 for empty content', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      const res = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: '' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 for content exceeding 5000 characters', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      const res = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'x'.repeat(5001) },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_FIELDS');
    });
  });

  // --- Scenario 2: List (GET) ---

  describe('List (GET)', () => {
    it('should return 200 with comments array including authorName in createdAt ascending order', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      // Create comments via API to get proper timestamps
      await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'First comment' },
      });
      await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Second comment' },
      });

      const res = await app.inject({
        method: 'GET',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { comments: CommentResponse[] };
      expect(body.comments).toHaveLength(2);
      expect(body.comments[0].content).toBe('First comment');
      expect(body.comments[1].content).toBe('Second comment');
      expect(body.comments[0].authorName).toBeTruthy();

      // Verify ascending order by createdAt
      const first = new Date(body.comments[0].createdAt).getTime();
      const second = new Date(body.comments[1].createdAt).getTime();
      expect(first).toBeLessThanOrEqual(second);
    });
  });

  // --- Scenario 3: Update (PATCH) ---

  describe('Update (PATCH)', () => {
    it('should update comment content and return 200', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      // Create comment via API
      const createRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Original content' },
      });
      const created = (createRes.json() as { comment: CommentResponse }).comment;

      const res = await app.inject({
        method: 'PATCH',
        url: commentUrl(ws.id, doc.id, created.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Updated content' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { comment: CommentResponse };
      expect(body.comment.content).toBe('Updated content');
    });
  });

  // --- Scenario 4: Delete (DELETE) ---

  describe('Delete (DELETE)', () => {
    it('should delete comment and return 204', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      // Create comment via API
      const createRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'To be deleted' },
      });
      const created = (createRes.json() as { comment: CommentResponse }).comment;

      const res = await app.inject({
        method: 'DELETE',
        url: commentUrl(ws.id, doc.id, created.id),
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(204);

      // Verify deletion via GET
      const listRes = await app.inject({
        method: 'GET',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const listBody = listRes.json() as { comments: CommentResponse[] };
      const found = listBody.comments.find((c) => c.id === created.id);
      expect(found).toBeUndefined();
    });
  });

  // --- Scenario 5: Resolve (PATCH resolved) ---

  describe('Resolve (PATCH resolved)', () => {
    it('should toggle resolved to true and set resolvedBy', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      // Create comment via API
      const createRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Resolvable comment' },
      });
      const created = (createRes.json() as { comment: CommentResponse }).comment;

      const res = await app.inject({
        method: 'PATCH',
        url: commentUrl(ws.id, doc.id, created.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { resolved: true },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { comment: CommentResponse };
      expect(body.comment.resolved).toBe(true);
      expect(body.comment.resolvedBy).toBe(user.id);
    });
  });

  // --- Scenario 6: Permissions ---

  describe('Permissions', () => {
    it('should return 403 when viewer tries to create a comment', async () => {
      const app = getApp();
      const db = getDb();
      const { user: owner, accessToken: ownerToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);
      const doc = await createDocument(app, ws.id, ownerToken, 'Test Doc');

      const { user: viewer, accessToken: viewerToken } = await createUser(db);
      await addMember(db, ws.id, viewer.id, 'viewer');

      const res = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { content: 'Viewer comment' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 when another editor tries to update a comment', async () => {
      const app = getApp();
      const db = getDb();
      const { user: owner, accessToken: ownerToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);
      const doc = await createDocument(app, ws.id, ownerToken, 'Test Doc');

      // Owner creates comment
      const createRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { content: 'Owner comment' },
      });
      const created = (createRes.json() as { comment: CommentResponse }).comment;

      // Another editor tries to update
      const { user: editor, accessToken: editorToken } = await createUser(db);
      await addMember(db, ws.id, editor.id, 'editor');

      const res = await app.inject({
        method: 'PATCH',
        url: commentUrl(ws.id, doc.id, created.id),
        headers: { authorization: `Bearer ${editorToken}` },
        payload: { content: 'Hijacked content' },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json() as { error: { message: string } };
      expect(body.error.message).toContain('You can only edit your own comments');
    });

    it('should return 403 when another editor tries to delete a comment', async () => {
      const app = getApp();
      const db = getDb();
      const { user: owner, accessToken: ownerToken } = await createUser(db);
      const ws = await createWorkspace(db, owner.id);
      const doc = await createDocument(app, ws.id, ownerToken, 'Test Doc');

      // Owner creates comment
      const createRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { content: 'Owner comment' },
      });
      const created = (createRes.json() as { comment: CommentResponse }).comment;

      // Another editor tries to delete
      const { user: editor, accessToken: editorToken } = await createUser(db);
      await addMember(db, ws.id, editor.id, 'editor');

      const res = await app.inject({
        method: 'DELETE',
        url: commentUrl(ws.id, doc.id, created.id),
        headers: { authorization: `Bearer ${editorToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json() as { error: { message: string } };
      expect(body.error.message).toContain('You can only delete your own comments');
    });

    it('should return 401 when no authorization header is provided', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      const res = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        payload: { content: 'No auth comment' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // --- Scenario 7: Threading ---

  describe('Threading', () => {
    it('should create a threaded reply with parentId', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      // Create parent comment
      const parentRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Parent comment' },
      });
      const parent = (parentRes.json() as { comment: CommentResponse }).comment;

      // Create reply
      const replyRes = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Reply comment', parentId: parent.id },
      });

      expect(replyRes.statusCode).toBe(201);
      const reply = (replyRes.json() as { comment: CommentResponse }).comment;
      expect(reply.parentId).toBe(parent.id);
    });

    it('should return 404 for invalid parentId', async () => {
      const app = getApp();
      const db = getDb();
      const { user, accessToken } = await createUser(db);
      const ws = await createWorkspace(db, user.id);
      const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

      const res = await app.inject({
        method: 'POST',
        url: commentUrl(ws.id, doc.id),
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'Reply to nothing', parentId: 999999 },
      });

      expect(res.statusCode).toBe(404);
      const body = res.json() as { error: { message: string } };
      expect(body.error.message).toContain('Parent comment not found');
    });
  });
});
