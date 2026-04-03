import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@markflow.dev',
  password: 'Test1234!@',
};

/**
 * Preset CSS variable values extracted from PRESET_CSS in
 * apps/web/app/(app)/[workspaceSlug]/settings/theme/page.tsx
 *
 * Only the variables verified in the test are listed here.
 */
const PRESET_EXPECTED: Record<
  string,
  Record<string, string>
> = {
  default: {
    '--mf-color-heading': '#111827',
    '--mf-color-text': '#374151',
    '--mf-color-link': '#2563eb',
    '--mf-color-code-bg': '#f3f4f6',
    '--mf-font-body': 'system-ui, -apple-system, sans-serif',
    '--mf-line-height': '1.75',
    '--mf-bg-primary': '#ffffff',
  },
  github: {
    '--mf-color-heading': '#24292e',
    '--mf-color-text': '#24292e',
    '--mf-color-link': '#0366d6',
    '--mf-color-code-bg': 'rgba(27,31,35,0.05)',
    '--mf-font-body':
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    '--mf-line-height': '1.6',
    '--mf-bg-primary': '#ffffff',
  },
  notion: {
    '--mf-color-heading': '#37352f',
    '--mf-color-text': '#37352f',
    '--mf-color-link': '#37352f',
    '--mf-color-code-bg': 'rgba(135,131,120,0.15)',
    '--mf-font-body': "ui-sans-serif, -apple-system, 'Segoe UI', sans-serif",
    '--mf-line-height': '1.9',
    '--mf-bg-primary': '#ffffff',
  },
  dark: {
    '--mf-color-heading': '#f9fafb',
    '--mf-color-text': '#e5e7eb',
    '--mf-color-link': '#60a5fa',
    '--mf-color-code-bg': '#1e293b',
    '--mf-font-body': 'system-ui, -apple-system, sans-serif',
    '--mf-line-height': '1.75',
    '--mf-bg-primary': '#111827',
  },
  academic: {
    '--mf-color-heading': '#1a1a1a',
    '--mf-color-text': '#333333',
    '--mf-color-link': '#1a0dab',
    '--mf-color-code-bg': '#f5f5f5',
    '--mf-font-body': "'Georgia', 'Times New Roman', serif",
    '--mf-line-height': '1.85',
    '--mf-bg-primary': '#ffffff',
  },
};

const VERIFIED_VARS = [
  '--mf-color-heading',
  '--mf-color-text',
  '--mf-color-link',
  '--mf-color-code-bg',
  '--mf-font-body',
  '--mf-line-height',
  '--mf-bg-primary',
] as const;

test.describe('Theme CSS application on the document editor page', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for workspace entry
    await page.waitForURL(/\/[^/]+\/doc|\/workspaces/, { timeout: 10_000 });

    // If on workspace list, click the first one
    if (page.url().includes('/workspaces')) {
      const wsLink = page
        .locator('a[href^="/"]')
        .filter({ hasText: /.+/ })
        .first();
      await wsLink.click();
      await page.waitForURL(/\/[^/]+\/doc/, { timeout: 5000 });
    }
  });

  for (const presetName of Object.keys(PRESET_EXPECTED)) {
    test(`preset "${presetName}" CSS variables are applied to MarkdownEditor`, async ({
      page,
    }) => {
      const expected = PRESET_EXPECTED[presetName]!;

      // --- 1. Navigate to theme settings ---
      // Extract current workspace slug from URL
      const currentUrl = page.url();
      const slugMatch = currentUrl.match(/\/([^/]+)\/doc/);
      const workspaceSlug = slugMatch?.[1] ?? '';
      expect(workspaceSlug).toBeTruthy();

      await page.goto(`/${workspaceSlug}/settings/theme`);
      await page.waitForLoadState('networkidle');

      // --- 2. Select the preset ---
      const presetButton = page.locator('button', {
        hasText: new RegExp(
          `^${presetName.charAt(0).toUpperCase() + presetName.slice(1)}$`,
        ),
      });
      await expect(presetButton).toBeVisible({ timeout: 10_000 });
      await presetButton.click();

      // --- 3. Save the theme ---
      const saveButton = page.locator(
        'button:has-text("저장 & 적용"), button:has-text("저장")',
      );
      await saveButton.click();

      // Wait for the success toast
      await expect(
        page.locator('text=워크스페이스에 적용되었습니다'),
      ).toBeVisible({ timeout: 5000 });

      // --- 4. Navigate to a document page ---
      await page.goto(`/${workspaceSlug}/doc`);
      await page.waitForLoadState('networkidle');

      // Click the first document link to open a doc editor
      const docLink = page
        .locator(`a[href^="/${workspaceSlug}/doc/"]`)
        .first();
      await expect(docLink).toBeVisible({ timeout: 5000 });
      await docLink.click();
      await page.waitForURL(/\/[^/]+\/doc\/[^/]+/, { timeout: 5000 });

      // --- 5. Wait for the MarkdownEditor to render ---
      const editorRoot = page.locator('.mf-editor-root');
      await expect(editorRoot).toBeVisible({ timeout: 10_000 });

      // --- 6. Read CSS custom properties from the inline style ---
      const appliedVars = await page.evaluate((vars: string[]) => {
        const el = document.querySelector('.mf-editor-root');
        if (!el) return null;
        const result: Record<string, string> = {};
        for (const v of vars) {
          // Read from inline style (set via React style prop)
          const value = (el as HTMLElement).style.getPropertyValue(v).trim();
          if (value) {
            result[v] = value;
          }
        }
        return result;
      }, [...VERIFIED_VARS]);

      expect(appliedVars).not.toBeNull();

      // --- 7. Verify each CSS variable matches the preset value ---
      for (const varName of VERIFIED_VARS) {
        const actual = appliedVars?.[varName];
        const expectedValue = expected[varName];

        expect(
          actual,
          `CSS variable ${varName} for preset "${presetName}" — expected "${expectedValue}", got "${actual}"`,
        ).toBe(expectedValue);
      }
    });
  }
});
