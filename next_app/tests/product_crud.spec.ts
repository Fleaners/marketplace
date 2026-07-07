import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

test('create a new product from dashboard products page and verify storage', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mp_user', JSON.stringify({ id: 'test-seller', role: 'seller', businessName: 'Test Seller', email: 'test@example.com' }));
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/next/dashboard/products`, { waitUntil: 'domcontentloaded' });

  await page.click('text=Add New Product');
  await expect(page.locator('text=Product Name')).toHaveCount(1);

  const title = `E2E Test Product ${Date.now()}`;
  await page.fill('input[placeholder*="Product title"], input[placeholder*="Product Name"]', title).catch(()=>{});
  await page.fill('input[placeholder*="Category"], input[placeholder*="Category"]', 'Electrical').catch(()=>{});
  await page.fill('textarea[placeholder*="Basic product description"], textarea[placeholder*="Description"]', 'E2E product description for automation test');

  // Click Publish (submit)
  await page.click('button:has-text("Publish Wholesale Listing"), button:has-text("Save Product")');

  // Wait briefly for storage update
  await page.waitForTimeout(500);

  const products = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('marketplace_products') || '[]'); } catch(e) { return []; }
  });

  const found = products.find((p: any) => p.name === undefined ? p.title === arguments[0] : p.name === arguments[0]);
  // Because some code uses 'name' and some use 'title' for products, check both
  const exists = products.some((p: any) => p.name === title || p.title === title);
  expect(exists, 'Created product should exist in localStorage').toBeTruthy();
});
