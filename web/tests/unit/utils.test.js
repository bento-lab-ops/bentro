import { describe, it, expect, vi, afterEach } from 'vitest';
import { escapeHtml, showToast } from '../../js/utils.js';

describe('Utils', () => {
    describe('escapeHtml', () => {
        it('should escape generic HTML tags', () => {
            const input = '<script>alert("xss")</script>';
            const output = escapeHtml(input);
            expect(output).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        it('should return plain text unchanged', () => {
            const input = 'Hello World';
            const output = escapeHtml(input);
            expect(output).toBe('Hello World');
        });
    });

    describe('showToast', () => {
        afterEach(() => {
            document.body.innerHTML = '';
            vi.useRealTimers();
        });

        it('should create a toast element', () => {
            vi.useFakeTimers();
            showToast('Test Message', 'success');

            const toast = document.querySelector('.toast');
            expect(toast).toBeTruthy();
            expect(toast.innerText).toBe('Test Message');
            expect(toast.className).toContain('toast-success');
        });
    });
});
