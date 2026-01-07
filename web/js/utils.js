// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id === 'userModal' && !window.currentUser) return;
        modal.style.display = 'none';
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    // Simple toast styling (ensure CSS exists or specific toast class)
    // Assuming .toast class is defined in bentro.css or styles.css.
    // If not, we might need to add inline styles or check CSS. 
    // Based on subagent, it was missing functionality, not style.

    // Using inline styles for safety if class missing
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '1rem 2rem';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.zIndex = '9999';
    toast.style.backgroundColor = type === 'error' ? 'var(--danger, #ef4444)' : 'var(--success, #10b981)';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.transition = 'opacity 0.3s ease';

    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}
window.showToast = showToast;
