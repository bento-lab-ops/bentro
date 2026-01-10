import { CONFIG, APP_VERSION } from './config.js';
import './i18n.js'; // Import for side effects (global shims)
import { i18n } from './i18n.js';
import { initWebSocket } from './api.js';
import { escapeHtml, closeModals } from './utils.js';
import {
    // loadBoard, // Moved to BoardController
    // loadBoards, // Moved to DashboardController
    // createBoard, // Moved to BoardService
    createColumn,
    createCard,
    updateColumn,
    updateBoardStatus,
    exportBoardToCSV,
    // leaveBoardPersistent, // Moved to DashboardController (shimmed below if needed)
    openNewCardModal,
    // filterBoards // Moved to DashboardController
} from './board.js';
import { dashboardController } from './controllers/DashboardController.js';
import { boardController } from './controllers/BoardController.js'; // Phase 4
import { boardService } from './services/BoardService.js';
import {
    startTimer,
    stopTimer,
    switchPhase
} from './timer.js';
import {
    selectAvatar,
    getUserAvatar,
    setUserAvatar,
    AVAILABLE_AVATARS
} from './avatars.js';
import { loadAdminView } from './admin.js';
import { loadModals } from './modals.js';
import {
    loadTeamsView,
    openTeamDetails,
    populateBoardTeamSelect,
    addTeamToBoard,
    openManageTeamsModal
} from './teams.js';
import { loadActionItemsView } from './action_items.js';

// Legacy / Auth shims
// auth.js and admin-users.js etc are imported implicitly by their shims OR we should import them to ensure they run/register?
// Since they are modules, they need to be imported once to execute their TOP LEVEL code (which sets shims).
// However, main.js is the entry point. Vite will bundle everything reachable.
// If we don't import them, they might not be included?
// YES. We must import them for side-effects (shims) if nothing else.
import './auth.js';
import { navController } from './controllers/NavController.js'; // Replaces ./menu.js
import './admin-users.js';
import './admin-boards.js';
import './admin-actions.js';

// App Initialization
async function initUI() {
    console.log(`%c🎯 BenTro ${APP_VERSION} `, 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    // Load board templates from JSON
    loadBoardTemplates();

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
    // populateAvatarSelector depends on DOM, initUI calls it? No, initUI calls it but I need to define it.

    // 2. Initialize User State (Auth)
    console.log('%c👤 Checking User Status...', 'color: #2196F3;');

    // First, check if we have a server-side session (Google Auth)
    try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
            const user = await response.json();
            window.currentUser = user.display_name || user.name;
            window.currentUserAvatar = user.avatar_url || '👤';
            window.currentUserId = user.id;
            window.currentUserEmail = user.email;
            window.currentUserFullName = user.name;
            window.currentUserRole = user.role;
            window.isGoogleAuth = true;
            console.log('%c🔐 Logged in via Google', 'color: #4CAF50; font-weight: bold;');
        }
    } catch (e) {
        console.log('No active session');
    }

    // Fallback to LocalStorage if no session
    if (!window.currentUser) {
        const storedUser = localStorage.getItem('retroUser');
        if (storedUser) {
            window.currentUser = storedUser;
            window.currentUserAvatar = localStorage.getItem('retroUserAvatar') || '👤';
        }
    }

    // 3. Handle Routing & View State
    window.addEventListener('popstate', handleUrlHash);
    window.addEventListener('hashchange', handleUrlHash);
    handleUrlHash(); // Initial route

    // 4. Final UI Adjustments based on User State
    if (!window.currentUser) {
        console.log('%c📝 Showing login modal', 'color: #FF9800; font-style: italic;');
        document.getElementById('userModal').style.display = 'block';
        populateAvatarSelector(); // Call explicitly here
    } else {
        updateUserDisplay();
        if (!window.location.hash || window.location.hash === '#dashboard') {
            console.log('%c👋 User authenticated, showing dashboard', 'color: #4CAF50; font-style: italic;');
            showDashboard();
        }
    }

    // Set version in Help Modal
    const versionSpan = document.getElementById('appVersion');
    if (versionSpan) {
        versionSpan.textContent = APP_VERSION;
    }
}

// Handle URL routing based on hash
// Handle URL routing based on hash
async function handleUrlHash() {
    // Basic User Visibility Check shim
    if (!window.currentUser && document.getElementById('userModal')) {
        document.getElementById('userModal').style.display = 'block';
        return;
    }

    const hash = window.location.hash;

    // Hide Modals by default on route change
    if (document.getElementById('returningUserModal')) document.getElementById('returningUserModal').style.display = 'none';
    if (document.getElementById('userModal')) document.getElementById('userModal').style.display = 'none';

    if (!hash || hash === '#dashboard') {
        await dashboardController.showView();
    } else if (hash.startsWith('#board/')) {
        const boardId = hash.split('#board/')[1];
        if (boardId) {
            // Phase 4: Use BoardController
            await boardController.init({ id: boardId });
        }
    } else if (hash === '#admin') {
        await loadAdminView();
    } else if (hash === '#teams') {
        await loadTeamsView();
    } else if (hash === '#action-items') {
        await loadActionItemsView();
    } else if (hash.startsWith('#team/')) {
        const teamId = hash.replace('#team/', '');
        if (teamId && openTeamDetails) {
            openTeamDetails(teamId);
        }
    } else {
        // Fallback
        await dashboardController.showView();
    }
}

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

function showReturningUserModal(username) {
    const avatar = getUserAvatar();
    document.getElementById('returningUserName').textContent = `${avatar} ${username}`;
    document.getElementById('returningUserModal').style.display = 'block';
}

function confirmReturningUser() {
    window.currentUserAvatar = getUserAvatar();
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    const editBtn = document.getElementById('editUserBtn');
    if (editBtn) editBtn.style.display = 'inline-block';
    handleUrlHash();
}

function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = window.currentUser || '';
    populateAvatarSelector();
    modal.style.display = 'block';
    document.getElementById('userNameInput').focus();
}

function updateUserDisplay() {
    const avatar = window.currentUserAvatar || getUserAvatar();
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.innerHTML = `${avatar} ${escapeHtml(window.currentUser)} <span class="edit-icon" title="Edit Profile">✏️</span>`;
    }
    const editBtn = document.getElementById('editUserBtn');
    if (editBtn) editBtn.style.display = 'inline-block';

    // Also show New Board button if on dashboard (or generic init)
    const newBoardBtn = document.getElementById('newBoardBtn');
    if (newBoardBtn) newBoardBtn.style.display = 'inline-block';
}

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

// Board Templates
let BOARD_TEMPLATES = {};
let RAW_TEMPLATES = {};

async function loadBoardTemplates() {
    try {
        const response = await fetch(`/static/board-templates.json?v=${new Date().getTime()}`);
        const templates = await response.json();
        RAW_TEMPLATES = templates;
        BOARD_TEMPLATES = {};
        for (const [key, value] of Object.entries(templates)) {
            BOARD_TEMPLATES[key] = value.columns;
        }
        populateTemplateDropdown();
        console.log('%c✅ Board templates loaded', 'color: #4CAF50; font-weight: bold;', Object.keys(BOARD_TEMPLATES).length, 'templates');
    } catch (error) {
        console.error('Failed to load board templates:', error);
        BOARD_TEMPLATES = {
            'start-stop-continue': ['Start Doing', 'Stop Doing', 'Continue Doing'],
            'mad-sad-glad': ['Mad 😠', 'Sad 😢', 'Glad 😊'],
            '4ls': ['Liked 👍', 'Learned 💡', 'Lacked 🤔', 'Longed For 🌟'],
            'wwn-badly-action': ['What Went Well ✅', 'Needs Attention ⚠️', 'Action Items 🎯'],
            'sailboat': ['Wind 💨', 'Anchor ⚓', 'Rocks 🪨', 'Island 🏝️']
        };
        RAW_TEMPLATES = {};
        for (const [key, cols] of Object.entries(BOARD_TEMPLATES)) {
            RAW_TEMPLATES[key] = { name: key, columns: cols };
        }
        populateTemplateDropdown();
    }
}

function populateTemplateDropdown() {
    const select = document.getElementById('boardTemplate');
    if (!select) return;
    const currentSelection = select.value;
    select.innerHTML = '';

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = i18n.t('template.custom') || 'Custom (Manual Entry)';
    select.appendChild(customOption);

    for (const [key, value] of Object.entries(RAW_TEMPLATES)) {
        const option = document.createElement('option');
        option.value = key;
        const nameKey = `template.${key}.name`;
        const translatedName = i18n.t(nameKey);
        option.textContent = (translatedName && translatedName !== nameKey) ? translatedName : value.name;
        select.appendChild(option);
    }

    if (currentSelection && (RAW_TEMPLATES[currentSelection] || currentSelection === 'custom')) {
        select.value = currentSelection;
    }
}

document.addEventListener('languageChanged', () => {
    populateTemplateDropdown();
    const select = document.getElementById('boardTemplate');
    if (select && select.value !== 'custom' && BOARD_TEMPLATES[select.value]) {
        select.dispatchEvent(new Event('change'));
    }
});

function setupEventListeners() {
    // User Form
    document.getElementById('userForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userNameInput').value.trim();
        const avatar = document.getElementById('selectedAvatar').value;
        if (name) {
            window.currentUser = name;
            window.currentUserAvatar = avatar;
            localStorage.setItem('retroUser', name);
            localStorage.setItem('retroUserAvatar', avatar);
            document.getElementById('userModal').style.display = 'none';
            updateUserDisplay();
            handleUrlHash();
        }
    });

    document.getElementById('dashboardBtn')?.addEventListener('click', () => {
        showDashboard(); // Directly call shows
    });
    document.getElementById('actionItemsBtn')?.addEventListener('click', () => {
        window.location.hash = 'action-items';
    });

    document.getElementById('newBoardBtn')?.addEventListener('click', async () => {
        document.getElementById('newBoardModal').style.display = 'block';
        await populateBoardTeamSelect();
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

    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'boardTemplate') {
            const selectedValue = e.target.value;
            const columnNamesTextarea = document.getElementById('columnNames');
            if (!columnNamesTextarea) return;

            if (selectedValue === 'custom') {
                columnNamesTextarea.value = '';
                columnNamesTextarea.placeholder = 'Enter custom columns...';
            } else if (BOARD_TEMPLATES[selectedValue]) {
                const template = BOARD_TEMPLATES[selectedValue];
                if (Array.isArray(template)) {
                    columnNamesTextarea.value = template.join('\n');
                }
            }
        }
    });

    document.getElementById('newCardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('cardColumnId').value;
        const content = document.getElementById('cardContent').value;
        await createCard(columnId, content);
        closeModals();
    });

    document.getElementById('editColumnForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('editColumnId').value;
        const name = document.getElementById('columnNameEdit').value;
        await updateColumn(columnId, name);
        closeModals();
    });

    document.getElementById('addColumnBtn')?.addEventListener('click', async () => {
        const name = prompt('Enter column name:');
        if (name) {
            const position = window.currentBoard.columns.length;
            await createColumn(name, position);
        }
    });

    document.getElementById('startTimerBtn')?.addEventListener('click', startTimer);
    document.getElementById('stopTimerBtn')?.addEventListener('click', stopTimer);
    document.getElementById('switchPhaseBtn')?.addEventListener('click', switchPhase);

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });

    document.getElementById('continueAsUserBtn')?.addEventListener('click', confirmReturningUser);

    document.getElementById('changeUserBtn')?.addEventListener('click', () => {
        document.getElementById('returningUserModal').style.display = 'none';
        window.currentUser = null;
        localStorage.removeItem('retroUser');
        localStorage.removeItem('adminToken');
        document.getElementById('userModal').style.display = 'block';
    });

    document.getElementById('editUserBtn')?.addEventListener('click', openEditUserModal);

    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'block';
    });

    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

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
            if (typeof cancelSelection === 'function') cancelSelection();
            return;
        }

        if (e.key === '?' && e.shiftKey) {
            const helpModal = document.getElementById('helpModal');
            if (helpModal) helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
            return;
        }

        if (window.currentBoard) {
            if ((e.key === 'E' || e.key === 'e') && e.shiftKey) {
                e.preventDefault();
                exportBoardToCSV(window.currentBoard.id);
            }
            if ((e.key === 'T' || e.key === 't') && e.shiftKey) {
                e.preventDefault();
                // trigger button logic
                const startBtn = document.getElementById('startTimerBtn');
                const stopBtn = document.getElementById('stopTimerBtn');
                if (stopBtn && stopBtn.style.display !== 'none') stopTimer();
                else if (startBtn && !startBtn.disabled) startTimer();
            }
            if ((e.key === 'V' || e.key === 'v') && e.shiftKey) {
                e.preventDefault();
                const switchBtn = document.getElementById('switchPhaseBtn');
                if (switchBtn && !switchBtn.disabled) switchPhase();
            }
            if ((e.key === 'N' || e.key === 'n') && e.shiftKey) {
                e.preventDefault();
                if (window.currentBoard.columns && window.currentBoard.columns.length > 0) {
                    openNewCardModal(window.currentBoard.columns[0].id);
                }
            }
        }
    });
}

// Avatar Logic (Local implementation for userModal)
function populateAvatarSelector() {
    const selector = document.getElementById('avatarSelector');
    if (!selector) return;

    const currentAvatar = getUserAvatar() || '👤';

    selector.innerHTML = AVAILABLE_AVATARS.map(avatar => `
        <div class="avatar-option ${avatar === currentAvatar ? 'selected' : ''}" 
             data-avatar="${avatar}"
             onclick="selectAvatar('${avatar}')">
             ${avatar}
        </div>
    `).join('');
}


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
window.handleUrlHash = handleUrlHash;
window.toggleTheme = toggleTheme;
window.filterBoards = (status) => dashboardController.filterBoards(status);
window.joinBoardPersistent = (id) => dashboardController.joinBoard(id);
window.boardController = boardController; // Expose for board.js referencing
// leaveBoardPersistent is usually called from within the board view, which is Phase 4.
// But for now, if dashboard uses it? No, dashboard uses join.
// The dashboard card has 'Return' or 'Join'.
// 'Return' calls loadBoard(id).
// 'Join' calls joinBoardPersistent(id).

// Create Board is handled by listener, but let's shim it just in case logic uses it?
// window.createBoard = undefined; // We don't want global usage if possible.

// Main Execution
document.addEventListener('DOMContentLoaded', async () => {
    await loadModals();
    setupEventListeners();
    setupKeyboardShortcuts();
    initApp();
});
