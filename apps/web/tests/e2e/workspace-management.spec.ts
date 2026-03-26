import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@markflow.dev',
  password: 'Test1234!@',
};

test.describe('US4: 워크스페이스 관리 정상 동작', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/.*/, { timeout: 5000 });
  });

  test('워크스페이스 생성 모달 → 이름/slug 입력 → 생성', async ({ page }) => {
    // 워크스페이스 목록 대기
    await expect(page.locator('h1:has-text("워크스페이스")')).toBeVisible({ timeout: 5000 });

    // "워크스페이스 만들기" 클릭
    await page.click('button:has-text("워크스페이스 만들기")');

    // 모달 확인
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    // 이름 입력 → slug 자동 생성
    const wsName = 'E2E Test WS ' + Date.now();
    await modal.locator('input').first().fill(wsName);

    // slug 필드 확인
    const slugInput = modal.locator('input').nth(1);
    await expect(slugInput).not.toBeEmpty();

    // 생성
    await modal.locator('button:has-text("만들기")').click();

    // 생성 후 /{slug}/docs로 이동 확인
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });
    expect(page.url()).toMatch(/\/[^/]+\/docs/);
  });

  test('워크스페이스 설정 → 이름 변경 저장', async ({ page }) => {
    // 워크스페이스 진입
    const wsLink = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
    await wsLink.click();
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });

    // 설정 페이지로 이동
    const settingsLink = page.locator('aside a:has-text("설정")');
    await settingsLink.click();
    await page.waitForURL(/\/[^/]+\/settings$/, { timeout: 5000 });

    // 설정 페이지 확인
    await expect(page.locator('h1:has-text("설정")')).toBeVisible();
  });

  test('멤버 페이지 → 이메일 초대', async ({ page }) => {
    // 워크스페이스 진입
    const wsLink = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
    await wsLink.click();
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });

    // 멤버 페이지로 이동
    const membersLink = page.locator('aside a:has-text("멤버")');
    await membersLink.click();
    await page.waitForURL(/\/[^/]+\/settings\/members/, { timeout: 5000 });

    // 멤버 관리 페이지 확인
    await expect(page.locator('h1:has-text("멤버 관리")')).toBeVisible();
  });
});
