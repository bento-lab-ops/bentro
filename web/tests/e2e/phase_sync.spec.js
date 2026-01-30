const { test, expect } = require('@playwright/test');

test.describe('Phase Synchronization (Multi-User)', () => {

    test('Phase changes should sync across different browser contexts', async ({ browser }) => {
        test.setTimeout(90000); // Increase overall test timeout

        // --- 1. Setup Admin Context ---
        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();

        // Log setup
        adminPage.on('console', msg => console.log(`[Admin]: ${msg.text()}`));

        // Register Admin
        const uniqueId = Date.now();
        const adminEmail = `admin${uniqueId}@test.com`;
        const adminName = `Admin_${uniqueId}`;

        console.log('[Admin] Navigating to /');
        await adminPage.goto('/');

        // Handle User Modal / Login Modal like in retro.spec.js
        console.log('[Admin] Checking initial modals');
        try {
            // Wait for page to settle slightly
            await adminPage.waitForTimeout(1000);

            const userModal = adminPage.locator('#userModal');
            if (await userModal.isVisible({ timeout: 5000 })) {
                console.log('[Admin] User Modal Visible - Clicking Register');
                await userModal.locator('button:has-text("Register")').click();
            } else {
                // Fallback to direct open if no modal? Or check Login modal?
                const loginModal = adminPage.locator('#loginModal');
                if (await loginModal.isVisible({ timeout: 2000 })) {
                    console.log('[Admin] Login Modal Visible - Switching to Register');
                    // Assuming login modal has a link to register
                    await loginModal.locator('a').click();
                } else {
                    // Only force if nothing else is there
                    console.log('[Admin] No modals? Forcing openRegisterModal');
                    await adminPage.evaluate(() => window.openRegisterModal());
                }
            }
        } catch (e) {
            console.log('[Admin] Error handling initial modals: ' + e.message);
        }

        // Wait for Register Modal
        await expect(adminPage.locator('#registerModal')).toBeVisible();

        await adminPage.locator('#registerEmail').fill(adminEmail);
        await adminPage.locator('#registerPassword').fill('password123');
        await adminPage.locator('#regFirstName').fill(adminName);
        await adminPage.locator('#regLastName').fill('User');
        await adminPage.locator('#registerDisplayName').fill(adminName);
        console.log('[Admin] Submitting Register Form');
        await adminPage.locator('#registerForm button[type="submit"]').click();

        console.log('[Admin] Handle Confirmation / Login');
        // Handle Confirm Modal (Wait a bit longer)
        try {
            const confirmBtn = adminPage.locator('#confirmationModal #btnConfirmOk');
            if (await confirmBtn.isVisible({ timeout: 5000 })) {
                await confirmBtn.click();
                console.log('[Admin] Confirmed Registration');
            }
        } catch (e) {
            console.log('[Admin] detailed error checking confirm: ' + e.message);
        }

        // Go to Dashboard - Manual Login Fallback if Auto-login fails
        // Check for dashboard OR login modal
        try {
            // Wait for either dashboard or login modal
            console.log('[Admin] Waiting for Dashboard or Login Modal');
            await Promise.race([
                adminPage.locator('#dashboardView').waitFor({ state: 'visible', timeout: 10000 }),
                adminPage.locator('#loginModal').waitFor({ state: 'visible', timeout: 10000 })
            ]);

            if (await adminPage.locator('#loginModal').isVisible()) {
                console.log('[Admin] Performing Manual Login');
                await adminPage.locator('#loginEmail').fill(adminEmail);
                await adminPage.locator('#loginPassword').fill('password123');
                await adminPage.locator('#loginForm button[type="submit"]').click();
            }
        } catch (e) {
            console.log('[Admin] State check failed, trying to proceed: ' + e.message);
        }

        await expect(adminPage.locator('#dashboardView')).toBeVisible({ timeout: 15000 });
        console.log('[Admin] Dashboard Visible');

        // Create Board
        await adminPage.click('#newBoardBtn');
        await adminPage.locator('#newBoardName').fill(`Sync Test Board ${uniqueId}`);
        await adminPage.click('#createBoardSubmitBtn');
        await expect(adminPage.locator('#boardContainer')).toBeVisible();

        // Get Board URL/ID
        const boardUrl = await adminPage.url();
        const boardId = boardUrl.split('#board/')[1];
        console.log(`[Admin] Board Created: ${boardId}`);


        // --- 2. Setup User Context (Guest) ---
        console.log('[User] Starting Guest Context');
        const userContext = await browser.newContext();
        const userPage = await userContext.newPage();
        userPage.on('console', msg => console.log(`[User]: ${msg.text()}`));

        // Guest Join
        await userPage.goto(boardUrl);
        // Expect User Modal for guest
        await expect(userPage.locator('#userModal')).toBeVisible();
        // Join as Guest
        await userPage.locator('#guestName').fill(`Guest_${uniqueId}`);
        await userPage.click('button:has-text("Join as Guest")');

        await expect(userPage.locator('#boardContainer')).toBeVisible();
        await expect(userPage.locator('#boardTitle')).toContainText(`Sync Test Board ${uniqueId}`);
        console.log('[User] Joined Board');

        // --- 3. Verify Initial Phase (Input) ---
        await expect(adminPage.locator('#currentPhase')).toHaveText(/Input/i);
        await expect(userPage.locator('#currentPhase')).toHaveText(/Input/i);


        // --- 4. Admin Switches Phase -> Voting ---
        console.log('--- Switching to Voting ---');
        await adminPage.click('#switchPhaseBtn');

        // Verify Admin sees change (Optimistic or fast roundtrip)
        await expect(adminPage.locator('#currentPhase')).toHaveText(/Voting/i);
        console.log('[Admin] Saw Voting Phase');

        // Verify User sees change (via WebSocket/Redis)
        await expect(userPage.locator('#currentPhase')).toHaveText(/Voting/i, { timeout: 10000 });
        console.log('✅ [User] Saw Voting Phase (Synced)');


        // --- 5. Admin Switches Phase -> Input (Discuss) ---
        console.log('--- Switching back to Input/Discuss ---');
        await adminPage.click('#switchPhaseBtn');

        // Verify Admin
        await expect(adminPage.locator('#currentPhase')).toHaveText(/Input/i); // Or Discuss depending on i18n

        // Verify User
        await expect(userPage.locator('#currentPhase')).toHaveText(/Input/i, { timeout: 10000 });
        console.log('✅ [User] Saw Input Phase (Synced)');

        // Cleanup
        await adminContext.close();
        await userContext.close();
    });
});
