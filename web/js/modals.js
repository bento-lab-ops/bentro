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

// Global Confirmation Helper
export function showConfirm(title, message, options = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmationModal');
        if (!modal) {
            console.error('Confirmation modal not found');
            resolve(false); // Fail safe
            return;
        }

        // Elements
        const titleEl = document.getElementById('confirmationTitle');
        const msgEl = document.getElementById('confirmationMessage');
        const btnOk = document.getElementById('btnConfirmOk');
        const btnCancel = document.getElementById('btnConfirmCancel');

        // Content
        titleEl.textContent = title || 'Confirm';
        msgEl.textContent = message || 'Are you sure?';

        // Options
        const confirmText = options.confirmText || 'Confirm';
        const cancelText = options.cancelText || 'Cancel';
        const isDanger = options.isDanger !== false; // Default to true (red button) if not specified

        btnOk.textContent = confirmText;
        btnCancel.textContent = cancelText;

        // Styling
        if (isDanger) {
            btnOk.className = 'btn btn-danger';
        } else {
            btnOk.className = 'btn btn-primary';
        }

        // Alert Mode (Single Button)
        if (options.isAlert) {
            btnCancel.style.display = 'none';
        } else {
            btnCancel.style.display = 'inline-block';
        }


        // Handlers
        const close = () => {
            modal.style.display = 'none';
            cleanup();
        };

        const handleOk = () => {
            close();
            resolve(true);
        };

        const handleCancel = () => {
            close();
            resolve(false);
        };

        const handleOutside = (e) => {
            if (e.target === modal && !options.isAlert) {
                handleCancel();
            }
        };

        const cleanup = () => {
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
            window.removeEventListener('click', handleOutside);
        }


        // Bind
        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
        window.addEventListener('click', handleOutside);

        // Show
        modal.style.display = 'block';
    });
}
// Alias for alerts
export function showAlert(title, message) {
    return showConfirm(title, message, { isAlert: true, confirmText: 'OK', isDanger: false });
}


// Global Shim
window.loadModals = loadModals;
window.showConfirm = showConfirm;
window.showAlert = showAlert;
