import { test, expect } from '@playwright/test';

test.describe('Admin Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/login');

    // Try submitting without phone number
    const phoneInput = page.getByLabel(/phone number/i);
    await phoneInput.fill('');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should show validation error
    await expect(page.getByText(/phone.*required/i)).toBeVisible();

    // Try invalid phone number
    await phoneInput.fill('12345');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/invalid.*phone/i)).toBeVisible();
  });

  test('should accept valid Kenyan phone number', async ({ page }) => {
    await page.goto('/login');

    const phoneInput = page.getByLabel(/phone number/i);
    await phoneInput.fill('0712345678');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should proceed to OTP verification step
    await expect(page.getByText(/enter.*code/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle OTP verification flow', async ({ page }) => {
    await page.goto('/login');

    // Step 1: Enter phone number
    await page.getByLabel(/phone number/i).fill('0712345678');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: Wait for OTP input
    await expect(page.getByLabel(/otp|code/i)).toBeVisible({ timeout: 10000 });

    // Note: In real tests, you'd need to mock the OTP or use a test phone number
    // For now, just verify the UI is showing correctly
    await expect(page.getByRole('button', { name: /verify|submit/i })).toBeVisible();
  });

  test('should allow resending OTP', async ({ page }) => {
    await page.goto('/login');

    // Get to OTP step
    await page.getByLabel(/phone number/i).fill('0712345678');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByLabel(/otp|code/i)).toBeVisible({ timeout: 10000 });

    // Should have resend button
    const resendButton = page.getByRole('button', { name: /resend/i });
    await expect(resendButton).toBeVisible();
  });
});
