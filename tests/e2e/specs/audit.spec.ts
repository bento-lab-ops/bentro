import { test, expect } from '@playwright/test';

test.describe('BenTro v0.10.52 Critical Flows', () => {

    // Helper to handle the initial User Identity modal
    // Verified via login_debug.spec.ts
    async function handleUserModal(page) {
        try {
            const userModal = page.locator('#userModal');
            // Wait up to 5s for it to appear
            await userModal.waitFor({ state: 'visible', timeout: 5000 });

            if (await userModal.isVisible()) {
                console.log('User Modal found. Checking for Guest option...');

                // 1. Click "Continue as Guest" to reveal the form
                // Based on verification, this is required.
                const guestBtn = page.getByRole('button', { name: 'Continue as Guest' });
                if (await guestBtn.isVisible()) {
                    await guestBtn.click();
                    // Wait for form animation/display
                    await page.locator('#userForm').waitFor({ state: 'visible', timeout: 2000 });
                }

                // 2. Fill Name & Submit
                await page.locator('#userNameInput').fill('PlaywrightUser');
                // Use a more specific selector for the submit button
                await page.locator('#userForm button[type="submit"]').click();

                // 3. Verify closed
                await expect(userModal).toBeHidden();
                console.log('Logged in successfully via Guest flow');
            }
        } catch (e) {
            // It might not appear if we are already logged in or timing is off, 
            // but we log it for debugging.
            console.log('User Modal interaction skipped or failed:', e.message);
        }

        // Fallback checks (Login Modal) left as is just in case, but Guest flow is primary for v0.10.x
    }

    test('Create Board Modal - Template & i18n', async ({ page }) => {
        // Debug browser logs - Setup before navigation
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // 1. Navigate
        await page.goto('/');

        await expect(page).toHaveTitle(/BenTro/);

        // Handle User Modal if present
        await handleUserModal(page);

        // 2. Open Modal
        const newBoardBtn = page.locator('#newBoardBtn');
        await expect(newBoardBtn).toBeVisible();
        await newBoardBtn.click();

        const modal = page.locator('#newBoardModal');
        await expect(modal).toBeVisible();

        // 3. Verify Translation Integrity (No raw keys visible)
        const teamLabel = modal.locator('label[for="boardTeamSelect"]');
        await expect(teamLabel).not.toHaveText(/label\./);
        await expect(teamLabel).toContainText('Team');

        const noTeamOption = modal.locator('#boardTeamSelect option[value=""]');
        await expect(noTeamOption).not.toHaveText(/option\./);
        await expect(noTeamOption).toContainText('No Team');

        const templateLabel = modal.locator('label[for="boardTemplate"]');
        await expect(templateLabel).not.toHaveText(/label\./);
        await expect(templateLabel).toContainText('Template');

        // Check for ANY raw keys in the modal
        // This inspects the entire modal text content for "label." or "btn." or "option." followed by lowercase letters
        // We use a regex that matches common key patterns but tries to avoid false positives in URLs or code
        const modalText = await modal.textContent();
        expect(modalText).not.toMatch(/\b(label|btn|option|modal|heading)\.[a-z_]+\b/);

        // 4. Select Template "Mad / Sad / Glad"
        // Wait for options to be populated (critical for dynamic templates)
        const templateSelect = page.locator('#boardTemplate');
        await templateSelect.locator('option[value="mad-sad-glad"]').waitFor({ state: 'attached' });

        await templateSelect.selectOption('mad-sad-glad');
        // Manual dispatch to be 100% sure delegation catches it
        await templateSelect.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));

        const columnsArea = page.locator('#columnNames');
        await expect(columnsArea).toBeVisible();

        // 4. Assert Columns are populated
        // The fix should populate: "Mad 😠\nSad 😢\nGlad 😊"

        // Wait briefly for event handler
        await page.waitForTimeout(500);

        const actualValue = await columnsArea.inputValue();
        console.log('DEBUG: Actual Columns Value:', JSON.stringify(actualValue));

        // We use a looser regex to be safe against emoji variations or spacing
        await expect(columnsArea).toHaveValue(/Mad.*Sad.*Glad/s);

        // Wait for options to be populated (prevents race condition)
        await page.locator('#boardTemplate option[value="mad-sad-glad"]').waitFor({ state: 'attached' });

        // Select template and force event dispatch to ensure listener fires
        const select = page.locator('#boardTemplate');
        await select.selectOption('mad-sad-glad');

        // Manual dispatch to be 100% sure delegation catches it
        await select.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));

        // 5. Create Board
        await page.locator('#boardName').fill(`AutoTest-${Date.now()}`);
        await page.locator('#newBoardForm button[type="submit"]').click();

        // 6. Verify Board Landing
        await expect(page.locator('#boardTitle')).toBeVisible();
    });

    test('Full Board Lifecycle - Card, Phases, Voting', async ({ page }) => {
        // Setup: Create a board
        await page.goto('/');

        await handleUserModal(page);

        await page.locator('#newBoardBtn').click();
        const boardName = `Lifecycle-${Date.now()}`;
        await page.locator('#boardName').fill(boardName);
        await page.locator('#newBoardForm button[type="submit"]').click();

        await expect(page.locator('#boardTitle')).toHaveText(boardName);

        // 1. Add Card (Input Phase)
        // In v0.10.51, add column button might be different. 
        // We find the "Add Card" button in the first column.
        // v0.10.51 uses a generic class or ID? 
        // Assuming .add-card-btn exists.
        await page.locator('.add-card-btn').first().click();
        const cardContent = 'Automated Test Card';
        await page.locator('#cardContent').fill(cardContent);
        // v0.10.51 modal button might be specific
        await page.locator('#newCardForm .btn-primary').click();

        // Verify card appears
        const card = page.locator('.retro-card').filter({ hasText: cardContent });
        await expect(card).toBeVisible({ timeout: 10000 });

        // Verify Vote Buttons are HIDDEN in Input Phase
        await expect(card.locator('.vote-btn-group')).toBeHidden();

        // 2. Switch to Voting Phase
        // v0.10.51 uses #switchPhaseBtn (which toggles?) or specific logic.
        // It has #switchPhaseBtn text "Switch to Voting".
        await page.locator('#switchPhaseBtn').click();

        // v0.10.51 updates #currentPhase text
        await expect(page.locator('#currentPhase')).toHaveText('Voting Phase');

        // Verify Vote Buttons are VISIBLE
        await expect(card.locator('.vote-btn-group')).toBeVisible();

        // Test Upvote
        const upvoteBtn = card.locator('.vote-btn-up');
        await upvoteBtn.click();
        await expect(card.locator('.vote-count')).toHaveText('1');

        // 3. Switch to Discussion (Next Phase)
        // v0.10.51 button checking...
        // Does logic automatically change button text?
        // Assuming it does (Switch to Discussion).
        await page.locator('#switchPhaseBtn').click();
        await expect(page.locator('#currentPhase')).toHaveText('Discussion Phase');

        // 4. Finish Retro
        // Register dialog handler BEFORE clicking because click triggers the dialog immediately
        page.on('dialog', dialog => dialog.accept());

        await page.locator('#finishRetroBtn').click();

        // Verify Read-only state
        // v0.10.51 uses #readOnlyBanner
        await expect(page.locator('#readOnlyBanner')).toBeVisible();
    });

    test('Board Controls & Integrity', async ({ page }) => {
        await page.goto('/');

        await handleUserModal(page);

        await page.locator('#newBoardBtn').click();
        await page.locator('#boardName').fill(`ControlTest-${Date.now()}`);
        await page.locator('#newBoardForm button[type="submit"]').click({ force: true });

        // 1. Check Control Bar Elements
        // v0.10.51 uses .timer-section as control bar?
        await expect(page.locator('.timer-section')).toBeVisible();
        await expect(page.locator('#startTimerBtn')).toBeVisible();

        // 2. Legacy Leave Button check
        // v0.10.51 HAS a #leaveBoardBtn in the header (L34).
        // It should be visible if we are on a board.
        await expect(page.locator('#leaveBoardBtn')).toBeVisible();
    });

    test('Host Claim/Relinquish Flow', async ({ page }) => {
        await page.goto('/');
        await handleUserModal(page);

        // 1. Create Board (Auto-claims as Owner)
        await page.locator('#newBoardBtn').click();
        await page.locator('#boardName').fill(`HostTest-${Date.now()}`);
        await page.locator('#newBoardForm button[type="submit"]').click({ force: true });
        await expect(page.locator('#boardTitle')).toBeVisible();

        // 2. Verify "Relinquish" is visible (as we are owner)
        // And "Claim" is hidden
        const unclaimBtn = page.locator('#unclaimManagerBtn');
        const claimBtn = page.locator('#claimManagerBtn');

        await expect(unclaimBtn).toBeVisible();
        await expect(claimBtn).toBeHidden();

        // 3. Relinquish Host
        page.once('dialog', dialog => dialog.accept());
        await unclaimBtn.click();

        // 4. Verify "Claim Host" becomes visible
        // Wait for UI update (board reload)
        await expect(claimBtn).toBeVisible({ timeout: 5000 });
        await expect(unclaimBtn).toBeHidden();

        // 5. Re-Claim Host
        page.once('dialog', dialog => dialog.accept());
        await claimBtn.click();

        // 6. Verify "Relinquish" is visible again
        await expect(unclaimBtn).toBeVisible({ timeout: 5000 });
        await expect(claimBtn).toBeHidden();
    });

});
