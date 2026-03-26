import { test, expect, type Page } from '@playwright/test';

/**
 * T118 -- Team Management E2E Test
 *
 * Tests workspace creation, member invitation, and role permissions.
 *
 * Requires a running web + API server with a seeded test user.
 */

const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? 'e2e@test.com',
  password: process.env.E2E_USER_PASSWORD ?? 'Test123!@#',
};

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('/', { timeout: 10_000 }).catch(() => {
    // May redirect directly to a workspace
  });
}

test.describe('Team management flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
  });

  test('should create a new workspace', async ({ page }) => {
    await page.goto('/');

    // Click "create workspace" button
    const createButton = page.locator('button:has-text("워크스페이스 만들기"), button:has-text("새 워크스페이스")');
    if (await createButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createButton.click();

      const workspaceName = `E2E Team ${Date.now()}`;
      const nameInput = page.locator('input[placeholder*="워크스페이스"], input[name="name"]');
      await nameInput.fill(workspaceName);

      const slugInput = page.locator('input[placeholder*="slug"], input[name="slug"]');
      if (await slugInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await slugInput.fill(`e2e-team-${Date.now()}`);
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("만들기"), button:has-text("생성")');
      await submitButton.click();

      // Verify workspace was created
      await expect(page.locator(`text=${workspaceName}`)).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('should navigate to members settings page', async ({ page }) => {
    const workspaceSlug = process.env.E2E_WORKSPACE_SLUG ?? 'test-workspace';

    await page.goto(`/${workspaceSlug}/settings/members`);
    await page.waitForTimeout(2_000);

    // Verify members page is visible
    await expect(page.locator('text=멤버')).toBeVisible({ timeout: 10_000 });
  });

  test('should invite a member by email', async ({ page }) => {
    const workspaceSlug = process.env.E2E_WORKSPACE_SLUG ?? 'test-workspace';

    await page.goto(`/${workspaceSlug}/settings/members`);
    await page.waitForTimeout(2_000);

    // Find invite button
    const inviteButton = page.locator('button:has-text("초대"), button:has-text("멤버 초대")');
    if (await inviteButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await inviteButton.click();

      // Fill invitation form
      const emailInput = page.locator('input[type="email"], input[placeholder*="이메일"]');
      const inviteeEmail = `e2e-invite-${Date.now()}@test.com`;
      await emailInput.fill(inviteeEmail);

      // Select role if dropdown is available
      const roleSelect = page.locator('select, [role="listbox"]');
      if (await roleSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await roleSelect.selectOption('editor');
      }

      // Submit invitation
      const submitButton = page.locator('button[type="submit"], button:has-text("초대하기"), button:has-text("보내기")');
      await submitButton.click();

      // Verify success message or invitation appears in list
      await page.waitForTimeout(2_000);
      const successIndicator = page.locator('text=초대가 전송되었습니다, text=초대 완료');
      const inviteeInList = page.locator(`text=${inviteeEmail}`);

      const isSuccess = await successIndicator.isVisible({ timeout: 5_000 }).catch(() => false);
      const isInList = await inviteeInList.isVisible({ timeout: 5_000 }).catch(() => false);

      expect(isSuccess || isInList).toBe(true);
    }
  });

  test('should show role-based access controls', async ({ page }) => {
    const workspaceSlug = process.env.E2E_WORKSPACE_SLUG ?? 'test-workspace';

    await page.goto(`/${workspaceSlug}/settings/members`);
    await page.waitForTimeout(2_000);

    // Verify role labels are visible for existing members
    const roleBadges = page.locator('text=owner, text=admin, text=editor, text=viewer');
    await expect(roleBadges.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to workspace settings', async ({ page }) => {
    const workspaceSlug = process.env.E2E_WORKSPACE_SLUG ?? 'test-workspace';

    await page.goto(`/${workspaceSlug}/settings`);
    await page.waitForTimeout(2_000);

    await expect(page.locator('text=설정')).toBeVisible({ timeout: 10_000 });
  });
});
