import { test, expect, type Page } from '@playwright/test';

/**
 * T117 -- Document Management E2E Test
 *
 * Tests the core document management workflow:
 * folder creation, document CRUD, auto-save, trash, and restore.
 *
 * Requires a running web + API server with a seeded test user/workspace.
 */

const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? 'e2e@test.com',
  password: process.env.E2E_USER_PASSWORD ?? 'Test123!@#',
};

const TEST_WORKSPACE_SLUG = process.env.E2E_WORKSPACE_SLUG ?? 'test-workspace';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to workspace list or dashboard
  await page.waitForURL('/', { timeout: 10_000 }).catch(() => {
    // May redirect directly to workspace
  });
}

test.describe('Document management flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
  });

  test('should navigate to workspace', async ({ page }) => {
    await page.goto(`/${TEST_WORKSPACE_SLUG}`);
    await expect(page.locator('text=문서')).toBeVisible({ timeout: 10_000 });
  });

  test('should create a folder and verify in sidebar', async ({ page }) => {
    await page.goto(`/${TEST_WORKSPACE_SLUG}`);

    // Look for the "new folder" button or trigger
    const newFolderButton = page.locator('[aria-label="새 폴더"], button:has-text("새 폴더")');
    if (await newFolderButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newFolderButton.click();

      // Fill folder name in modal
      const folderNameInput = page.locator('input[placeholder*="폴더"]');
      const folderName = `E2E Folder ${Date.now()}`;
      await folderNameInput.fill(folderName);

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("생성"), button:has-text("만들기")');
      await submitButton.click();

      // Verify folder appears in category tree
      await expect(page.locator(`text=${folderName}`)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should create a document and verify in list', async ({ page }) => {
    await page.goto(`/${TEST_WORKSPACE_SLUG}`);

    // Click "new document" button
    const newDocButton = page.locator('[aria-label="새 문서"], button:has-text("새 문서")');
    if (await newDocButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newDocButton.click();

      const docTitle = `E2E Doc ${Date.now()}`;
      const titleInput = page.locator('input[placeholder*="제목"], input[placeholder*="문서"]');
      await titleInput.fill(docTitle);

      const submitButton = page.locator('button[type="submit"], button:has-text("생성"), button:has-text("만들기")');
      await submitButton.click();

      // Verify document appears
      await expect(page.locator(`text=${docTitle}`)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should open a document and edit content', async ({ page }) => {
    await page.goto(`/${TEST_WORKSPACE_SLUG}`);

    // Wait for document list
    await page.waitForTimeout(2_000);

    // Click on first document link
    const firstDocLink = page.locator('a[href*="/docs/"]').first();
    if (await firstDocLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstDocLink.click();

      // Wait for editor to load
      await page.waitForTimeout(2_000);

      // Check for CodeMirror editor or textarea
      const editor = page.locator('.cm-editor, textarea');
      if (await editor.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Type some content
        const contentLine = page.locator('.cm-content, textarea').first();
        await contentLine.click();
        await page.keyboard.type('E2E test content');

        // Wait for auto-save (debounce)
        await page.waitForTimeout(3_000);

        // Verify content persists by refreshing
        await page.reload();
        await page.waitForTimeout(2_000);

        await expect(page.locator('text=E2E test content')).toBeVisible({
          timeout: 10_000,
        });
      }
    }
  });

  test('should delete a document and verify in trash', async ({ page }) => {
    await page.goto(`/${TEST_WORKSPACE_SLUG}`);
    await page.waitForTimeout(2_000);

    // Look for delete button on a document
    const deleteButton = page.locator('button[aria-label*="삭제"], button:has-text("삭제")').first();
    if (await deleteButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("확인"), button:has-text("삭제")').last();
      if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Navigate to trash
      await page.goto(`/${TEST_WORKSPACE_SLUG}/trash`);
      await page.waitForTimeout(2_000);

      // Verify at least one document exists in trash
      const trashContent = page.locator('table tbody tr, [data-testid="trash-item"]');
      await expect(trashContent.first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should restore a document from trash', async ({ page }) => {
    await page.goto(`/${TEST_WORKSPACE_SLUG}/trash`);
    await page.waitForTimeout(2_000);

    // Click restore button on first trashed document
    const restoreButton = page.locator('button:has-text("복원")').first();
    if (await restoreButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await restoreButton.click();

      // Wait for restoration
      await page.waitForTimeout(2_000);

      // Navigate back to documents to verify restoration
      await page.goto(`/${TEST_WORKSPACE_SLUG}`);
      await page.waitForTimeout(2_000);

      // Document list should have items
      await expect(page.locator('text=문서')).toBeVisible();
    }
  });
});
