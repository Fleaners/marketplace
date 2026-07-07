import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app';

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`;
}

test.describe('Authentication flow coverage', () => {
  test('buyer email register -> refresh persistence -> logout -> route guard', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console:${msg.text()}`);
    });
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#navLoginBtn')).toBeVisible();

    await page.evaluate(() => {
      if (typeof (window as any).signOutCurrentUser === 'function') {
        (window as any).signOutCurrentUser();
      }
    });
    await expect(page.locator('#authDrawer')).toBeVisible();

    const email = uniqueEmail('buyer');
    const password = 'StrongPass!12345';

    await page.evaluate(() => {
      if (typeof (window as any).openAuthDrawer === 'function') {
        (window as any).openAuthDrawer('register');
      }
    });
    await expect(page.locator('#authTitle')).toHaveText(/Register/i);
    await page.locator('#authName').fill('Buyer QA');
    await page.locator('#authPhone').fill('9876543210');
    await page.locator('#authRole').selectOption('buyer');
    await page.locator('#authEmail').fill(email);
    await page.locator('#authPassword').fill(password);
    await page.locator('#authSubmit').evaluate((el) => (el as HTMLButtonElement).click());

    await expect(page.locator('#authDrawer')).toHaveAttribute('aria-hidden', 'true', { timeout: 20000 });
    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mp_user') || 'null')?.role || null))
      .toBe('buyer');

    await page.goto(`${BASE_URL}/buyer`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#authDrawer')).toHaveAttribute('aria-hidden', 'true');
    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mp_user') || 'null')?.role || null))
      .toBe('buyer');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#authDrawer')).toHaveAttribute('aria-hidden', 'true');
    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mp_user') || 'null')?.role || null))
      .toBe('buyer');

    await page.evaluate(() => {
      if (typeof (window as any).signOutCurrentUser === 'function') {
        (window as any).signOutCurrentUser();
      }
    });

    await page.goto(`${BASE_URL}/buyer`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#authDrawer')).toBeVisible();

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('seller email register -> seller dashboard access', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#navLoginBtn').click();
    await expect(page.locator('#authDrawer')).toBeVisible();

    const email = uniqueEmail('seller');
    const password = 'StrongPass!12345';

    await page.evaluate(() => {
      if (typeof (window as any).openAuthDrawer === 'function') {
        (window as any).openAuthDrawer('register');
      }
    });
    await expect(page.locator('#authTitle')).toHaveText(/Register/i);
    await page.locator('#authName').fill('Seller QA');
    await page.locator('#authPhone').fill('9898989898');
    await page.locator('#authRole').selectOption('seller');
    await page.locator('#authWhatsapp').fill('9898989898');
    await page.locator('#authBusinessName').fill('Seller QA Industries');
    await page.locator('#authCategory').fill('Industrial Supplies');
    await page.locator('#authGst').fill('27AAACM1234A1Z5');
    await page.locator('#authEmail').fill(email);
    await page.locator('#authPassword').fill(password);
    await page.locator('#authSubmit').evaluate((el) => (el as HTMLButtonElement).click());

    await expect(page.locator('#authDrawer')).toHaveAttribute('aria-hidden', 'true', { timeout: 20000 });

    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mp_user') || 'null')?.role || null))
      .toBe('seller');

    await page.goto(`${BASE_URL}/seller`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#homeView')).toBeVisible();
    await expect(page.locator('#navSellerDashboardBtn')).toBeVisible();
  });

  test('invalid email credentials show error', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#navLoginBtn').click();
    await expect(page.locator('#authDrawer')).toBeVisible();

    await page.locator('#authEmail').fill(uniqueEmail('invalid-login'));
    await page.locator('#authPassword').fill('WrongPass!12345');
    await page.locator('#authSubmit').evaluate((el) => (el as HTMLButtonElement).click());

    await expect.poll(() => dialogs.some((m) => /invalid email or password/i.test(m))).toBeTruthy();
  });
});
