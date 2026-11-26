import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm build && pnpm preview --ignore-lock',
    env: { PUBLIC_CONTENT_DIR: 'tests/fixtures/content' },
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 14'] } },
  ],
});
