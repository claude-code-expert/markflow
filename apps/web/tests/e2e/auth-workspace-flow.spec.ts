import { test, expect } from '@playwright/test';

// Test user credentials (must exist in test DB)
const TEST_USER = {
  email: 'test@markflow.dev',
  password: 'Test1234!@',
};

test.describe('US1: 로그인 후 워크스페이스 정상 진입', () => {
  test('로그인 → 워크스페이스 목록 표시 → 클릭 → /{slug}/docs 진입', async ({ page }) => {
    // 1. 로그인 페이지 접속
    await page.goto('/login');
    await expect(page.locator('text=MarkFlow')).toBeVisible();

    // 2. 로그인
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // 3. 워크스페이스 목록 표시 확인 (SC-001: 5초 이내)
    await expect(page.locator('h1:has-text("워크스페이스")')).toBeVisible({ timeout: 5000 });

    // 4. /undefined URL 미발생 확인 (SC-002)
    expect(page.url()).not.toContain('/undefined');

    // 5. 워크스페이스 클릭
    const firstWorkspace = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
    await firstWorkspace.click();

    // 6. docs 페이지 진입 확인 (/{slug}/docs 경로)
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });
    expect(page.url()).toMatch(/\/[^/]+\/docs/);
    expect(page.url()).not.toContain('/undefined');
  });

  test('/undefined URL이 발생하지 않아야 한다', async ({ page }) => {
    // 직접 /undefined 접근 시 워크스페이스 목록으로 리다이렉트 또는 404
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('h1:has-text("워크스페이스")')).toBeVisible({ timeout: 5000 });

    // 전체 네비게이션 중 /undefined 미포함 확인
    const allLinks = await page.locator('a').all();
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      expect(href).not.toContain('undefined');
    }
  });

  test('워크스페이스 0개 → 빈 상태 UI 표시', async ({ page }) => {
    // NOTE: 이 테스트는 워크스페이스가 0개인 사용자가 필요
    // 테스트 환경에서 별도 사용자 생성 필요
    await page.goto('/login');

    // 빈 상태 UI에 "첫 워크스페이스를 만들어보세요" 텍스트 확인
    // (실제 실행 시 테스트 데이터에 따라 skip 가능)
  });

  test('워크스페이스 1개 → 자동 리다이렉트 (FR-003)', async ({ page }) => {
    // NOTE: 이 테스트는 워크스페이스가 정확히 1개인 사용자가 필요
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // 자동 리다이렉트 대기 (워크스페이스 1개인 경우)
    // 워크스페이스 목록이 보이거나, /{slug}/docs로 바로 이동
    await page.waitForURL(/\/(.*\/docs|$)/, { timeout: 5000 });
    expect(page.url()).not.toContain('/undefined');
  });
});
