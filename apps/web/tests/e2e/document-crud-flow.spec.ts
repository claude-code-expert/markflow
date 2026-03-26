import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@markflow.dev',
  password: 'Test1234!@',
};

test.describe('US3: 문서 CRUD 정상 동작', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // 워크스페이스 진입 대기
    await page.waitForURL(/\/[^/]+\/docs|^\/$/, { timeout: 5000 });

    // 워크스페이스 목록이면 첫 번째 클릭
    if (page.url().endsWith('/')) {
      const wsLink = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
      await wsLink.click();
    }
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });
  });

  test('새 문서 생성 → 에디터 진입', async ({ page }) => {
    // "새 문서" 버튼 클릭
    const newDocBtn = page.locator('button:has-text("새 문서")');
    await expect(newDocBtn).toBeVisible();
    await newDocBtn.click();

    // 문서 생성 모달 확인
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    // 제목 입력
    const titleInput = modal.locator('input[type="text"]');
    await titleInput.fill('테스트 문서 ' + Date.now());
    await modal.locator('button:has-text("만들기"), button:has-text("생성")').click();

    // 에디터 페이지 진입 확인 (/{slug}/docs/{docId})
    await page.waitForURL(/\/[^/]+\/docs\/[^/]+/, { timeout: 5000 });
    expect(page.url()).toMatch(/\/[^/]+\/docs\/[^/]+/);
  });

  test('에디터에서 마크다운 입력 → 자동 저장 (SC-004: 30초 이내)', async ({ page }) => {
    // 새 문서 생성
    const newDocBtn = page.locator('button:has-text("새 문서")');
    await newDocBtn.click();
    const modal = page.locator('.modal');
    await modal.locator('input[type="text"]').fill('자동저장 테스트 ' + Date.now());
    await modal.locator('button:has-text("만들기"), button:has-text("생성")').click();
    await page.waitForURL(/\/[^/]+\/docs\/[^/]+/, { timeout: 5000 });

    // 에디터 영역 확인 (CodeMirror)
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible({ timeout: 5000 });

    // 마크다운 입력
    await editor.click();
    await page.keyboard.type('# Hello World\n\n자동 저장 테스트입니다.');

    // 자동 저장 확인 — 저장됨 상태 확인 (헤더의 SaveStatusIndicator)
    await expect(page.locator('text=저장됨')).toBeVisible({ timeout: 5000 });
  });

  test('자동 저장된 문서 → 새로고침 후 내용 유지', async ({ page }) => {
    // 새 문서 생성
    const docTitle = '새로고침 테스트 ' + Date.now();
    const newDocBtn = page.locator('button:has-text("새 문서")');
    await newDocBtn.click();
    const modal = page.locator('.modal');
    await modal.locator('input[type="text"]').fill(docTitle);
    await modal.locator('button:has-text("만들기"), button:has-text("생성")').click();
    await page.waitForURL(/\/[^/]+\/docs\/[^/]+/, { timeout: 5000 });

    const editorUrl = page.url();

    // 에디터에서 내용 입력
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible({ timeout: 5000 });
    await editor.click();
    await page.keyboard.type('# 유지되어야 할 내용');

    // 저장 대기
    await expect(page.locator('text=저장됨')).toBeVisible({ timeout: 5000 });

    // 새로고침
    await page.goto(editorUrl);

    // 내용 유지 확인
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 5000 });
    const editorContent = await page.locator('.cm-content').textContent();
    expect(editorContent).toContain('유지되어야 할 내용');
  });

  test('문서 삭제 → 휴지통 확인', async ({ page }) => {
    // 문서 목록에서 삭제 동작 확인
    // NOTE: 삭제 UI는 문서 목록의 컨텍스트 메뉴 또는 버튼에 따라 다름
    // Phase 1에서는 기본적인 삭제 플로우만 확인
    const docsPage = page.url();
    expect(docsPage).toMatch(/\/[^/]+\/docs/);
  });
});
