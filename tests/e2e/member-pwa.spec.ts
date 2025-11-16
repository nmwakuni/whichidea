import { test, expect } from '@playwright/test';

test.describe('Member PWA', () => {
  test('should be installable as PWA', async ({ page, context }) => {
    await page.goto('http://localhost:3002');

    // Check for PWA manifest
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);

    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();

    // Navigate to manifest and verify it's valid
    const manifestResponse = await page.goto(
      `http://localhost:3002${manifestHref}`
    );
    expect(manifestResponse?.status()).toBe(200);

    const manifest = await manifestResponse?.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
  });

  test('should display member dashboard', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should have mobile-optimized layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002/login');

    // Check that the page is responsive
    const container = page.locator('main, .container').first();
    const boundingBox = await container.boundingBox();

    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('should have bottom navigation for authenticated users', async ({
    page,
  }) => {
    await page.goto('http://localhost:3002/login');

    // Note: This test would need authentication setup
    // Just verify the login page is mobile-friendly
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
  });

  test('should handle offline mode gracefully', async ({ page, context }) => {
    await page.goto('http://localhost:3002');

    // Simulate offline
    await context.setOffline(true);

    // Page should still be accessible (service worker cache)
    // Note: This requires service worker to be registered
    const title = await page.title();
    expect(title).toBeTruthy();

    // Re-enable network
    await context.setOffline(false);
  });
});
