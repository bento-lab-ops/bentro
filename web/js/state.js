// Global state initialization
export function initState() {
    window.currentBoard = null;
    window.currentPhase = 'input'; // 'input' or 'voting'
    window.timerInterval = null;
    window.timerSeconds = 0;
    window.ws = null;
    window.currentUser = localStorage.getItem('retroUser');
    // window.currentUserAvatar is initialized in avatars.js
    window.selectedCardId = null; // For Select-to-Merge
}
// Auto-init for backward compatibility if imported simply
initState();
