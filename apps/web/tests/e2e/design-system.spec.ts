import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@markflow.dev',
  password: 'Test1234!@',
};

test.describe('US2: 프로토타입 디자인 시스템 적용', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    // 앱 진입 대기
    await page.waitForURL(/\/.*/, { timeout: 5000 });
  });

  test('앱 셸 헤더 높이가 56px이다', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    expect(box?.height).toBe(56);
  });

  test('사이드바 폭이 260px이다', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box?.width).toBe(260);
  });

  test('사이드바에 워크스페이스 셀렉터가 표시된다', async ({ page }) => {
    // 워크스페이스 진입
    const wsLink = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
    await wsLink.click();
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });

    const sidebar = page.locator('aside');
    // 워크스페이스 셀렉터 존재 확인
    await expect(sidebar.locator('a[href="/"]').first()).toBeVisible();
  });

  test('사이드바에 검색 바가 표시된다', async ({ page }) => {
    const wsLink = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
    await wsLink.click();
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });

    await expect(page.locator('text=문서 검색...')).toBeVisible();
    await expect(page.locator('text=⌘K')).toBeVisible();
  });

  test('사이드바에 네비게이션 5개 항목이 표시된다', async ({ page }) => {
    const wsLink = page.locator('a[href^="/"]').filter({ hasText: /.+/ }).first();
    await wsLink.click();
    await page.waitForURL(/\/[^/]+\/docs/, { timeout: 5000 });

    const sidebar = page.locator('aside');
    await expect(sidebar.locator('text=문서')).toBeVisible();
    await expect(sidebar.locator('text=휴지통')).toBeVisible();
    await expect(sidebar.locator('text=멤버')).toBeVisible();
    await expect(sidebar.locator('text=그래프')).toBeVisible();
    await expect(sidebar.locator('text=설정')).toBeVisible();
  });

  test('배경색이 프로토타입 디자인 토큰과 일치한다', async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    });
    expect(bgColor).toBe('#F8F7F4');

    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    });
    expect(accentColor).toBe('#1A56DB');
  });
});
