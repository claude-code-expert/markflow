/**
 * KMS Full-Flow Integration Test
 *
 * Covers: Categories CRUD → Documents CRUD → Tags (up to 5) →
 *         Category Move → Document Relations → Version History (with content for diff) →
 *         Document Graph → Soft Delete / Restore / Permanent Delete
 *
 * Uses content inspired by docs/sample/ test documents.
 * Runs as a single sequential test to maintain shared state across phases.
 */
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace } from '../helpers/factory.js';

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

interface Doc {
  id: number;
  title: string;
  slug: string;
  content: string;
  categoryId: number | null;
  currentVersion: number;
  authorId: number;
}

interface Cat {
  id: number;
  name: string;
  parentId: number | null;
}

describe('KMS Full-Flow Integration', () => {
  it('executes the entire KMS workflow end-to-end', async () => {
    const app = getApp();
    const db = getDb();

    // ─── Setup ───
    const { user, accessToken: token } = await createUser(db);
    const ws = await createWorkspace(db, user.id, { name: 'Agent WS' });
    const wsId = ws.id;
    const h = auth(token);

    // ═══════════════════════════════════════════════
    // Phase 1: Category (Folder) CRUD
    // ═══════════════════════════════════════════════

    // Create root categories
    const catDesignRes = await app.inject({
      method: 'POST', url: `/api/v1/workspaces/${wsId}/categories`,
      headers: h, payload: { name: '설계 문서' },
    });
    expect(catDesignRes.statusCode).toBe(201);
    const catDesign = (catDesignRes.json() as { category: Cat }).category.id;

    const catDevRes = await app.inject({
      method: 'POST', url: `/api/v1/workspaces/${wsId}/categories`,
      headers: h, payload: { name: '개발' },
    });
    expect(catDevRes.statusCode).toBe(201);
    const catDev = (catDevRes.json() as { category: Cat }).category.id;

    // Create subcategory under 개발
    const catFERes = await app.inject({
      method: 'POST', url: `/api/v1/workspaces/${wsId}/categories`,
      headers: h, payload: { name: '프론트엔드', parentId: catDev },
    });
    expect(catFERes.statusCode).toBe(201);
    const catDevFrontend = (catFERes.json() as { category: Cat }).category.id;

    // List categories (flat)
    const catListRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/categories`, headers: h,
    });
    expect(catListRes.statusCode).toBe(200);
    const cats = (catListRes.json() as { categories: Cat[] }).categories;
    expect(cats.length).toBe(3);

    // Category tree
    const treeRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/categories/tree`, headers: h,
    });
    expect(treeRes.statusCode).toBe(200);
    const tree = treeRes.json() as {
      categories: Array<{ id: number; name: string; children: Array<{ name: string }> }>;
    };
    expect(tree.categories.length).toBe(2);
    const devCat = tree.categories.find((c) => c.name === '개발');
    expect(devCat?.children.length).toBe(1);
    expect(devCat?.children[0]?.name).toBe('프론트엔드');

    // Rename category
    const renameRes = await app.inject({
      method: 'PATCH', url: `/api/v1/workspaces/${wsId}/categories/${catDesign}`,
      headers: h, payload: { name: '설계 & 아키텍처' },
    });
    expect(renameRes.statusCode).toBe(200);
    expect((renameRes.json() as { category: Cat }).category.name).toBe('설계 & 아키텍처');

    // ═══════════════════════════════════════════════
    // Phase 2: Document CRUD
    // ═══════════════════════════════════════════════

    // Create 5 documents in various categories
    const createDoc = async (title: string, categoryId?: number) => {
      const res = await app.inject({
        method: 'POST', url: `/api/v1/workspaces/${wsId}/documents`,
        headers: h, payload: { title, categoryId },
      });
      expect(res.statusCode).toBe(201);
      return (res.json() as { document: Doc }).document;
    };

    const docAgent = await createDoc('Squad Agent 소개', catDesign);
    const docStructure = await createDoc('MarkFlow 프로젝트 구조', catDesign);
    const docSEO = await createDoc('SEO 및 접근성 가이드', catDevFrontend);
    const docEditor = await createDoc('에디터 기능 테스트'); // root
    const docCommand = await createDoc('CLI 명령어 가이드', catDev);

    // Save content
    const content1 = '# Squad Agent\n\nClaude Code 서브에이전트 시스템입니다.\n\n## Quick Start\n\n```bash\ncurl -sL install.sh | bash\n```';
    const saveRes = await app.inject({
      method: 'PATCH', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}`,
      headers: h, payload: { content: content1 },
    });
    expect(saveRes.statusCode).toBe(200);
    const savedDoc = (saveRes.json() as { document: Doc }).document;
    expect(savedDoc.content).toBe(content1);
    expect(savedDoc.currentVersion).toBe(2);

    // Get by ID
    const getRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}`, headers: h,
    });
    expect(getRes.statusCode).toBe(200);
    expect((getRes.json() as { document: Doc }).document.categoryId).toBe(catDesign);

    // List with category filter
    const listRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents?categoryId=${catDesign}`, headers: h,
    });
    expect(listRes.statusCode).toBe(200);
    expect((listRes.json() as { documents: Doc[]; total: number }).total).toBe(2);

    // ═══════════════════════════════════════════════
    // Phase 3: Tags (up to 5)
    // ═══════════════════════════════════════════════

    // Save 5 tags
    const tagPutRes = await app.inject({
      method: 'PUT', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}/tags`,
      headers: h, payload: { tags: ['에이전트', 'Claude', 'AI', '자동화', '서브에이전트'] },
    });
    expect(tagPutRes.statusCode).toBe(200);
    const savedTags = (tagPutRes.json() as { tags: Array<{ name: string }> }).tags;
    expect(savedTags.length).toBe(5);

    // GET document tags (new endpoint)
    const tagGetRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}/tags`, headers: h,
    });
    expect(tagGetRes.statusCode).toBe(200);
    expect((tagGetRes.json() as { tags: Array<{ name: string }> }).tags.length).toBe(5);

    // Add tags to another doc
    await app.inject({
      method: 'PUT', url: `/api/v1/workspaces/${wsId}/documents/${docSEO.id}/tags`,
      headers: h, payload: { tags: ['SEO', '프론트엔드', 'React'] },
    });

    // List workspace tags
    const wsTagsRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/tags`, headers: h,
    });
    expect(wsTagsRes.statusCode).toBe(200);
    expect((wsTagsRes.json() as { tags: Array<{ name: string }> }).tags.length).toBe(8);

    // ═══════════════════════════════════════════════
    // Phase 4: Category Move
    // ═══════════════════════════════════════════════

    // Move docEditor (root) → 개발 > 프론트엔드
    const moveRes1 = await app.inject({
      method: 'PATCH', url: `/api/v1/workspaces/${wsId}/documents/${docEditor.id}`,
      headers: h, payload: { categoryId: catDevFrontend },
    });
    expect(moveRes1.statusCode).toBe(200);
    expect((moveRes1.json() as { document: Doc }).document.categoryId).toBe(catDevFrontend);

    // Move back to root
    const moveRes2 = await app.inject({
      method: 'PATCH', url: `/api/v1/workspaces/${wsId}/documents/${docEditor.id}`,
      headers: h, payload: { categoryId: null },
    });
    expect(moveRes2.statusCode).toBe(200);
    expect((moveRes2.json() as { document: Doc }).document.categoryId).toBeNull();

    // Verify tree
    const treeRes2 = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/categories/tree`, headers: h,
    });
    const tree2 = treeRes2.json() as {
      categories: Array<{
        name: string; documents: Array<{ id: number }>;
        children: Array<{ name: string; documents: Array<{ id: number }> }>;
      }>;
      uncategorized: Array<{ id: number }>;
    };
    expect(tree2.uncategorized.some((d) => d.id === docEditor.id)).toBe(true);
    const devCat2 = tree2.categories.find((c) => c.name === '개발');
    const feCat = devCat2?.children.find((c) => c.name === '프론트엔드');
    expect(feCat?.documents.some((d) => d.id === docSEO.id)).toBe(true);

    // ═══════════════════════════════════════════════
    // Phase 5: Document Relations
    // ═══════════════════════════════════════════════

    // Set relations: Agent → Structure (next), Agent ↔ SEO (related)
    const relSetRes = await app.inject({
      method: 'PUT', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}/relations`,
      headers: h, payload: { next: String(docStructure.id), related: [String(docSEO.id)] },
    });
    expect(relSetRes.statusCode).toBe(200);

    // Verify forward relations
    const relGetRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}/relations`, headers: h,
    });
    expect(relGetRes.statusCode).toBe(200);
    const rels = relGetRes.json() as {
      prev: { id: number } | null; next: { id: number } | null;
      related: Array<{ id: number }>;
    };
    expect(rels.next?.id).toBe(docStructure.id);
    expect(rels.related.some((r) => r.id === docSEO.id)).toBe(true);

    // Verify reverse relation (Structure should have Agent as prev)
    const relRevRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents/${docStructure.id}/relations`, headers: h,
    });
    expect(relRevRes.statusCode).toBe(200);
    expect((relRevRes.json() as { prev: { id: number } | null }).prev?.id).toBe(docAgent.id);

    // ═══════════════════════════════════════════════
    // Phase 6: Version History with content (for diff)
    // ═══════════════════════════════════════════════

    // Create more versions: v3, v4
    await app.inject({
      method: 'PATCH', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}`,
      headers: h,
      payload: { content: '# Squad Agent v2\n\n업데이트된 설명입니다.\n\n## Features\n\n- 리뷰\n- 기획' },
    });
    await app.inject({
      method: 'PATCH', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}`,
      headers: h,
      payload: { content: '# Squad Agent v3\n\n최종 설명입니다.\n\n## Features\n\n- 리뷰\n- 기획\n- QA\n- 디버깅' },
    });

    // Get versions WITH content
    const versionsRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents/${docAgent.id}/versions`, headers: h,
    });
    expect(versionsRes.statusCode).toBe(200);
    const versions = (versionsRes.json() as {
      versions: Array<{ id: number; version: number; content: string; createdAt: string }>;
    }).versions;
    expect(versions.length).toBe(4); // v1, v2, v3, v4
    expect(versions[0]!.version).toBe(4); // newest first
    expect(versions[0]!.content).toContain('Squad Agent v3');
    expect(versions[1]!.content).toContain('Squad Agent v2');
    expect(versions[3]!.content).toBe(''); // v1 was empty

    // ═══════════════════════════════════════════════
    // Phase 7: Document Graph
    // ═══════════════════════════════════════════════

    const graphRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/graph`, headers: h,
    });
    expect(graphRes.statusCode).toBe(200);
    const graph = graphRes.json() as {
      nodes: Array<{ id: number; title: string }>;
      edges: Array<{ source: number; target: number; type: string }>;
    };
    expect(graph.nodes.length).toBe(5);
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);
    expect(graph.edges.some((e) => e.source === docAgent.id && e.target === docStructure.id)).toBe(true);

    // ═══════════════════════════════════════════════
    // Phase 8: Soft Delete / Restore / Permanent Delete
    // ═══════════════════════════════════════════════

    // Soft delete
    const delRes = await app.inject({
      method: 'DELETE', url: `/api/v1/workspaces/${wsId}/documents/${docCommand.id}`, headers: h,
    });
    expect(delRes.statusCode).toBe(204);

    // Appears in trash
    const trashRes = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/trash`, headers: h,
    });
    expect(trashRes.statusCode).toBe(200);
    expect((trashRes.json() as { documents: Array<{ id: number }> }).documents.some(
      (d) => d.id === docCommand.id,
    )).toBe(true);

    // Gone from normal list
    const listRes2 = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents`, headers: h,
    });
    expect((listRes2.json() as { documents: Array<{ id: number }> }).documents.some(
      (d) => d.id === docCommand.id,
    )).toBe(false);

    // Restore
    const restoreRes = await app.inject({
      method: 'POST', url: `/api/v1/workspaces/${wsId}/trash/${docCommand.id}/restore`, headers: h,
    });
    expect(restoreRes.statusCode).toBe(200);

    // Back in normal list
    const listRes3 = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/documents`, headers: h,
    });
    expect((listRes3.json() as { documents: Array<{ id: number }> }).documents.some(
      (d) => d.id === docCommand.id,
    )).toBe(true);

    // Soft delete again → permanent delete
    await app.inject({
      method: 'DELETE', url: `/api/v1/workspaces/${wsId}/documents/${docCommand.id}`, headers: h,
    });
    const permDelRes = await app.inject({
      method: 'DELETE', url: `/api/v1/workspaces/${wsId}/trash/${docCommand.id}`, headers: h,
    });
    expect(permDelRes.statusCode).toBe(204);

    // Gone from trash too
    const trashRes2 = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${wsId}/trash`, headers: h,
    });
    expect((trashRes2.json() as { documents: Array<{ id: number }> }).documents.some(
      (d) => d.id === docCommand.id,
    )).toBe(false);

    // ═══════════════════════════════════════════════
    // Phase 9: Category constraints
    // ═══════════════════════════════════════════════

    // Cannot delete category with subcategories
    const catDelRes = await app.inject({
      method: 'DELETE', url: `/api/v1/workspaces/${wsId}/categories/${catDev}`,
      headers: h, payload: { confirmName: '개발' },
    });
    expect(catDelRes.statusCode).toBe(400);
  });
});
