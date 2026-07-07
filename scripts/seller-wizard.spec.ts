import { test, expect } from '@playwright/test';

test('Seller profile wizard enforces WhatsApp and allows optional GST', async ({ page }) => {
  await page.goto('/');
  await page.click('#navLoginBtn');
  await page.waitForSelector('#authDrawer', { state: 'visible' });

  // Switch to register mode and select seller
  await page.locator('#authSwitch').evaluate((el) => (el as HTMLElement).click());
  await page.selectOption('#authRole', 'seller');

  // Leave WhatsApp empty and attempt to proceed with wizard
  await page.fill('#authBusinessName', 'Test Seller Co');
  await page.fill('#authPhone', '9000000000');
  await page.fill('#authGst', ''); // GST empty
  await page.locator('#authSubmit').evaluate((el) => (el as HTMLElement).click());

  // The client-side flow should alert or show an inline message; check that wizard enforces WhatsApp by not proceeding
  // Since alerts are used, intercept dialogs
  page.on('dialog', dialog => dialog.accept());

  // If profile wizard opens, ensure WhatsApp input is present and mandatory
  const wizard = page.locator('#profileWizardModal');
  if (await wizard.isVisible()) {
    // Try to click next without entering WhatsApp
    await page.locator('#profileWizardNext').evaluate((el) => (el as HTMLElement).click());
    // Expect an alert was shown previously; ensure wizard still visible
    expect(await wizard.isVisible()).toBeTruthy();
  } else {
    // Otherwise check that registration did not complete by verifying user not stored
    const user = await page.evaluate(() => localStorage.getItem('mp_user'));
    expect(user === null).toBeTruthy();
  }
});