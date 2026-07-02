import { test, expect } from '@playwright/test';

const BASE_URL = 'https://marketplace-store-fef91.web.app';

test('marketplace smoke: auth actions and runtime console integrity', async ({ page }) => {
  const collectedErrors: string[] = [];

  page.on('pageerror', (err) => {
    collectedErrors.push(`pageerror:${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      collectedErrors.push(`console:${msg.text()}`);
    }
  });
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();

  const loginBtn = page.locator('#navLoginBtn');
  await expect(loginBtn).toBeVisible();
  await loginBtn.click();

  await expect(page.locator('#authDrawer')).toBeVisible();
  await page.locator('#authPhone').fill('9999999999');
  await page.locator('#authSendOtp').click();
  await page.locator('#authGoogle').click();
  await page.locator('#authClose').click();

  await page.locator('#navDashboardBtn').click();
  const logoutVisible = await page.locator('#profileLogoutBtn').isVisible();
  if (logoutVisible) {
    await page.locator('#profileLogoutBtn').click();
  }

  // Non-auth Next canary interactions are covered separately; this smoke focuses
  // on core auth actions and runtime console integrity.

  expect(collectedErrors, collectedErrors.join('\n')).toEqual([]);
});
