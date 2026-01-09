import { i18n } from './i18n.js';
import { APP_VERSION } from './config.js';

// Load Modals dynamically
export async function loadModals() {
    try {
        const buster = typeof APP_VERSION !== 'undefined' ? APP_VERSION : Date.now();
        const response = await fetch(`/static/modals.html?v=${buster}`);
        if (!response.ok) throw new Error('Failed to load modals');
        const html = await response.text();
        document.getElementById('modals-container').innerHTML = html;
        if (window.i18n) window.i18n.updatePage(); // Update translations for loaded modals
        console.log('Modals loaded successfully');
    } catch (error) {
        console.error('Error loading modals:', error);
    }
}

// Global Shim
window.loadModals = loadModals;
