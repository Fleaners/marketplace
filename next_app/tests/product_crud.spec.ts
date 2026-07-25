import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

test('create a new product from dashboard products page and verify storage', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mp_user', JSON.stringify({ id: 'test-seller', uid: 'test-seller', role: 'seller', businessName: 'Test Seller', email: 'test@example.com' }));
      localStorage.setItem('use_mock_auth', 'true');
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/next/dashboard/products`, { waitUntil: 'domcontentloaded' });

  await page.click('text=Add New Product');
  await expect(page.locator('text=Product Name')).toHaveCount(1);

  const title = `E2E Test Product ${Date.now()}`;
  await page.locator('label:has-text("Product Name")').locator('..').locator('input').fill(title);
  await page.locator('select').first().selectOption('Electrical');
  await page.locator('textarea[placeholder*="description"]').fill('E2E product description for automation test');
  await page.locator('label:has-text("Unit Price")').locator('..').locator('input').fill('1250');
  await page.locator('label:has-text("Min Order Qty")').locator('..').locator('input').fill('5');
  await page.locator('label:has-text("Current Stock Level")').locator('..').locator('input').fill('50');

  // Click Publish (submit)
  await page.click('button:has-text("Publish Wholesale Listing"), button:has-text("Save Product")');

  // Wait briefly for storage update
  await page.waitForTimeout(500);

  const products = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('marketplace_products') || '[]'); } catch(e) { return []; }
  });

  // Because some code uses 'name' and some use 'title' for products, check both
  const exists = products.some((p: any) => p.name === title || p.title === title);
  expect(exists, 'Created product should exist in localStorage').toBeTruthy();
});
