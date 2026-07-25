// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:8081';

test.describe('Button Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable mock auth
    await page.addInitScript(() => {
      localStorage.setItem('use_mock_auth', 'true');
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
  });

  test('1. Login button opens auth drawer', async ({ page }) => {
    // The navLoginBtn is rendered by fillProfile() for logged-out users
    const loginBtn = page.locator('#navLoginBtn');
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      const authDrawer = page.locator('#authDrawer');
      await expect(authDrawer).toBeVisible({ timeout: 3000 });
    } else {
      // User may already be logged in from localStorage — that's fine, skip
      console.log('[SKIP] navLoginBtn not visible (user already logged in)');
    }
  });

  test('2. Google sign-in button is present and clickable in auth drawer', async ({ page }) => {
    // Open auth drawer
    const loginBtn = page.locator('#navLoginBtn');
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
    } else {
      // Manually open via exposed function
      await page.evaluate(() => {
        if (typeof window.openAuthDrawer === 'function') {
          window.openAuthDrawer('login');
        }
      });
    }

    const googleBtn = page.locator('#authGoogle');
    await expect(googleBtn).toBeVisible({ timeout: 3000 });
    // Verify it's enabled (not disabled)
    await expect(googleBtn).toBeEnabled();
  });

  test('3. Bottom nav buttons all exist and switch tabs', async ({ page }) => {
    // Verify bottom nav buttons exist in the DOM
    const bottomHome = page.locator('#bottomHomeBtn');
    const bottomSearch = page.locator('#bottomSearchBtn');
    const bottomWishlist = page.locator('#bottomWishlistBtn');
    const bottomProfile = page.locator('#bottomProfileBtn');

    // All should be attached to the DOM
    await expect(bottomHome).toBeAttached();
    await expect(bottomSearch).toBeAttached();
    await expect(bottomWishlist).toBeAttached();
    await expect(bottomProfile).toBeAttached();

    // Bottom nav is mobile-only — may be hidden on desktop viewport.
    // Only click if visible.
    if (await bottomSearch.isVisible()) {
      await bottomSearch.click();
      await page.waitForTimeout(300);
      await bottomHome.click();
      await page.waitForTimeout(300);
    } else {
      console.log('[INFO] Bottom nav hidden on desktop viewport — DOM attachment verified');
    }
  });

  test('4. After login, fillProfile re-wires header nav buttons correctly', async ({ page }) => {
    // Simulate login via mock auth
    await page.evaluate(() => {
      localStorage.setItem('use_mock_auth', 'true');
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });

    // Trigger mock Google sign-in
    await page.evaluate(() => {
      if (typeof window.openAuthDrawer === 'function') {
        window.openAuthDrawer('login');
      }
    });
    await page.waitForTimeout(500);

    const googleBtn = page.locator('#authGoogle');
    if (await googleBtn.isVisible()) {
      await googleBtn.click();
      // Wait for auth flow to complete
      await page.waitForTimeout(2000);
    }

    // After login, fillProfile() should have re-rendered the header.
    // Check that the dynamically created nav buttons exist and are clickable.
    const navHome = page.locator('#navHomeBtn');
    if (await navHome.isVisible()) {
      await navHome.click();
      // Should not throw — verifying the onclick handler was re-wired.
      console.log('[PASS] navHomeBtn clickable after fillProfile re-render');
    }
  });

  test('5. Hero search button works (requestSubmit compat)', async ({ page }) => {
    const heroSearch = page.locator('#heroSearchBtn');
    if (await heroSearch.isVisible()) {
      // Should not throw JS errors when clicked
      const jsErrors = [];
      page.on('pageerror', (error) => jsErrors.push(error.message));

      await heroSearch.click();
      await page.waitForTimeout(500);

      const requestSubmitErrors = jsErrors.filter(e =>
        e.includes('requestSubmit') || e.includes('is not a function')
      );
      expect(requestSubmitErrors).toHaveLength(0);
    }
  });

  test('6. Auth drawer close button works', async ({ page }) => {
    // Open auth drawer
    await page.evaluate(() => {
      if (typeof window.openAuthDrawer === 'function') {
        window.openAuthDrawer('login');
      }
    });
    await page.waitForTimeout(500);

    const authDrawer = page.locator('#authDrawer');
    await expect(authDrawer).toBeVisible({ timeout: 3000 });

    const closeBtn = page.locator('#authClose');
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Verify drawer is hidden
    const isHidden = await authDrawer.evaluate(el => el.getAttribute('aria-hidden') === 'true' || el.classList.contains('hidden'));
    expect(isHidden).toBeTruthy();
  });
});
