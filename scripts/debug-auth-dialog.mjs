import { chromium } from '@playwright/test';

const BASE_URL = 'https://marketplace-store-fef91.web.app';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('dialog', async (dialog) => {
  console.log('DIALOG:', dialog.message());
  await dialog.accept();
});

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log('CONSOLE', msg.type().toUpperCase() + ':', msg.text());
  }
});

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.click('#navLoginBtn');
await page.click('#authSwitch');
await page.fill('#authName', 'Debug Buyer');
await page.fill('#authPhone', '9876543210');
await page.fill('#authEmail', `debug.${Date.now()}@example.com`);
await page.fill('#authPassword', 'StrongPass!12345');
await page.click('#authSubmit');

await page.waitForTimeout(8000);
console.log('DRAWER_OPEN:', await page.locator('#authDrawer').evaluate((el) => el.classList.contains('open')));
console.log('MP_USER_PRESENT:', await page.evaluate(() => Boolean(localStorage.getItem('mp_user'))));
console.log('SELLER_DASH_VISIBLE:', await page.locator('#sellerDashboard').isVisible());
console.log('PROFILE_VIEW_VISIBLE:', await page.locator('#profileView').isVisible());

await browser.close();
