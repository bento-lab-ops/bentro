import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './specs',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['list'], // Shows detailed test progress and summary
        ['html', { open: 'never' }] // Generates HTML report without auto-opening
    ],
    use: {
        baseURL: 'https://bentro.bento.lab',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        ignoreHTTPSErrors: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
