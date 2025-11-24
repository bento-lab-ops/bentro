// Global state
window.currentBoard = null;
window.currentPhase = 'input'; // 'input' or 'voting'
window.timerInterval = null;
window.timerSeconds = 0;
window.ws = null;
window.currentUser = localStorage.getItem('retroUser');
window.selectedCardId = null; // For Select-to-Merge
