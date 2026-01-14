import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Global Mocks
window.showAlert = vi.fn();
window.confirm = vi.fn(() => true);
window.alert = vi.fn();
window.i18n = {
    t: (key) => key,
    updatePage: vi.fn(),
    changeLanguage: vi.fn(),
};

// Mock LocalStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: function (key) {
            return store[key] || null;
        },
        setItem: function (key, value) {
            store[key] = value.toString();
        },
        clear: function () {
            store = {};
        },
        removeItem: function (key) {
            delete store[key];
        }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock common DOM elements that might be missing in JSDOM default
document.createRange = () => ({
    setStart: () => { },
    setEnd: () => { },
    commonAncestorContainer: {
        nodeName: 'BODY',
        ownerDocument: document,
    },
});
