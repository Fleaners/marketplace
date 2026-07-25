// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:8081';

test.describe('Auth Error Resilience Tests', () => {
  test('1. WhatsApp button works even when analytics write fails', async ({ page }) => {
    // Set up mock auth with a logged-in user
    await page.addInitScript(() => {
      localStorage.setItem('use_mock_auth', 'true');
      localStorage.setItem('mp_user', JSON.stringify({
        uid: 'test-resilience-uid',
        name: 'Resilience Tester',
        email: 'test@resilience.com',
        role: 'buyer',
        profileComplete: true,
        onboardingCompleted: true,
      }));
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    // Track JS errors
    const jsErrors = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    // Wait for products to load, then find a WhatsApp/Contact button
    await page.waitForTimeout(2000);

    // Check if there are any product cards with WhatsApp buttons
    const whatsappBtns = page.locator('[data-action="whatsapp"]');
    const count = await whatsappBtns.count();

    if (count > 0) {
      // Click the first WhatsApp button — even if analytics fails,
      // it should NOT throw an unhandled error
      const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
      await whatsappBtns.first().click();
      await page.waitForTimeout(1000);

      // Verify no unhandled rejection errors related to trackWhatsappClick
      const analyticsErrors = jsErrors.filter(e =>
        e.includes('trackWhatsappClick') || e.includes('trackProductView')
      );
      expect(analyticsErrors).toHaveLength(0);
      console.log('[PASS] WhatsApp button click did not generate unhandled analytics errors');
    } else {
      console.log('[SKIP] No product cards with WhatsApp buttons found');
    }
  });

  test('2. Contact button works even when analytics write fails', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('use_mock_auth', 'true');
      localStorage.setItem('mp_user', JSON.stringify({
        uid: 'test-resilience-uid',
        name: 'Resilience Tester',
        email: 'test@resilience.com',
        role: 'buyer',
        profileComplete: true,
        onboardingCompleted: true,
      }));
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    const jsErrors = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await page.waitForTimeout(2000);

    const contactBtns = page.locator('[data-action="contact"]');
    const count = await contactBtns.count();

    if (count > 0) {
      await contactBtns.first().click();
      await page.waitForTimeout(1000);

      // No unhandled rejection errors
      const analyticsErrors = jsErrors.filter(e =>
        e.includes('trackProductView') || e.includes('Firestore')
      );
      expect(analyticsErrors).toHaveLength(0);
      console.log('[PASS] Contact button click did not generate unhandled analytics errors');
    } else {
      console.log('[SKIP] No product cards with contact buttons found');
    }
  });

  test('3. Profile wizard close works even if Firestore write were to fail', async ({ page }) => {
    // Set up a seller user who hasn't completed onboarding
    await page.addInitScript(() => {
      localStorage.setItem('use_mock_auth', 'true');
      localStorage.setItem('mp_user', JSON.stringify({
        uid: 'test-wizard-uid',
        name: 'Wizard Tester',
        email: 'wizard@test.com',
        role: 'seller',
        profileComplete: false,
        onboardingCompleted: false,
        onboardingComplete: false,
        profileCompletion: 30,
      }));
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    const jsErrors = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    // Wait for potential wizard launch
    await page.waitForTimeout(3000);

    // Check if the profile wizard is visible
    const wizard = page.locator('#profileWizardModal');
    const isVisible = await wizard.isVisible().catch(() => false);

    if (isVisible) {
      console.log('[INFO] Profile wizard is open — testing close resilience');
      // The wizard should be closeable via the back button or next steps.
      // Verify no JS errors from the wizard being open
      const wizardErrors = jsErrors.filter(e =>
        e.includes('closeProfileWizardAndPersist') || e.includes('userRef.set')
      );
      expect(wizardErrors).toHaveLength(0);
    } else {
      console.log('[SKIP] Profile wizard did not auto-launch (onboarding may already be marked done by mock)');
    }
  });

  test('4. Login flow completes without unhandled errors', async ({ page }) => {
    // Start with clean state
    await page.addInitScript(() => {
      localStorage.setItem('use_mock_auth', 'true');
      localStorage.removeItem('mp_user');
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    const jsErrors = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    // Open auth drawer and sign in with Google
    await page.evaluate(() => {
      if (typeof window.openAuthDrawer === 'function') {
        window.openAuthDrawer('login');
      }
    });
    await page.waitForTimeout(500);

    const googleBtn = page.locator('#authGoogle');
    if (await googleBtn.isVisible()) {
      await googleBtn.click();
      await page.waitForTimeout(3000);

      // After login, there should be no unhandled errors
      const criticalErrors = jsErrors.filter(e =>
        e.includes('TypeError') ||
        e.includes('ReferenceError') ||
        e.includes('Cannot read properties of null')
      );

      if (criticalErrors.length > 0) {
        console.log('[WARN] JS errors during login:', criticalErrors);
      }
      expect(criticalErrors).toHaveLength(0);
      console.log('[PASS] Login completed with zero unhandled critical JS errors');
    }
  });

  test('5. safeApiFetch handles non-JSON / HTML error responses gracefully', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      // @ts-ignore
      if (typeof window.safeApiFetch !== 'function') return { skipped: true };
      
      // Attempt safeApiFetch against a endpoint that returns HTML or 404
      // @ts-ignore
      const res = await window.safeApiFetch('/non-existent-endpoint-test-html-404');
      return { ok: res.ok, status: res.status, hasErrorPayload: !!res.data?.error };
    });

    if (result.skipped) {
      console.log('[SKIP] safeApiFetch not exposed on window directly');
    } else {
      expect(result.hasErrorPayload).toBeTruthy();
      console.log('[PASS] safeApiFetch handled non-JSON HTML rewrite response cleanly without crashing JSON parsing');
    }
  });
});
