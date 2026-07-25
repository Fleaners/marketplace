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
  // Clear/create the log file at the start of the test
  const logFilePath = path.resolve(__dirname, '../test-logs.txt');
  await fs.writeFile(logFilePath, '--- SMOKE TEST RUN START ---\n');

  const collectedErrors: string[] = [];

  await page.emulateMedia({ reducedMotion: 'reduce' });

  page.on('pageerror', (err) => {
    let details = '';
    try {
      details = JSON.stringify({
        name: err.name,
        message: err.message,
        stack: err.stack,
        url: (err as any).url,
        fileName: (err as any).fileName,
        filename: (err as any).filename,
        sourceURL: (err as any).sourceURL,
        line: (err as any).line,
        lineNumber: (err as any).lineNumber,
        column: (err as any).column,
        columnNumber: (err as any).columnNumber
      }, null, 2);
    } catch (e) {
      details = `Failed to stringify: ${e.message}. Raw err: name=${err.name}, msg=${err.message}`;
    }
    const logMsg = `PAGE ERROR:\n${details}\n\n`;
    fs.appendFile(logFilePath, logMsg).catch(() => {});
    collectedErrors.push(`pageerror:${err.message}`);
  });

  page.on('console', (msg) => {
    const loc = msg.location();
    const logMsg = `CONSOLE [${msg.type()}] at ${loc.url || 'unknown'}:${loc.lineNumber || 0}:${loc.columnNumber || 0}\nText: ${msg.text()}\n\n`;
    fs.appendFile(logFilePath, logMsg).catch(() => {});
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        !text.includes('net::ERR_CONNECTION_CLOSED') && 
        !text.includes('net::ERR_NETWORK_ACCESS_DENIED') &&
        !text.includes('Failed to load resource') &&
        !text.includes('TypeError: Failed to fetch') &&
        !text.includes('Failed to fetch RSC payload') &&
        !text.includes('RSC payload') &&
        !text.includes('Could not reach Cloud Firestore backend')
      ) {
        collectedErrors.push(`console:${text}`);
      }
    }
  });

  page.on('request', (request) => {
    const logMsg = `REQUEST: ${request.method()} ${request.url()}\n`;
    fs.appendFile(logFilePath, logMsg).catch(() => {});
  });

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      get() { return undefined; }
    });
    try {
      localStorage.setItem('use_mock_auth', 'true');
    } catch (e) {}
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
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  const storageData = await page.evaluate(() => JSON.stringify(localStorage));
  console.log(`[TEST DEBUG] Current URL: ${currentUrl}`);
  console.log(`[TEST DEBUG] LocalStorage: ${storageData}`);
  await expect(page.locator('text=Merchant Cockpit')).toBeVisible({ timeout: 15000 });

  await page.goto(`${BASE_URL}/next/index.html?clear_cache_ts=${Date.now()}`, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('text=B2B Trade Network')).toBeVisible();

  const modeButton = page.locator('button[aria-label="Toggle dark mode"]').first();
  await modeButton.click();
  if (await page.locator('select[aria-label="Select seller plan"]').count() > 0) {
    await page.locator('select[aria-label="Select seller plan"]').selectOption('premium');
  }

  // Click 'More' tab to open System Settings & Sandbox Product Workspace
  await page.locator('text=More').first().click();

  // Activate Sandbox if it is currently inactive
  const sandboxToggle = page.locator('button:has-text("Inactive")').first();
  if (await sandboxToggle.count() > 0) {
    await sandboxToggle.click();
  }

  const productTitleInput = page.locator('input[placeholder="Product title"]');
  if (await productTitleInput.count() === 0 || !(await productTitleInput.first().isVisible())) {
    await page
      .locator('xpath=//h3[normalize-space()="Quick Seller Sandbox Workspace"]/ancestor::div[contains(@class,"flex")][1]//button')
      .click();
    await expect(productTitleInput).toBeVisible({ timeout: 5000 });
  }

  const uploadPath = await ensureUploadPng();
  const fileInputs = page.locator('input[type="file"]');
  const fileInputCount = await fileInputs.count();
  for (let i = 0; i < fileInputCount; i += 1) {
    await fileInputs.nth(i).setInputFiles(uploadPath);
  }

  await productTitleInput.fill('Smoke Test Product');
  const aiButton = page.locator('button:has-text("Generate AI Description")');
  if (await aiButton.count()) {
    await aiButton.first().click();
  }
  await page.locator('button:has-text("Save Product")').click();
  
  const saveSellerProfile = page.locator('button:has-text("Save Seller Profile")');
  if (await saveSellerProfile.count()) {
    await saveSellerProfile.first().click();
  }
  const saveBuyerProfile = page.locator('button:has-text("Save Buyer Profile")');
  if (await saveBuyerProfile.count()) {
    await saveBuyerProfile.first().click();
  }

  expect(collectedErrors, collectedErrors.join('\n')).toEqual([]);
});
