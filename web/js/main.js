import { CONFIG, APP_VERSION } from './config.js';
import './i18n.js';
import { i18n } from './i18n.js';
import { initWebSocket } from './api.js';
import { escapeHtml, closeModals } from './utils.js';
// Imports


import { dashboardController } from './controllers/DashboardController.js';
import { boardController } from './controllers/BoardController.js';
import { boardService } from './services/BoardService.js';
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
import './auth.js';
import { navController } from './controllers/NavController.js';
import './admin-users.js';
import './admin-boards.js';
import './admin-actions.js';





// ... unchanged functions ...





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
    const paths = [
        `/static/board-templates.json?v=${new Date().getTime()}`,
        `/board-templates.json?v=${new Date().getTime()}`,
        `/public/board-templates.json?v=${new Date().getTime()}`
    ];

    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                const templates = await response.json();
                RAW_TEMPLATES = templates;
                BOARD_TEMPLATES = {};
                for (const [key, value] of Object.entries(templates)) {
                    BOARD_TEMPLATES[key] = value.columns;
                }
                populateTemplateDropdown();
                console.log(`%c✅ Board templates loaded from ${path}`, 'color: #4CAF50; font-weight: bold;', Object.keys(BOARD_TEMPLATES).length, 'templates');
                return; // Success, exit
            }
        } catch (e) {
            console.warn(`Failed to load templates from ${path}`, e);
        }
    }

    // Fallback if all paths fail
    console.error('All template paths failed. Using hardcoded defaults.');
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
        showDashboard();
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

    // Template Selection Listener
    const templateSelect = document.getElementById('boardTemplate');
    const handleTemplateChange = (e) => {
        const selectedValue = e.target.value;
        const columnNamesTextarea = document.getElementById('columnNames');

        console.log('Template changed to:', selectedValue);

        if (!columnNamesTextarea) {
            console.error('Column Names textarea not found');
            return;
        }

        if (selectedValue === 'custom') {
            columnNamesTextarea.value = '';
            columnNamesTextarea.placeholder = 'Enter custom columns...';
        } else if (BOARD_TEMPLATES[selectedValue]) {
            const template = BOARD_TEMPLATES[selectedValue];
            console.log('Applying template:', template);
            if (Array.isArray(template)) {
                columnNamesTextarea.value = template.join('\n');
            }
        }
    };

    if (templateSelect) {
        templateSelect.addEventListener('change', handleTemplateChange);
    }
    // Backup delegation in case of DOM replacement
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'boardTemplate') {
            handleTemplateChange(e);
        }
    });

    document.getElementById('newCardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('cardColumnId').value;
        const content = document.getElementById('cardContent').value;
        // Delegated to BoardController -> handleAddCard logic? 
        // Or directly call API via Controller? Controller exposes methods?
        // BoardController doesn't export `createCard` but it handles "submit" if it managed the modal.
        // Since modal is global, let's call API and refresh Controller.
        // Actually, BoardService is available.
        // BUT, we want to trigger Controller refresh.
        // boardController.createCard?

        // Let's implement `createCard` in main.js using BoardService? 
        // Or better: boardController.addCard(columnId, content) ?

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

    // Initialize Dashboard Filters
    setupDashboardFilters();
}

// Dashboard Filtering Logic
const activeFilters = new Set();

function setupDashboardFilters() {
    const searchInput = document.getElementById('boardSearchInput');
    const filterToggles = document.querySelectorAll('.filter-toggle');
    const clearBtn = document.getElementById('clearFiltersBtn');

    if (searchInput) {
        searchInput.addEventListener('input', applyDashboardFilters);
    }

    filterToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            if (activeFilters.has(filterType)) {
                activeFilters.delete(filterType);
                btn.classList.remove('active');
            } else {
                activeFilters.add(filterType);
                btn.classList.add('active');
            }
            applyDashboardFilters();
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            activeFilters.clear();
            document.querySelectorAll('.filter-toggle').forEach(b => b.classList.remove('active'));
            if (searchInput) searchInput.value = '';
            applyDashboardFilters();
        });
    }
}

window.applyDashboardFilters = function () {
    const searchInput = document.getElementById('boardSearchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    const cards = document.querySelectorAll('#dashboardGrid .board-card');
    let visibleCount = 0;

    const myUser = (window.currentUser || '').toLowerCase();

    cards.forEach(card => {
        let isVisible = true;

        // Text Search
        const titleEl = card.querySelector('h3');
        const title = titleEl ? titleEl.innerText.toLowerCase() : '';
        if (searchText && !title.includes(searchText)) {
            isVisible = false;
        }

        // Filters
        if (isVisible && activeFilters.size > 0) {
            // Need to reverse-engineer card properties from DOM or data attributes
            // Ideally cards should have data attributes, but we can parse text
            // "Owner: name", "Team: name"

            const metaRows = card.querySelectorAll('.meta-row');
            let owner = '';
            let team = '';
            let participants = '0';

            metaRows.forEach(row => {
                const label = row.querySelector('span:first-child')?.innerText || '';
                const value = row.querySelector('span:last-child')?.innerText || '';

                if (label.includes('Owner')) owner = value.toLowerCase();
                if (label.includes('Team')) team = value.toLowerCase();
            });

            // Participants logic is hard without raw data, but let's assume if I'm not owner I might be participant
            // Actually, we passed isMember to render actions. 
            // We can check if "Join" button exists -> Not Member. If "Return" -> Member.
            const hasJoinBtn = card.querySelector('.btn-success');
            const hasReturnBtn = card.querySelector('.btn-primary[title*="Return"], .btn-primary[title*="View"]');

            const isOwner = (owner === myUser);
            // I am participant if I have Return button AND I am not owner (loosely)
            // Or simple: Is Member = !hasJoinBtn (if active)

            const isParticipating = hasReturnBtn !== null;

            if (activeFilters.has('myBoards')) {
                if (!isOwner) isVisible = false;
            }
            if (activeFilters.has('participant')) {
                if (!isParticipating) isVisible = false;
            }
            if (activeFilters.has('teamBoards')) {
                if (!team) isVisible = false;
            }
        }

        card.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleCount++;
    });

    // Update Badge
    const badge = document.getElementById('activeFiltersBadge');
    const countSpan = document.getElementById('activeFiltersCount');
    const clearBtn = document.getElementById('clearFiltersBtn');

    if (badge && countSpan) {
        if (activeFilters.size > 0) {
            badge.style.display = 'inline-flex';
            countSpan.innerText = activeFilters.size;
            if (clearBtn) clearBtn.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'none'; // Only show clear if filters active
            // Actually check if search is active too
            if (searchText && clearBtn) clearBtn.style.display = 'inline-block';
        }
    }
};
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
