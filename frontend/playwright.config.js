import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './acceptance',
  testMatch: '*.spec.js',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/acceptance/fixture.html',
    reuseExistingServer: !process.env.CI,
  },
});
