import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:8081';

test('measure existing user login latency', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('use_mock_auth', 'true');
    localStorage.setItem('APP_VERSION', '1.2.0');
    // Pre-populate mock users in local storage database
    const existingSeller = {
      id: 'mock-google-uid-performance-test', // Mock document ID
      uid: 'mock-google-uid-performance-test',
      email: 'existing-seller@example.com',
      role: 'seller',
      createdAt: new Date().toISOString(),
      profileComplete: true,
      profileCompletion: 100,
      verified: true,
      mobileNumber: '9876543210',
      whatsappNumber: '9876543210',
      businessName: 'Existing Performance Seller',
      category: 'Industrial',
      address: '123 Industry Lane',
      onboardingComplete: true,
      onboardingCompleted: true,
      sellerActive: true
    };
    localStorage.setItem('mock_db_users', JSON.stringify([existingSeller]));

    // Intercept mock firebase auth instance directly
    const checkInterval = setInterval(() => {
      try {
        if ((window as any).firebase && (window as any).firebase.auth) {
          const authInstance = (window as any).firebase.auth();
          if (authInstance) {
            clearInterval(checkInterval);
            authInstance.signInWithPopup = async () => {
              const user = {
                uid: 'mock-google-uid-performance-test',
                email: 'existing-seller@example.com',
                displayName: 'Existing Performance Seller'
              };
              authInstance.currentUser = user;
              authInstance._triggerStateChange();
              return { user };
            };
            console.log('[TEST] signInWithPopup successfully overridden');
          }
        }
      } catch (e) {
        // ignore
      }
    }, 10);
  });

  console.log('--- STARTING EXISTING USER LOGIN LATENCY ---');

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#navLoginBtn').click();
  await expect(page.locator('#authDrawer')).toBeVisible();

  const startLoginTime = Date.now();
  await page.locator('#authGoogle').click();

  // Wait for /next/dashboard page and check if it is interactive
  await expect(page).toHaveURL(/\/next\/dashboard/);
  await expect(page.locator('text=Merchant Cockpit')).toBeVisible({ timeout: 15000 });
  const totalTime = Date.now() - startLoginTime;
  console.log(`[MEASUREMENT] Existing Seller Click Google -> Dashboard Interactive: ${totalTime}ms`);

  console.log('--- MEASUREMENT COMPLETE ---');
});
