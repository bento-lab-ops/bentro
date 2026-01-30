const { test, expect } = require('@playwright/test');

test.describe('Card Synchronization (Multi-User)', () => {

    test('Card creation and movement should sync', async ({ browser }) => {
        test.setTimeout(90000);

        // --- 1. Setup Admin Context ---
        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();

        const uniqueId = Date.now();
        const adminEmail = `admin${uniqueId}@test.com`;
        const adminName = `Admin_${uniqueId}`;

        console.log('[Admin] Registering...');
        await adminPage.goto('/');

        // Register Flow
        await adminPage.waitForTimeout(1000);
        try {
            if (await adminPage.locator('#userModal').isVisible({ timeout: 5000 })) {
                await adminPage.locator('#userModal button:has-text("Register")').click();
            } else if (await adminPage.locator('#loginModal').isVisible({ timeout: 2000 })) {
                await adminPage.locator('#loginModal a').click();
            } else {
                await adminPage.evaluate(() => window.openRegisterModal());
            }
        } catch (e) { }

        await expect(adminPage.locator('#registerModal')).toBeVisible();
        await adminPage.locator('#registerEmail').fill(adminEmail);
        await adminPage.locator('#registerPassword').fill('password123');
        await adminPage.locator('#regFirstName').fill(adminName);
        await adminPage.locator('#regLastName').fill('User');
        await adminPage.locator('#registerDisplayName').fill(adminName);
        await adminPage.locator('#registerForm button[type="submit"]').click();

        // Confirm
        try {
            const confirmBtn = adminPage.locator('#confirmationModal #btnConfirmOk');
            if (await confirmBtn.isVisible({ timeout: 5000 })) await confirmBtn.click();
        } catch (e) { }

        // Dashboard
        await expect(adminPage.locator('#dashboardView')).toBeVisible({ timeout: 15000 });

        // Create Board
        await adminPage.click('#newBoardBtn');
        await adminPage.locator('#newBoardName').fill(`Card Sync Board ${uniqueId}`);
        await adminPage.click('#createBoardSubmitBtn');
        await expect(adminPage.locator('#boardContainer')).toBeVisible();

        const boardUrl = await adminPage.url();
        console.log(`[Admin] Board Created: ${boardUrl}`);


        // --- 2. Setup User Context (Guest) ---
        const userContext = await browser.newContext();
        const userPage = await userContext.newPage();

        await userPage.goto(boardUrl);
        await expect(userPage.locator('#userModal')).toBeVisible();
        await userPage.locator('#guestName').fill(`Guest_${uniqueId}`);
        await userPage.click('button:has-text("Join as Guest")');
        await expect(userPage.locator('#boardContainer')).toBeVisible();


        // --- 3. Admin Creates Card ---
        console.log('[Admin] Creating Card');
        // Find first column button
        const addBtn = adminPage.locator('.column:first-child .add-card-btn');
        await addBtn.click();

        // Handle Modal or Prompt? 
        // BoardController uses window.openNewCardModal
        // Wait for modal
        await expect(adminPage.locator('#cardModal')).toBeVisible();
        await adminPage.locator('#cardContent').fill('Sync Test Card');
        await adminPage.click('#saveCardBtn');

        // Verify Admin sees it
        const cardSelector = '.retro-card:has-text("Sync Test Card")';
        await expect(adminPage.locator(cardSelector)).toBeVisible();

        // Verify User sees it (Sync Check 1)
        console.log('[User] Waiting for card sync...');
        await expect(userPage.locator(cardSelector)).toBeVisible({ timeout: 10000 });
        console.log('✅ Card Creation Synced');


        // --- 4. Admin Moves Card (Drag & Drop) ---
        // Playwright Drag & Drop
        // Move from Col 1 to Col 2
        console.log('[Admin] Moving Card...');
        const cardToMove = adminPage.locator(cardSelector);
        const targetColumn = adminPage.locator('.column:nth-child(2) .cards-container');

        await cardToMove.dragTo(targetColumn);

        // --- 5. Verify Sync ---
        // User should see card in Column 2
        // We need to check parent column of the card on user page

        // Give it a moment for WS
        await userPage.waitForTimeout(1000);

        const userCard = userPage.locator(cardSelector);
        await expect(userCard).toBeVisible();

        // Assert it is inside the second column
        // We can check the ID of the second column container
        const col2Id = await adminPage.locator('.column:nth-child(2)').getAttribute('data-column-id');

        // In user page, the card should be inside #col-{col2Id}
        const userCardParent = userPage.locator(`#col-${col2Id} .retro-card:has-text("Sync Test Card")`);
        await expect(userCardParent).toBeVisible({ timeout: 10000 });

        console.log('✅ Card Move Synced');

        // Cleanup
        await adminContext.close();
        await userContext.close();
    });
});
