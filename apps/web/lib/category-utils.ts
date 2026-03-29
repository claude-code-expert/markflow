import type { Category as TreeCategory, TreeDocument } from '../components/category-tree';

export interface FlatCategory {
  id: string;
  path: string;
}

export interface FlatDocument {
  id: string;
  title: string;
}

/**
 * 트리 구조 카테고리를 flat 리스트로 변환 (경로 포함)
 */
export function flattenCategories(cats: TreeCategory[], prefix = ''): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const cat of cats) {
    const path = prefix ? `${prefix} / ${cat.name}` : cat.name;
    result.push({ id: cat.id, path });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, path));
    }
  }
  return result;
}

/**
 * 트리에서 모든 문서를 수집 (카테고리 + 미분류 포함)
 */
export function collectAllDocs(cats: TreeCategory[], uncategorized: TreeDocument[]): FlatDocument[] {
  const docs: FlatDocument[] = [];
  function walk(nodes: TreeCategory[]) {
    for (const cat of nodes) {
      if (cat.documents) {
        for (const d of cat.documents) {
          docs.push({ id: d.id, title: d.title || '제목 없음' });
        }
      }
      if (cat.children) walk(cat.children);
    }
  }
  walk(cats);
  for (const d of uncategorized) {
    docs.push({ id: d.id, title: d.title || '제목 없음' });
  }
  return docs;
}
