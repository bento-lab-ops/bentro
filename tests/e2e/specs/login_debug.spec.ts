
import { test, expect } from '@playwright/test';

test.describe('Debug Login Flow', () => {

    test('User Modal Interaction', async ({ page }) => {
        // 1. Navigate
        await page.goto('/');

        // 2. Wait for User Modal
        const userModal = page.locator('#userModal');
        await expect(userModal).toBeVisible({ timeout: 10000 });

        console.log('User Modal Visible');

        // 3. Check for "Continue as Guest" button
        // Based on L186: <button ... onclick="toggleGuestForm()" ...>Continue as Guest</button>
        const guestBtn = page.getByRole('button', { name: 'Continue as Guest' });

        if (await guestBtn.isVisible()) {
            console.log('Clicking Continue as Guest');
            await guestBtn.click();
        } else {
            console.log('Continue as Guest button NOT found?');
        }

        // 4. Wait for #userForm
        const userForm = page.locator('#userForm');
        await expect(userForm).toBeVisible({ timeout: 5000 });
        console.log('User Form Visible');

        // 5. Fill Name
        await page.locator('#userNameInput').fill('DebugUser');

        // 6. Submit
        const submitBtn = userForm.locator('button[type="submit"]');
        await submitBtn.click();

        // 7. Verify Modal Gone
        await expect(userModal).toBeHidden();
        console.log('User Modal Hidden');

        // 8. Verify LocalStorage
        const user = await page.evaluate(() => localStorage.getItem('retroUser'));
        console.log('LocalStorage User:', user);
        expect(user).toBe('DebugUser');
    });
});
