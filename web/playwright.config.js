// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: false, // Sequential for better log reading? Or keep true. Let's keep false for stability on heavy interactions.
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['list'],
        ['html', { open: 'never' }] // Standard HTML report
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.BASE_URL || 'https://bentro.bento.lab',
        ignoreHTTPSErrors: true,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--host-resolver-rules=MAP bentro.bento.lab 192.168.3.40, MAP *.bentro.bento.lab 192.168.3.40']
                }
            },
        },
    ],

    /* Run your local dev server before starting the tests */
    // NOTE: User said "without containers", so we assume they might run the go app locally.
    // We can try to launch it, but usually E2E assumes app is running or we define how to run it.
    // If we want to be fully autonomous "no containers", we'd need to compile the Go app.
    // For now, let's assume the user will run the backend, OR we try to run it.
    // Getting 'go run cmd/server/main.go' to run might be tricky if env vars are needed.
    // Let's rely on the user having the app running, OR we can try to start it.
    // Given the prompt "rodar local se possivel sem subir container", I'll attempt to assume
    // localhost:8080 is available or will be made available.
    // But if I want to be *robust*, I shouldn't rely on luck.
    // However, starting the backend involves DB connections etc. 
    // I will check if I can use the existing `npm run dev` (vite) for frontend, 
    // but that needs a backend for API calls.

    // Strategy: Expect App Running on 8080.
    // If not, we might fail. 
    // But to satisfy "log padrão", I will add a setup step in the test itself or a global setup.
});
