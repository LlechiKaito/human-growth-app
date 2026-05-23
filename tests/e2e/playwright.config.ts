import { defineConfig, devices } from '@playwright/test';

const WEB_BASE = process.env.E2E_WEB_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_BASE,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
