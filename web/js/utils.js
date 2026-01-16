// Utility Functions
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id === 'userModal' && !window.currentUser) return;
        modal.style.display = 'none';
    });
}

// Utility Functions
export function showToast(message, type = 'success') {
    if (window.toast) {
        window.toast.show(message, type);
    } else {
        console.warn('ToastService not initialized, falling back to console:', message);
    }
}

// Global Shims
window.escapeHtml = escapeHtml;
window.closeModals = closeModals;
window.showToast = showToast;
