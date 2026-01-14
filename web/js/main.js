import { CONFIG, APP_VERSION } from './config.js';
import './i18n.js';
import { i18n } from './i18n.js';
import { initWebSocket } from './api.js';
import { escapeHtml, closeModals } from './utils.js';
// Imports


import { dashboardController } from './controllers/DashboardController.js';
import { boardController } from './controllers/BoardController.js';
import { boardService } from './services/BoardService.js';
import { userController } from './controllers/UserController.js';
import { adminController } from './controllers/AdminController.js';
import { loadModals } from './modals.js';
import { teamsController } from './controllers/TeamsController.js';
import { actionItemsController } from './controllers/ActionItemsController.js';
import './auth.js';
import { navController } from './controllers/NavController.js';
import './admin-users.js';
import './admin-boards.js';
import './admin-actions.js';





// ... unchanged functions ...





// App Initialization
async function initUI() {
    console.log(`%c🎯 BenTro ${APP_VERSION} `, 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    // Load Modals - handled in DOMContentLoaded
    // await loadModals();

    // Initialize Dashboard Controller (Templates, etc)
    dashboardController.init();

    // Request notification permission for timer sounds
    if (typeof requestNotificationPermission === 'function') {
        requestNotificationPermission();
    }

    // Populate avatar selector (userModal)
    // Note: avatars.js has populateAvatarSelector? No, I checked avatars.js and it DID NOT have it.
    // main.js had it. I need to implementation it here or use the one I moved?
    // Wait, I didn't see populateAvatarSelector in avatars.js export list in main.js import above?
    // I added it to the import list but does it exist?
    // Let's implement it here if needed or check avatars.js content from cache.
    // Step 6236: "Converted avatars.js... exporting AVAILABLE_AVATARS, getUserAvatar, setUserAvatar".
    // It did NOT export populateAvatarSelector.
    // So I must keep populateAvatarSelector in main.js (below).

    initWebSocket();

    // Initialize Theme
    initTheme();

    // Initialize i18n
    if (window.i18n) {
        window.i18n.init();
    }

    // Initialize Navigation Controller
    navController.init();

    console.log('%c✅ UI Initialized', 'color: #4CAF50; font-weight: bold;');
}

async function initApp() {
    // 1. Initialize UI Skeleton first
    await initUI();

    // 2. Initialize User State (Auth) & UI
    await userController.init();

    // 3. Handle Routing & View State
    // Decoupled start ensures User Auth is resolved first
    navController.start();

    // Set version in Help Modal
    const versionSpan = document.getElementById('appVersion');
    if (versionSpan) {
        versionSpan.textContent = APP_VERSION;
    }
}

// Handle URL routing based on hash - MOVED TO NavController.js

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '🌞' : '🌙';
        btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

// updateUserDisplay removed (moved to UserController)

// Replaced by DashboardController
function showDashboard() {
    dashboardController.showView();
    dashboardController.init();

    // Legacy cleanup that might still be needed if Controller doesn't handle global UI reset fully
    // But Controller.showView does display block/none
    document.getElementById('boardContainer').style.display = 'none'; // redundancy safe
    window.currentBoard = null;

    if (window.location.hash && window.location.hash !== '#dashboard') {
        history.pushState(null, null, ' ');
    }
}

// Board Templates handling moved to DashboardController

// Helper for New Card Modal (previously in board.js)
function openNewCardModal(columnId) {
    const modal = document.getElementById('newCardModal');
    if (modal) {
        document.getElementById('cardColumnId').value = columnId;
        document.getElementById('cardContent').value = '';
        modal.style.display = 'block';
        document.getElementById('cardContent').focus();
    }
}

// Global for legacy button access if needed
window.openNewCardModal = openNewCardModal;

function setupEventListeners() {
    // User Form
    document.getElementById('userForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userNameInput').value.trim();
        const avatar = document.getElementById('selectedAvatar').value;
        if (name) {
            userController.currentUser = name;
            userController.currentUserAvatar = avatar;
            localStorage.setItem('retroUser', name);
            localStorage.setItem('retroUserAvatar', avatar);

            userController.syncGlobalState(); // Update window vars
            document.getElementById('userModal').style.display = 'none';
            userController.updateDisplay();
            navController.handleRouting();
        }
    });

    document.getElementById('dashboardBtn')?.addEventListener('click', () => {
        window.location.hash = '';
    });
    document.getElementById('actionItemsBtn')?.addEventListener('click', () => {
        window.location.hash = 'action-items';
    });

    document.getElementById('newBoardBtn')?.addEventListener('click', async () => {
        document.getElementById('newBoardModal').style.display = 'block';
        await teamsController.populateBoardTeamSelect();
    });

    document.getElementById('newBoardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('boardName').value;
        const columnsText = document.getElementById('columnNames').value.trim();
        const columns = columnsText ? columnsText.split('\n').filter(c => c.trim()) : [];
        const selectedTeamId = document.getElementById('boardTeamSelect')?.value;
        const teamId = selectedTeamId !== '' ? selectedTeamId : null;

        await dashboardController.handleCreateBoard(name, columns, teamId);
        closeModals();
        if (!teamId) {
            dashboardController.init();
        }
    });

    // Template Selection Listener moved to DashboardController

    document.getElementById('newCardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('cardColumnId').value;
        const content = document.getElementById('cardContent').value;

        if (boardController && boardController.boardId) {
            const { apiCall } = await import('./api.js');
            const { sendWebSocketMessage } = await import('./api.js');
            await apiCall(`/columns/${columnId}/cards`, 'POST', {
                column_id: columnId,
                content: content,
                owner: window.currentUser
            });
            sendWebSocketMessage('board_update', { board_id: boardController.boardId });
            boardController.loadBoardData();
        }
        closeModals();
    });

    document.getElementById('editColumnForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('editColumnId').value;
        const name = document.getElementById('columnNameEdit').value;

        if (boardController && boardController.boardId) {
            const { apiCall, sendWebSocketMessage } = await import('./api.js');
            await apiCall(`/columns/${columnId}`, 'PUT', { name });
            sendWebSocketMessage('board_update', { board_id: boardController.boardId });
            boardController.loadBoardData();
        }
        closeModals();
    });

    document.getElementById('newColumnForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newColumnName').value;
        const boardId = document.getElementById('newColumnBoardId').value || (boardController ? boardController.boardId : null);

        if (boardId) {
            try {
                // Reuse BoardController logic or call service?
                // BoardController has submitAddColumn
                if (boardController) {
                    await boardController.submitAddColumn(name);
                } else {
                    const { apiCall } = await import('./api.js');
                    await apiCall(`/boards/${boardId}/columns`, 'POST', { name });
                }
                closeModals();
            } catch (e) {
                alert(e.message);
            }
        }
    });

    document.getElementById('addColumnBtn')?.addEventListener('click', async () => {
        // This button might be inside Board View now? 
        // BoardView renders it inside .board.
        // If it's the global one in header (unused?), we can ignore.
        // BoardView has its own button with `data-action="addColumn"`.
        // BoardController handles it.
        // BUT, if legacy button exists?
        // Let's keep a shim calling BoardController.handleAddColumn()
        if (boardController && boardController.handleAddColumn) {
            boardController.handleAddColumn();
        }
    });

    document.getElementById('startTimerBtn')?.addEventListener('click', () => {
        if (boardController) boardController.handleStartTimer();
    });
    document.getElementById('stopTimerBtn')?.addEventListener('click', () => {
        if (boardController) boardController.handleStopTimer();
    });
    document.getElementById('switchPhaseBtn')?.addEventListener('click', () => {
        if (boardController) boardController.handleSwitchPhase();
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });

    // ... user auth listeners unchanged ...
    document.getElementById('continueAsUserBtn')?.addEventListener('click', () => userController.confirmReturningUser());
    document.getElementById('changeUserBtn')?.addEventListener('click', () => userController.handleChangeUser());
    document.getElementById('editUserBtn')?.addEventListener('click', () => userController.openEditUserModal());
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'block';
    });
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Explicitly attach hamburger menu listener
    const hamburgerBtn = document.getElementById('hamburgerBtn') || document.querySelector('.hamburger-btn');
    if (hamburgerBtn) {
        console.log('Hamburger button found, attaching listener');
        hamburgerBtn.addEventListener('click', (e) => {
            console.log('Hamburger Clicked!');
            e.preventDefault();
            e.stopPropagation();
            if (navController) {
                navController.toggleMenu();
            } else {
                console.error('navController not initialized');
            }
        });
    } else {
        console.error('Hamburger button NOT found!');
    }

    // Explicitly attach overlay listener for safety
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            console.log('Overlay clicked');
            if (navController) {
                navController.closeMenu();
            }
        });
    }


}

// Dashboard Filtering moved to DashboardController
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                e.target.blur();
                closeModals();
            }
            return;
        }

        if (e.key === 'Escape') {
            closeModals();
            if (boardController && boardController.handleCancelSelection) boardController.handleCancelSelection();
            return;
        }

        if (e.key === '?' && e.shiftKey) {
            const helpModal = document.getElementById('helpModal');
            if (helpModal) helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
            return;
        }

        if (window.currentBoard || (boardController && boardController.boardId)) {
            if ((e.key === 'E' || e.key === 'e') && e.shiftKey) {
                e.preventDefault();
                if (boardController) boardController.handleExportBoard();
            }
            if ((e.key === 'T' || e.key === 't') && e.shiftKey) {
                e.preventDefault();
                const startBtn = document.getElementById('startTimerBtn');
                const stopBtn = document.getElementById('stopTimerBtn');
                if (boardController) {
                    // Logic to toggle? Controller needs a toggle or we check UI state?
                    // Controller knows state?
                    // Let's blindly call handleStart if visible? or just check button display.
                    if (stopBtn && stopBtn.style.display !== 'none') boardController.handleStopTimer();
                    else if (startBtn && !startBtn.disabled) boardController.handleStartTimer();
                }
            }
            if ((e.key === 'V' || e.key === 'v') && e.shiftKey) {
                e.preventDefault();
                const switchBtn = document.getElementById('switchPhaseBtn');
                if (switchBtn && !switchBtn.disabled && boardController) boardController.handleSwitchPhase();
            }
            if ((e.key === 'N' || e.key === 'n') && e.shiftKey) {
                e.preventDefault();
                // Check if columns exist
                // Accessing window.currentBoard might still work if Controller updates it (it does for legacy compat)
                // Or access boardController.board
                const board = boardController?.board || window.currentBoard;
                if (board && board.columns && board.columns.length > 0) {
                    openNewCardModal(board.columns[0].id);
                }
            }
        }
    });
}

// Avatar Logic (Local implementation for userModal)
// populateAvatarSelector removed (moved to UserController)


// Wrappers
window.finishRetro = function () {
    if (window.currentBoard && confirm(i18n.t('confirm.finish_retro'))) {
        updateBoardStatus(window.currentBoard.id, 'finished');
    }
};

window.reopenRetro = function () {
    if (window.currentBoard && confirm(i18n.t('confirm.reopen_retro'))) {
        updateBoardStatus(window.currentBoard.id, 'active');
    }
};

window.exportCurrentBoard = function () {
    if (window.currentBoard) {
        exportBoardToCSV(window.currentBoard.id);
    }
};

// Shims
window.initApp = initApp;
window.initUI = initUI;
window.showDashboard = () => dashboardController.showView();
window.toggleTheme = toggleTheme;
window.filterBoards = (status) => dashboardController.filterBoards(status);
window.joinBoardPersistent = (id) => dashboardController.joinBoard(id);
window.leaveBoardPersistent = async (boardId) => {
    // If not passed (like from onclick), try to get from global state
    if (!boardId && window.currentBoard) boardId = window.currentBoard.id;
    if (!boardId && window.boardId) boardId = window.boardId;

    if (!boardId) {
        console.error('Board ID undefined during leave');
        // Try getting from URL hash
        const hash = window.location.hash;
        if (hash.startsWith('#board/')) {
            boardId = hash.replace('#board/', '');
        } else {
            await window.showAlert('Error', i18n.t('alert.error') || 'Error: Board ID missing');
            return;
        }
    }

    if (await window.showConfirm(i18n.t('confirm.leave_board'), "Are you sure you want to leave this board?", { isDanger: false, confirmText: 'Leave' })) {
        const username = window.currentUser;
        if (username) {
            try {
                console.log('Leaving board:', boardId, 'User:', username);
                await boardService.leave(boardId, username);
                console.log('Left board successfully');
                window.currentBoard = null;
                window.location.hash = '#dashboard';
            } catch (e) {
                console.error('Leave failed:', e);
                await window.showAlert('Error', 'Failed to leave: ' + e.message);
                // Even if API fails, user wants to leave UI?
                // For now, let's allow them to stay if error, or prompt?
                // Standard behavior is usually block on error.
            }
        }
    }
};
window.boardController = boardController; // Expose for board.js referencing
// leaveBoardPersistent is usually called from within the board view, which is Phase 4.
// But for now, if dashboard uses it? No, dashboard uses join.
// The dashboard card has 'Return' or 'Join'.
// 'Return' calls loadBoard(id).
// 'Join' calls joinBoardPersistent(id).

// Create Board is handled by listener, but let's shim it just in case logic uses it?
// window.createBoard = undefined; // We don't want global usage if possible.

// Missing Modal Logic
function openNewColumnModal(boardId) {
    const modal = document.getElementById('newColumnModal');
    if (modal) {
        document.getElementById('newColumnBoardId').value = boardId;
        document.getElementById('newColumnName').value = '';
        modal.style.display = 'block';
        document.getElementById('newColumnName').focus();
    }
}

function closeNewColumnModal() {
    const modal = document.getElementById('newColumnModal');
    if (modal) modal.style.display = 'none';
}

function openBoardSettings(boardId) {
    const modal = document.getElementById('boardSettingsModal');
    if (modal) {
        // Populate
        const board = window.currentBoard || (boardController && boardController.board);
        if (board) {
            document.getElementById('settingVoteLimit').value = board.vote_limit || 0;
            document.getElementById('settingBlindVoting').checked = !!board.blind_voting;
        }
        modal.style.display = 'block';
    }
}

function closeBoardSettingsModal() {
    const modal = document.getElementById('boardSettingsModal');
    if (modal) modal.style.display = 'none';
}

window.saveBoardSettings = async function () {
    const limit = parseInt(document.getElementById('settingVoteLimit').value) || 0;
    const blind = document.getElementById('settingBlindVoting').checked;

    if (window.currentBoard) {
        try {
            await boardService.update(window.currentBoard.id, {
                vote_limit: limit,
                blind_voting: blind
            });
            closeBoardSettingsModal();
            // Reload board
            if (boardController) boardController.loadBoardData();
        } catch (e) {
            await window.showAlert('Error', 'Failed to save settings: ' + e.message);
        }
    }
};

// Expose
window.openNewColumnModal = openNewColumnModal;
window.closeNewColumnModal = closeNewColumnModal;
window.openBoardSettings = openBoardSettings;
window.closeBoardSettingsModal = closeBoardSettingsModal;

// Main Execution
document.addEventListener('DOMContentLoaded', async () => {
    await loadModals();

    // Initialize Flatpickr for date inputs
    if (typeof flatpickr !== 'undefined') {
        flatpickr("input[type=date]", {
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            theme: "dark",
            disableMobile: "true",
            // static: true removed to let it float above modal
        });
    }

    setupEventListeners();
    setupKeyboardShortcuts();
    initApp();

    // Auto-close menu on link clicks
    const menuList = document.getElementById('menuList');
    if (menuList) {
        menuList.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
                if (navController) navController.toggleMenu(true);
            }
        });
    }
});
// Global Shims for content loaded by other modules
window.loadBoard = async (boardId) => {
    console.log('Global loadBoard called for:', boardId);
    if (boardController) {
        await boardController.init({ id: boardId });
    }
};

window.loadBoards = async () => {
    console.log('Global loadBoards called');
    if (dashboardController) {
        await dashboardController.loadBoards();
    }
};
