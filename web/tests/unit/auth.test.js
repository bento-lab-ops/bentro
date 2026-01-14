/**
 * @vi-environment jsdom
 */

import { openLoginModal } from '../../js/auth.js';

// Mock dependencies
vi.mock('../../js/i18n.js', () => ({
    i18n: {
        t: (key) => key,
    }
}));

// Mock other functions in auth.js if they are not exported or if we want to isolate
// Since they are in the same module, we can't easily mock them if they are called directly within the module
// unless we change how we import them or if we rely on them working.
// For now, let's assume they work or we stub the DOM so they don't crash.

describe('auth.js', () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    test('openLoginModal should display userModal and hide registerModal', () => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="loginModal" style="display: none;"></div>
            <div id="registerModal" style="display: block;"></div>
            <div id="userModal" style="display: block;"></div>
        `;

        openLoginModal();

        // Assertions
        expect(document.getElementById('loginModal').style.display).toBe('block');
        expect(document.getElementById('registerModal').style.display).toBe('none');
        // openLoginModal also hides userModal if it exists
        expect(document.getElementById('userModal').style.display).toBe('none');
    });

    test('openLoginModal should not crash if modals are missing', () => {
        document.body.innerHTML = ''; // Empty DOM
        expect(() => openLoginModal()).not.toThrow();
    });
});
