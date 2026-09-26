import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Local settings and test accounts live in the git-ignored .env.e2e.local (see e2e/README.md)
if (existsSync('.env.e2e.local')) {
  for (const line of readFileSync('.env.e2e.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // the tests share one database and one socket server: run them one at a time
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    // the Google Chrome already installed on the machine (no browser download)
    channel: process.env.E2E_CHANNEL || 'chrome',
    headless: true,
    timezoneId: 'Asia/Bangkok',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
