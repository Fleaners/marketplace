import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'https://marketplace-store-fef91.web.app',
    headless: true,
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: true,
  },
});
