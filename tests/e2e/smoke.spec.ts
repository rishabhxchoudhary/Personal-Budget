import { test, expect } from '@playwright/test';

// We’ll enable this after the first page is in place (to avoid flakiness).
test.describe.configure({ mode: 'serial' });

test.skip('home renders something', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
