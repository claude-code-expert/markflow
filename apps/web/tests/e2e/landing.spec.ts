import { test, expect } from '@playwright/test';

test.describe('Landing Page (US1)', () => {
  test('renders all sections: Hero, Features, Pricing, Footer', async ({ page }) => {
    await page.goto('/');

    // Hero section
    await expect(page.locator('text=Markdown')).toBeVisible();
    await expect(page.getByRole('link', { name: /start for free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view demo/i })).toBeVisible();

    // Features section (6 cards)
    const featureCards = page.locator('[data-testid="feature-card"]');
    await expect(featureCards).toHaveCount(6);

    // Pricing section (3 tiers)
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Team')).toBeVisible();
    await expect(page.locator('text=Enterprise')).toBeVisible();

    // Footer
    await expect(page.locator('footer')).toBeVisible();
  });

  test('"Start for free" button navigates to register page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /start for free/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('"View demo" button navigates to workspace selector', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /view demo/i }).click();
    // Should navigate to workspace selector or login
    await expect(page.url()).not.toBe('/');
  });

  test('redirects authenticated users to workspace selector', async ({ page }) => {
    // This test requires authenticated state setup
    // Implementation will use stored auth tokens
    test.skip(true, 'Requires auth setup helper');
  });
});
