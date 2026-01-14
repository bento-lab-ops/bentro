import { describe, it, expect } from 'vitest';
import { escapeHtml, closeModals, showToast } from './utils';

// Helper to setup basic DOM
function setupDOM() {
    document.body.innerHTML = '';
}

describe('Utils', () => {

    describe('escapeHtml', () => {
        it('should escape HTML tags', () => {
            const input = '<div>test</div>';
            const expected = '&lt;div&gt;test&lt;/div&gt;';
            expect(escapeHtml(input)).toBe(expected);
        });

        it('should handle plain text', () => {
            expect(escapeHtml('hello')).toBe('hello');
        });

        it('should handle empty string', () => {
            expect(escapeHtml('')).toBe('');
        });
    });

    describe('closeModals', () => {
        beforeEach(() => setupDOM());

        it('should hide all modals', () => {
            document.body.innerHTML = `
                <div id="modal1" class="modal" style="display: block;"></div>
                <div id="modal2" class="modal" style="display: block;"></div>
            `;
            closeModals();
            document.querySelectorAll('.modal').forEach(modal => {
                expect(modal.style.display).toBe('none');
            });
        });

        it('should close userModal if currentUser is active', () => {
            // Mock currentUser global (User logged in)
            window.currentUser = { id: 1 };
            document.body.innerHTML = `
                <div id="userModal" class="modal" style="display: block;"></div>
            `;
            closeModals();
            const modal = document.getElementById('userModal');
            // Logic: if current user exists, we allow closing the modal (e.g. after login)
            expect(modal.style.display).toBe('none');

            // Cleanup
            delete window.currentUser;
        });

        it('should FORCE userModal open (not close) if currentUser is NOT active', () => {
            // Ensure no currentUser (Guest/Logged out)
            delete window.currentUser;
            document.body.innerHTML = `
                <div id="userModal" class="modal" style="display: block;"></div>
            `;
            closeModals();
            const modal = document.getElementById('userModal');
            // Logic: If no user, keep forcing login/register modal open? 
            // Based on code: if (id=='userModal' && !currentUser) return; -> skips hiding
            expect(modal.style.display).toBe('block');
        });
    });

    describe('showToast', () => {
        beforeEach(() => {
            setupDOM();
            // Mock timers to avoid waiting
            // Vitest uses @sinonjs/fake-timers style
            // vi.useFakeTimers(); 
            // For now, check if element is added
        });

        it('should add a toast to the DOM', () => {
            showToast('Hello World');
            const toast = document.querySelector('.toast');
            expect(toast).not.toBeNull();
            expect(toast.innerText).toBe('Hello World');
            expect(toast.classList.contains('toast-success')).toBe(true);
        });

        it('should add an error toast', () => {
            showToast('Error!', 'error');
            const toast = document.querySelector('.toast');
            expect(toast.classList.contains('toast-error')).toBe(true);
        });
    });
});
