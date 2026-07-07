import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

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
  await page.locator('#authGoogle').evaluate((el) => (el as HTMLElement).click());
  
  // Handle the mock Google role selection modal
  const modal = page.locator('#googleRoleModal');
  try {
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    await page.check('input[name="googleRoleChoice"][value="buyer"]');
    await page.click('#googleRoleContinue');
  } catch (e) {
    // Modal might have been bypassed if already authenticated or default resolved
  }

  // Handle the profile completion wizard modal
  const wizard = page.locator('#profileWizardModal');
  try {
    await wizard.waitFor({ state: 'visible', timeout: 5000 });
    // Click Next/Finish 3 times to complete the buyer wizard
    await page.click('#profileWizardNext'); // Step 1 to 2
    await page.waitForTimeout(200);
    await page.click('#profileWizardNext'); // Step 2 to 3
    await page.waitForTimeout(200);
    await page.click('#profileWizardNext'); // Step 3 to Finish/Close
    await wizard.waitFor({ state: 'hidden', timeout: 5000 });
  } catch (e) {
    // Wizard might not have appeared if profile already completed
  }

  // Verify auth drawer closes on successful login
  await expect(page.locator('#authDrawer')).toHaveAttribute('aria-hidden', 'true');

  // Verify we can access the dashboard/profile via navProfileBtn
  await page.locator('#navProfileBtn').click();

  // Verify logout button is visible and click it to complete the full session flow
  const logoutBtn = page.locator('#profileLogoutBtn');
  await expect(logoutBtn).toBeVisible();
  await logoutBtn.click();

  // Non-auth Next canary interactions are covered separately; this smoke focuses
  // on core auth actions and runtime console integrity.

  expect(collectedErrors, collectedErrors.join('\n')).toEqual([]);
});

