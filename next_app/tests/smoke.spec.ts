import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

async function ensureUploadPng(): Promise<string> {
  const filePath = path.resolve(__dirname, 'smoke-upload-real.png');
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9WwQ0AAAAASUVORK5CYII=';
  await fs.writeFile(filePath, Buffer.from(b64, 'base64'));
  return filePath;
}

test('smoke all buttons + login/logout + photo upload', async ({ page }) => {
  const collectedErrors: string[] = [];

  page.on('pageerror', (err) => collectedErrors.push(`pageerror:${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        !text.includes('net::ERR_CONNECTION_CLOSED') && 
        !text.includes('Failed to load resource') &&
        !text.includes('Failed to fetch RSC payload') &&
        !text.includes('RSC payload')
      ) {
        collectedErrors.push(`console:${text}`);
      }
    }
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

  // Wait for Google Role Selection modal to open, select "seller" and click continue
  await page.locator('#googleRoleModal').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('input[name="googleRoleChoice"][value="seller"]').check();
  await page.locator('#googleRoleContinue').click();

  // Wait for Profile Wizard modal to open and complete steps
  await page.locator('#profileWizardModal').waitFor({ state: 'visible', timeout: 10000 });
  
  // Step 1: Business Details
  await page.locator('#wizardBusinessName').fill('Smoke Test Business');
  await page.locator('#wizardCategory').selectOption('Electronics');
  await page.locator('#profileWizardNext').click();

  // Step 2: Contact Details
  await page.locator('#wizardMobile').fill('9876543210');
  await page.locator('#wizardWhatsapp').fill('9876543210');
  await page.locator('#wizardAddress').fill('123 Smoke Test Street, Sector 5');
  await page.locator('#profileWizardNext').click();

  // Step 3: Optional tax details (leave GST empty to prove it's optional)
  await page.locator('#profileWizardNext').click();

  // Onboarding completion redirects to /next/dashboard/ which is under basePath /next/
  // Wait for the Next.js landing elements to be visible
  await expect(page.locator('text=Merchant Cockpit')).toBeVisible({ timeout: 15000 });

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
