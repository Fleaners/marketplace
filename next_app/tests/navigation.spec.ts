import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

const paths = [
  '/next/dashboard',
  '/next/dashboard/products',
  '/next/dashboard/inventory',
  '/next/dashboard/analytics',
  '/next/dashboard/orders',
  '/next/dashboard/reviews',
  '/next/dashboard/leads',
  '/next/dashboard/profile',
  '/next/dashboard/settings',
];

test.describe('seller dashboard home navigation', () => {
  for (const path of paths) {
    test(`Home link navigates to the marketplace homepage from ${path}`, async ({ page }) => {
      // Ensure the dashboard sees an authenticated seller to avoid immediate redirect
      await page.addInitScript(() => {
        try {
          localStorage.setItem('mp_user', JSON.stringify({ id: 'test-seller', role: 'seller', businessName: 'Test Seller', email: 'test@example.com' }));
        } catch (e) {
          // ignore
        }
      });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`console:${msg.text()}`);
        }
      });

      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Authenticating seller account')).toHaveCount(0);

      const homeButton = page.locator('button:has-text("Home"), a:has-text("Home"), [data-testid="nav-item-home"], #bottomHomeBtn').first();
      await expect(homeButton).toBeVisible({ timeout: 15000 });
      await homeButton.click();

      await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/next/', { timeout: 15000 });
      await expect(page).toHaveURL(/\/(next\/)?$/);
      await expect(page.locator('body')).toContainText(/Discover|Good Day|Good Evening|Trusted/);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
