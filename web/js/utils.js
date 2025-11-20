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
