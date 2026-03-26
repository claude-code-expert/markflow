import { test, expect } from '@playwright/test';

/**
 * T116 -- Onboarding E2E Test
 *
 * Tests the user registration flow from the /register page.
 * Requires a running web (Next.js) + API (Fastify) server.
 */

test.describe('Onboarding flow', () => {
  test('should show registration form with required fields', async ({ page }) => {
    await page.goto('/register');

    // Verify form fields are visible
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#passwordConfirm')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/register');

    // Submit empty form
    await page.locator('button[type="submit"]').click();

    // Expect client-side validation error messages
    await expect(page.locator('text=이름을 입력해주세요')).toBeVisible();
    await expect(page.locator('text=이메일을 입력해주세요')).toBeVisible();
    await expect(page.locator('text=비밀번호를 입력해주세요')).toBeVisible();
    await expect(page.locator('text=비밀번호 확인을 입력해주세요')).toBeVisible();
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input#name').fill('Test User');
    await page.locator('input#email').fill('test@example.com');
    await page.locator('input#password').fill('Test123!@#');
    await page.locator('input#passwordConfirm').fill('DifferentPassword!@#1');

    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=비밀번호가 일치하지 않습니다')).toBeVisible();
  });

  test('should show password complexity error', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input#name').fill('Test User');
    await page.locator('input#email').fill('test@example.com');
    await page.locator('input#password').fill('short');
    await page.locator('input#passwordConfirm').fill('short');

    await page.locator('button[type="submit"]').click();

    // Password must be 8+ chars with letters, numbers, special chars
    await expect(page.locator('text=8자 이상')).toBeVisible();
  });

  test('should successfully register and show verification message', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.com`;

    await page.goto('/register');

    await page.locator('input#name').fill('E2E Test User');
    await page.locator('input#email').fill(uniqueEmail);
    await page.locator('input#password').fill('Test123!@#');
    await page.locator('input#passwordConfirm').fill('Test123!@#');

    await page.locator('button[type="submit"]').click();

    // After successful registration, expect a verification email notice
    await expect(page.locator('text=인증 이메일을 확인하세요')).toBeVisible({
      timeout: 10_000,
    });

    // Should show the email that was used
    await expect(page.locator(`text=${uniqueEmail}`)).toBeVisible();

    // Should have a link to login page
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should show error for duplicate email registration', async ({ page }) => {
    const duplicateEmail = `e2e-dup-${Date.now()}@test.com`;

    // First registration
    await page.goto('/register');
    await page.locator('input#name').fill('First User');
    await page.locator('input#email').fill(duplicateEmail);
    await page.locator('input#password').fill('Test123!@#');
    await page.locator('input#passwordConfirm').fill('Test123!@#');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=인증 이메일을 확인하세요')).toBeVisible({
      timeout: 10_000,
    });

    // Second registration with same email
    await page.goto('/register');
    await page.locator('input#name').fill('Second User');
    await page.locator('input#email').fill(duplicateEmail);
    await page.locator('input#password').fill('Test123!@#');
    await page.locator('input#passwordConfirm').fill('Test123!@#');
    await page.locator('button[type="submit"]').click();

    // Should show duplicate email error
    await expect(page.locator('text=이미 사용 중인 이메일입니다')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should navigate to login page from register page', async ({ page }) => {
    await page.goto('/register');

    await page.locator('a[href="/login"]').click();

    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=로그인')).toBeVisible();
  });
});
