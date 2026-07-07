import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

test('save seller profile persists marketplace_seller_profile and mp_user', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mp_user', JSON.stringify({ id: 'test-seller', role: 'seller', businessName: 'Test Seller', email: 'test@example.com' }));
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/next/dashboard/profile`, { waitUntil: 'domcontentloaded' });

  // Fill business name
  const newName = `E2E Seller ${Date.now()}`;
  await page.fill('label:has-text("Registered Business Name") input', newName);

  // Click save
  await page.click('button:has-text("Save Directory Information")');

  await page.waitForTimeout(600);

  const profile = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('marketplace_seller_profile') || 'null'); } catch(e) { return null; }
  });

  expect(profile, 'seller profile should be saved in localStorage').not.toBeNull();
  expect(profile.businessName).toBe(newName);

  const mpUser = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('mp_user') || 'null'); } catch(e) { return null; }
  });

  expect(mpUser).not.toBeNull();
  expect(mpUser.role).toBe('seller');
});
