import { test, expect } from '@playwright/test';

test('GST badge rendering for sellers with and without GST', async ({ page }) => {
  await page.goto('/');

  // Simulate a seller profile with GST
  await page.evaluate(() => {
    const profile = {
      role: 'seller',
      businessName: 'GST Seller',
      gstNumber: '27AAACM1234A1Z5',
      whatsappVerified: true,
      verified: true
    };
    localStorage.setItem('mp_user', JSON.stringify(profile));
  });

  await page.reload();
  // Ensure the client renders the completion panels using the stored user profile
  await page.evaluate(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('mp_user') || 'null');
      if (profile && typeof window.renderCompletionPanels === 'function') {
        window.renderCompletionPanels(profile);
      }
    } catch (e) {
      // ignore
    }
  });
  const badgeSelector = '.badge';
  await page.waitForTimeout(300);
  const badges = await page.$$eval(badgeSelector, els => els.map(e => e.textContent?.trim()));
  expect(badges.some(b => b && b.includes('GST Verified'))).toBeTruthy();

  // Now simulate seller without GST
  await page.evaluate(() => {
    const profile = {
      role: 'seller',
      businessName: 'NoGST Seller',
      gstNumber: '',
      whatsappVerified: true,
      verified: true
    };
    localStorage.setItem('mp_user', JSON.stringify(profile));
  });
  await page.reload();
  await page.evaluate(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('mp_user') || 'null');
      if (profile && typeof window.renderCompletionPanels === 'function') {
        window.renderCompletionPanels(profile);
      }
    } catch (e) {
      // ignore
    }
  });
  const badges2 = await page.$$eval(badgeSelector, els => els.map(e => e.textContent?.trim()));
  expect(badges2.some(b => b && b.includes('GST Verified'))).toBeFalsy();
});