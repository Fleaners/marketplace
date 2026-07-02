import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

async function ensureUploadPng(): Promise<string> {
  const filePath = path.resolve(process.cwd(), 'next_app', 'tests', 'smoke-upload-real.png');
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9WwQ0AAAAASUVORK5CYII=';
  await fs.writeFile(filePath, Buffer.from(b64, 'base64'));
  return filePath;
}

test('smoke all buttons + login/logout + photo upload', async ({ page }) => {
  const collectedErrors: string[] = [];

  page.on('pageerror', (err) => collectedErrors.push(`pageerror:${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') collectedErrors.push(`console:${msg.text()}`);
  });
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#navLoginBtn')).toBeVisible();

  await page.locator('#navLoginBtn').click();
  await expect(page.locator('#authDrawer')).toBeVisible();
  await page.locator('#authPhone').fill('9999999999');
  await page.locator('#authSendOtp').evaluate((el) => (el as HTMLButtonElement).click());
  await page.locator('#authGoogle').evaluate((el) => (el as HTMLButtonElement).click());
  await page.locator('#authClose').evaluate((el) => (el as HTMLButtonElement).click());

  await page.locator('#navDashboardBtn').click();
  const logoutVisible = await page.locator('#profileLogoutBtn').isVisible();
  if (logoutVisible) {
    await page.locator('#profileLogoutBtn').click();
  }

  await page.goto(`${BASE_URL}/next/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=Enterprise Marketplace')).toBeVisible();

  const modeButton = page.locator('button').filter({ hasText: /Dark Mode|Light Mode/ }).first();
  await modeButton.click();
  await page.locator('select[aria-label="Select seller plan"]').selectOption('premium');

  const uploadPath = await ensureUploadPng();
  const fileInputs = page.locator('input[type="file"]');
  const fileInputCount = await fileInputs.count();
  for (let i = 0; i < fileInputCount; i += 1) {
    await fileInputs.nth(i).setInputFiles(uploadPath);
  }

  await page.locator('input[placeholder="Product title"]').fill('Smoke Test Product');
  const aiButton = page.locator('button:has-text("Generate AI Description")');
  if (await aiButton.count()) {
    await aiButton.first().click();
  }
  await page.locator('button:has-text("Save Product")').click();
  await page.locator('button:has-text("Save Seller Profile")').click();
  await page.locator('button:has-text("Save Buyer Profile")').click();

  expect(collectedErrors, collectedErrors.join('\n')).toEqual([]);
});
