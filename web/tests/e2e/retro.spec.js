const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// function log(step, message) {
//     console.log(`[${step}] ${message}`);
// }
// Simplified log
const log = (step, msg) => {
    const line = `[${new Date().toISOString()}] [${step}] ${msg}\n`;
    console.log(line.trim());
    try { fs.appendFileSync(path.join(__dirname, 'e2e_debug_log.txt'), line); } catch (e) { }
};

test.beforeAll(async () => {
    // console.log('--- STARTING NEW E2E RUN ---');
});

test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
        const screenshotPath = path.join(__dirname, `failure_${testInfo.title.replace(/\s+/g, '_')}.png`);
        const htmlPath = path.join(__dirname, `failure_${testInfo.title.replace(/\s+/g, '_')}.html`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        const html = await page.content();
        fs.writeFileSync(htmlPath, html);
        console.log(`Failure artifacts saved: ${htmlPath}`);
    }
});

test.describe('BenTro E2E Flow', () => {

    test('User should be able to register, create a board, and vote', async ({ page }) => {
        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));

        log('INIT', 'Navigating to home page');
        try {
            await page.goto('/', { timeout: 10000 });
            // Dump HTML immediately
            const html = await page.content();
            fs.writeFileSync(path.join(__dirname, 'debug_initial.html'), html);
        } catch (e) {
            log('ERROR', `Navigation failed: ${e.message}`);
            throw e;
        }

        // 1. Register Guest/User
        // Check if we are redirected to login or can join directly.
        // Assuming fresh start or checking title
        const title = await page.title();
        log('DEBUG', `Page Title: ${title}`);
        await expect(page).toHaveTitle(/BenTro/);

        // If we need to login, let's assume valid credentials or use the "Guest" flow if available?
        // Let's rely on "Register" to ensure a clean user state.

        // Check if "Login" modal is visible or if we need to click "Login"
        // Wait for potential redirect or UI settle
        await page.waitForTimeout(1000);

        // Wait for potential dynamic loading
        await page.waitForTimeout(5000);

        // Debug Visibility
        let userModalVisible = false;
        let loginModalVisible = false;
        let modalsContainerHtml = '';
        try {
            userModalVisible = await page.locator('#userModal').isVisible();
            loginModalVisible = await page.locator('#loginModal').isVisible();
            modalsContainerHtml = await page.locator('#modals-container').innerHTML();
        } catch (err) {
            log('ERROR', `Visibility Check Crashed: ${err.message}`);
        }

        log('DEBUG', `UserModal Visible: ${userModalVisible}`);
        log('DEBUG', `LoginModal Visible: ${loginModalVisible}`);
        log('DEBUG', `ModalsContainer Length: ${modalsContainerHtml.length}`);

        // Interactive Logic
        if (userModalVisible) {
            log('AUTH', 'Handling User Modal');
            await page.locator('#userModal button:has-text("Register")').click();
        } else if (loginModalVisible) {
            log('AUTH', 'Handling Login Modal');
            await page.locator('#loginModal a').click();
        } else {
            // Try to force register modal open?
            log('AUTH', 'No auth modal visible. Trying to force open register.');
            await page.evaluate(() => window.openRegisterModal());
        }



        // Wait for Register Modal (triggered by either UserModal or LoginModal)
        const registerModal = page.locator('#registerModal');
        try {
            await registerModal.waitFor({ state: 'visible', timeout: 5000 });
            log('DEBUG', 'Register modal visible');
        } catch (e) {
            log('ERROR', `Register modal not visible: ${e.message}`);
            const html = await page.content();
            fs.writeFileSync(path.join(__dirname, 'debug_page.html'), html);
            throw e;
        }

        const email = `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
        const password = 'password123';

        log('AUTH', `Registering user: ${email}`);

        // Global Dialog Handler for Alerts
        page.on('dialog', async dialog => {
            log('ALERT', `Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });
        await page.fill('#registerFirstName', 'Test');
        await page.fill('#registerLastName', 'User');
        await page.fill('#registerDisplayName', `TestUser_${Date.now()}`);
        await page.fill('#registerEmail', email);
        await page.fill('#registerPassword', password);

        // Submit Register - Button inside register modal
        log('AUTH', 'Submitting registration form...');
        await page.click('#registerModal button[type="submit"]');

        // Handle Registration Success Alert (Custom Modal)
        log('AUTH', 'Waiting for confirmation modal...');
        const confirmModal = page.locator('#confirmationModal');
        await confirmModal.waitFor({ state: 'visible' });
        log('AUTH', 'Confirmation modal visible. Clicking OK...');
        await page.click('#btnConfirmOk');

        // Now we should be at Login Modal (switched automatically)
        log('AUTH', 'Waiting for login modal...');
        const loginModal = page.locator('#loginModal');
        await loginModal.waitFor({ state: 'visible' });

        log('AUTH', 'Registration complete. Logging in...');
        // Email is pre-filled, enter password
        await page.fill('#loginPassword', password);
        await page.click('#loginModal button[type="submit"]');

        // Expect to be logged in and see Dashboard
        await expect(page.locator('#dashboardView')).toBeVisible({ timeout: 10000 });
        log('AUTH', 'Registration successful, Dashboard visible');


        // 2. Create Board
        log('BOARD', 'Creating new board');

        // Debug visibility
        try {
            await expect(page.locator('#newBoardBtn')).toBeVisible({ timeout: 5000 });
            log('DEBUG', 'New Board Button Visible');
        } catch (e) {
            log('ERROR', 'New Board Button not visible after wait');
            throw e;
        }

        await page.click('#newBoardBtn');
        log('BOARD', 'Clicked New Board Button');

        const boardName = `E2E Board ${Date.now()}`;
        const newBoardModal = page.locator('#newBoardModal');

        await newBoardModal.waitFor({ state: 'visible' });
        await page.fill('#boardName', boardName);
        await page.selectOption('#boardTemplate', 'custom');
        await page.click('#newBoardModal button[type="submit"]');
        log('BOARD', 'Clicked Create Board');


        // Verify Board Loaded
        await expect(page.locator('#boardTitle')).toContainText(boardName);
        log('BOARD', `Board "${boardName}" created and loaded`);

        // 3. Add Card
        log('CARD', 'Adding a card to the first column');
        // Find first "Add Card" button
        await page.locator('.add-card-btn').first().click();

        // Handle Prompt or Modal for Card Content
        // BoardController uses `window.openNewCardModal`
        const cardContent = 'Test Card Content';
        await page.fill('#cardContent', cardContent);
        await page.click('#newCardModal button[type="submit"]');

        // Verify Card Exists
        const card = page.locator('.retro-card', { hasText: cardContent });
        await expect(card).toBeVisible();
        log('CARD', 'Card added successfully');

        // 4. Start Voting (as Owner)
        log('VOTING', 'Starting voting phase');
        await page.click('#switchPhaseBtn'); // "Start Voting"

        // Wait for "End Voting" text to confirm switch
        await expect(page.locator('#switchPhaseBtn')).toContainText(/End Voting/i);
        log('VOTING', 'Phase switched to Voting');

        // 5. Vote
        log('VOTING', 'Voting for the card');
        const voteBtn = card.locator('[data-action="vote"][data-vote-type="like"]');
        await voteBtn.click();

        // Verify Vote Count
        // Check smart polling update or immediate update
        const likeCount = card.locator('.card-stats span[title="Likes"]');
        await expect(likeCount).toContainText('1');
        log('VOTING', 'Vote registered and visible');

        // 6. Cleanup (Finish & Delete Board)
        log('CLEANUP', 'Finishing and deleting the board');

        // 6.1 Finish Retro
        // Ensure we are on board view
        await expect(page.locator('#finishRetroBtn')).toBeVisible();

        // Setup dialog handler for "Are you sure you want to finish?"
        // Note: The global handler might catch this, but we want to be explicit if possible.
        // The global handler accepts all dialogs, which is good for "OK" confirmations.

        await page.click('#finishRetroBtn');
        log('CLEANUP', 'Clicked Finish Retro');

        // Handle Confirmation Modal
        await expect(page.locator('#confirmationModal')).toBeVisible();
        await page.click('#btnConfirmOk');
        log('CLEANUP', 'Confirmed Finish Retro');

        // 6.2 Return to Dashboard
        // Wait for board to be marked as finished (read-only banner visible)
        await expect(page.locator('#readOnlyBanner')).toBeVisible();
        log('CLEANUP', 'Board is now finished (Read-Only)');

        await page.click('#dashboardBtn');
        await expect(page.locator('#dashboardView')).toBeVisible();
        log('CLEANUP', 'Returned to Dashboard from Board');

        // 6.3 Switch to Finished Tab
        await page.click('#filterFinishedBtn');
        log('CLEANUP', 'Switched to Finalized tab');

        // 6.4 Find Board and Delete element
        // The board card should be visible in the grid
        const boardCard = page.locator('.board-card', { hasText: boardName });
        await expect(boardCard).toBeVisible();

        // Click delete button inside the card
        // Selector: button with trash icon or onclick containing 'deleteBoard'
        const deleteBtn = boardCard.locator('button[onclick*="deleteBoard"]');
        await expect(deleteBtn).toBeVisible();

        // Dialog handler is already globally set to accept(), so just click
        await deleteBtn.click();
        log('CLEANUP', 'Clicked Delete Board button');

        // Verify board is gone
        await expect(boardCard).not.toBeVisible();
        log('CLEANUP', 'Board deleted from list');

        // Verify return to dashboard (we are already there)
        await expect(page.locator('#dashboardView')).toBeVisible({ timeout: 10000 });
        log('CLEANUP', 'Board deleted, returned to Dashboard');

        log('SUCCESS', 'Test completed successfully');
    });
});
