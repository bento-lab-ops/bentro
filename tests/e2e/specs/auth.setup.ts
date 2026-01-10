import { test as setup, expect } from '@playwright/test';

const authFile = 'specs/.auth/user.json';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-user@bentro.test';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Start123!';
const TEST_NAME = 'E2E Automation User';

setup('authenticate', async ({ request }) => {
    console.log(`[AuthSetup] Authenticating via API as ${TEST_EMAIL}...`);

    // 1. Attempt Login
    let response = await request.post('/api/auth/login', {
        data: {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }
    });

    // 2. If failed (likely 401/404), attempt Register
    if (!response.ok()) {
        console.log(`[AuthSetup] Login failed (${response.status()}). Attempting Registration...`);

        response = await request.post('/api/auth/register', {
            data: {
                first_name: 'E2E',
                last_name: 'User',
                display_name: TEST_NAME,
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                avatar: '👤'
            }
        });

        if (!response.ok()) {
            const body = await response.text();
            throw new Error(`Registration failed: ${response.status()} - ${body}`);
        }
        console.log('[AuthSetup] Registration and Login successful.');
    } else {
        console.log('[AuthSetup] Login successful.');
    }

    // 3. Save Authenticated State
    await request.storageState({ path: authFile });
    console.log(`[AuthSetup] Auth state saved to ${authFile}`);
});
