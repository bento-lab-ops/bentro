/**
 * ToastService - Handles Glassmorphic Notification Toasts
 */
export class ToastService {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message body
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @param {string} title - Optional title (defaults based on type)
     * @param {number} duration - Duration in ms (default 3000)
     */
    show(message, type = 'info', title = null, duration = 3000) {
        if (!title) {
            title = type.charAt(0).toUpperCase() + type.slice(1);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon Map
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const iconClass = icons[type] || icons.info;

        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${iconClass}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
            <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
        `;

        // Click to Close
        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(toast);
        });
        toast.addEventListener('click', () => this.remove(toast));

        this.container.appendChild(toast);

        // Auto Remove
        setTimeout(() => {
            this.remove(toast);
        }, duration);
    }

    remove(toast) {
        if (toast.classList.contains('hiding')) return;
        toast.classList.add('hiding');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        });
    }

    success(message, title) {
        this.show(message, 'success', title);
    }

    error(message, title) {
        this.show(message, 'error', title);
    }

    warning(message, title) {
        this.show(message, 'warning', title);
    }

    info(message, title) {
        this.show(message, 'info', title);
    }
}

export const toastService = new ToastService();

// Expose globally for legacy calls if needed
window.toast = toastService;
