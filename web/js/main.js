// App Initialization
async function initApp() {
    console.log(`%c🎯 BenTro ${APP_VERSION} `, 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log('%c👤 User Status', 'color: #2196F3; font-weight: bold;', window.currentUser ? `✓ Logged in as: ${window.currentUser}` : '✗ No user found');

    // Load board templates from JSON
    loadBoardTemplates();

    // Request notification permission for timer sounds
    if (typeof requestNotificationPermission === 'function') {
        requestNotificationPermission();
    }

    // Populate avatar selector
    populateAvatarSelector();

    initWebSocket();

    // Initialize User State
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
            window.currentUserRole = user.role; // Store role for admin check
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

    // Handle URL Hash for persistence (After user is restored)
    handleUrlHash();

    // Listen for back/forward navigation AND hash changes
    window.addEventListener('popstate', handleUrlHash);
    window.addEventListener('hashchange', handleUrlHash);

    if (!window.currentUser) {
        console.log('%c📝 Showing login modal', 'color: #FF9800; font-style: italic;');
        document.getElementById('userModal').style.display = 'block';
    } else {
        // User is logged in via JWT - skip welcome modal
        updateUserDisplay();

        if (!window.location.hash.startsWith('#board/')) {
            // Load dashboard directly ensuring UI state is correct (buttons, views)
            console.log('%c👋 User authenticated, showing dashboard', 'color: #4CAF50; font-style: italic;');
            showDashboard();
        }
    }

    // Set version in Help Modal
    const versionSpan = document.getElementById('appVersion');
    if (versionSpan) {
        versionSpan.textContent = APP_VERSION;
    }

    // Initialize Theme
    initTheme();

    // Initialize i18n
    if (window.i18n) {
        window.i18n.init();
    }
}

// Handle URL routing based on hash
function handleUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#board/')) {
        const boardId = hash.replace('#board/', '');
        if (boardId && (!window.currentBoard || window.currentBoard.id !== boardId)) {
            // If user is logged in, load the board
            if (window.currentUser) {
                // If we are already initializing (from initApp), we might need to wait or just call it.
                // loadBoard is global from board.js
                if (typeof loadBoard === 'function') {
                    loadBoard(boardId);
                    // Hide modals if they are open (like welcome back)
                    document.getElementById('returningUserModal').style.display = 'none';
                    document.getElementById('userModal').style.display = 'none';
                }
            }
        }
    } else if (!hash || hash === '#dashboard') {
        showDashboard();
    } else if (hash === '#action-items') {
        if (typeof loadActionItemsView === 'function') {
            loadActionItemsView();
        } else {
            console.error('loadActionItemsView not loaded');
        }
    } else if (hash === '#admin') {
        if (typeof loadAdminView === 'function') {
            loadAdminView();
        }
    } else if (hash === '#teams') {
        if (typeof loadTeamsView === 'function') {
            loadTeamsView();
        }
    } else if (hash.startsWith('#team/')) {
        const teamId = hash.replace('#team/', '');
        if (teamId) {
            // Explicitly hide other views since loadTeamDetails doesn't do it all?
            // Actually let's assume loadTeamsView logic:
            // We need to call a function that sets up the container.
            // But loadTeamDetails is in teams.js.
            if (typeof openTeamDetails === 'function') {
                openTeamDetails(teamId);
            } else if (typeof loadTeamDetails === 'function') {
                // Fallback if openTeamDetails is not exposed or different
                // But openTeamDetails handles view switching.
                // We need to make sure openTeamDetails is valid.
                // Let's assume teams.js is loaded.
                // We might need to hide dashboard/etc if openTeamDetails doesn't.
                // openTeamDetails (in teams.js) DOES hide dashboardView/etc?
                // Let's check: Yes, it hides teamsList but maybe not dashboard if called directly?
                // No, line 245 teams.js: hides teamsView.
                // But we need to hide dashboard too.
                // Let's create a helper or just manually hide here for safety.
                const dashboardView = document.getElementById('dashboardView');
                if (dashboardView) dashboardView.style.display = 'none';
                const boardContainer = document.getElementById('boardContainer');
                if (boardContainer) boardContainer.style.display = 'none';

                // Call teams.js function
                // Note: We need to ensure openTeamDetails is global.
                window.openTeamDetails(teamId); // Ensure it's attached to window or global scope in teams.js
            }
        }
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
    // Ensure avatar is loaded from localStorage
    window.currentUserAvatar = getUserAvatar();

    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    const editBtn = document.getElementById('editUserBtn');
    if (editBtn) editBtn.style.display = 'inline-block';

    // Check URL hash to determine where to go
    handleUrlHash();
}

function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = window.currentUser || '';

    // Repopulate avatar selector with current selection
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
}

function showDashboard() {
    // Leave current board if viewing one
    // if (window.currentBoard && window.currentUser) {
    //    leaveBoard(window.currentBoard.id, window.currentUser);
    //    stopParticipantPolling();
    // }

    document.getElementById('dashboardView').style.display = 'block';
    document.getElementById('boardContainer').style.display = 'none';
    const actionItemsView = document.getElementById('actionItemsView');
    if (actionItemsView) actionItemsView.style.display = 'none';
    const adminView = document.getElementById('adminView');
    if (adminView) adminView.style.display = 'none';

    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'none';

    // Hide Team Views
    const teamsView = document.getElementById('teamsView');
    if (teamsView) teamsView.style.display = 'none';
    const teamDetailsView = document.getElementById('teamDetailsView');
    if (teamDetailsView) teamDetailsView.style.display = 'none';

    const newBoardBtn = document.getElementById('newBoardBtn');
    if (newBoardBtn) newBoardBtn.style.display = 'inline-block'; // Show on dashboard

    const actionItemsBtn = document.getElementById('actionItemsBtn');
    if (actionItemsBtn) actionItemsBtn.style.display = 'inline-block';
    const leaveBtn = document.getElementById('leaveBoardBtn');
    if (leaveBtn) leaveBtn.style.display = 'none';
    const editBtn = document.getElementById('editUserBtn');
    if (editBtn) editBtn.style.display = 'inline-block';
    window.currentBoard = null;

    // Clear URL hash
    // Clear URL hash
    if (window.location.hash && window.location.hash !== '#dashboard') {
        history.pushState(null, null, ' ');
    }

    loadBoards();
}

// Board Templates - Loaded from JSON
var BOARD_TEMPLATES = {};
var RAW_TEMPLATES = {}; // Stores full template objects for UI

// Load templates from JSON file
async function loadBoardTemplates() {
    try {
        const response = await fetch(`/static/board-templates.json?v=${new Date().getTime()}`);
        const templates = await response.json();

        // Store raw templates for UI updates
        RAW_TEMPLATES = templates;

        // Convert to old format for backward compatibility
        BOARD_TEMPLATES = {};
        for (const [key, value] of Object.entries(templates)) {
            BOARD_TEMPLATES[key] = value.columns;
        }

        // Populate template dropdown
        populateTemplateDropdown();

        console.log('%c✅ Board templates loaded', 'color: #4CAF50; font-weight: bold;', Object.keys(BOARD_TEMPLATES).length, 'templates');
    } catch (error) {
        console.error('Failed to load board templates:', error);
        // Fallback to default templates
        BOARD_TEMPLATES = {
            'start-stop-continue': ['Start Doing', 'Stop Doing', 'Continue Doing'],
            'mad-sad-glad': ['Mad 😠', 'Sad 😢', 'Glad 😊'],
            '4ls': ['Liked 👍', 'Learned 💡', 'Lacked 🤔', 'Longed For 🌟'],
            'wwn-badly-action': ['What Went Well ✅', 'Needs Attention ⚠️', 'Action Items 🎯'],
            'sailboat': ['Wind 💨', 'Anchor ⚓', 'Rocks 🪨', 'Island 🏝️']
        };
        // Also populate RAW for fallback
        RAW_TEMPLATES = {};
        for (const [key, cols] of Object.entries(BOARD_TEMPLATES)) {
            RAW_TEMPLATES[key] = { name: key, columns: cols };
        }
        populateTemplateDropdown();
    }
}

// Populate template dropdown dynamically
function populateTemplateDropdown() {
    const select = document.getElementById('boardTemplate');
    if (!select) return;

    // Save current selection if any
    const currentSelection = select.value;

    // Clear existing options except "Custom"
    // We need to keep the "Custom" option which is hardcoded in HTML or we can re-create it
    // The HTML has it. Let's rebuild it to be safe and translated
    select.innerHTML = '';

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = i18n.t('template.custom') || 'Custom (Manual Entry)';
    select.appendChild(customOption);

    // Add templates from JSON
    for (const [key, value] of Object.entries(RAW_TEMPLATES)) {
        const option = document.createElement('option');
        option.value = key;

        const nameKey = `template.${key}.name`;
        const translatedName = i18n.t(nameKey);
        // Use translated name if exists and not same as key (fallback)
        option.textContent = (translatedName && translatedName !== nameKey) ? translatedName : value.name;

        select.appendChild(option);
    }

    if (currentSelection && (RAW_TEMPLATES[currentSelection] || currentSelection === 'custom')) {
        select.value = currentSelection;
    }
}

// Add listener for language changes
document.addEventListener('languageChanged', () => {
    populateTemplateDropdown();
    // Also update the textarea if a template is selected
    const select = document.getElementById('boardTemplate');
    if (select && select.value !== 'custom' && BOARD_TEMPLATES[select.value]) {
        select.dispatchEvent(new Event('change'));
    }
});

// Event Listeners - Initialize app when DOM is ready
// Note: DOMContentLoaded is already handled at the top of the file to call loadModals()
function setupEventListeners() {
    // User Form Handler
    document.getElementById('userForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userNameInput').value.trim();
        const avatar = document.getElementById('selectedAvatar').value;

        if (name) {
            window.currentUser = name;
            window.currentUserAvatar = avatar;
            localStorage.setItem('retroUser', name);
            localStorage.setItem('retroUserAvatar', avatar);
            // closeModals(); // Modals are managed by display property now
            document.getElementById('userModal').style.display = 'none';
            updateUserDisplay();
            handleUrlHash();
        }
    });

    document.getElementById('dashboardBtn')?.addEventListener('click', () => {
        window.location.hash = 'dashboard';
    });
    document.getElementById('actionItemsBtn')?.addEventListener('click', () => {
        window.location.hash = 'action-items';
    });

    // document.getElementById('leaveBoardBtn')?.addEventListener('click', () => {
    //     if (confirm(i18n.t('confirm.leave_board') || 'Are you sure you want to leave this board?')) {
    //         showDashboard();
    //     }
    // });

    document.getElementById('newBoardBtn')?.addEventListener('click', async () => {
        document.getElementById('newBoardModal').style.display = 'block';
        await populateBoardTeamSelect();
    });

    // ...

    document.getElementById('newBoardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('boardName').value;
        const columnsText = document.getElementById('columnNames').value.trim();
        const columns = columnsText ? columnsText.split('\n').filter(c => c.trim()) : [];

        // Check if we are in a team context OR a team was selected in the dropdown
        // currentTeamId is set in teams.js when opening team details
        const selectedTeamId = document.getElementById('boardTeamSelect')?.value;
        const teamId = window.currentTeamId || (selectedTeamId !== '' ? selectedTeamId : null);

        await createBoard(name, columns, teamId);

        closeModals();

        // If we are in team view, refresh the team details
        if (window.currentTeamId && typeof loadTeamDetails === 'function') {
            await loadTeamDetails(window.currentTeamId);
        } else {
            // If dashboard view, reload boards to show new board (with team label)
            if (typeof loadBoards === 'function') loadBoards();
        }
    });

    // Event Delegation for dynamically loaded Create Board Modal elements
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'boardTemplate') {
            const selectedValue = e.target.value;
            const columnNamesTextarea = document.getElementById('columnNames');

            if (!columnNamesTextarea) return;

            if (selectedValue === 'custom') {
                columnNamesTextarea.value = '';
                columnNamesTextarea.placeholder = 'Enter custom columns...';
            } else if (BOARD_TEMPLATES[selectedValue]) {
                // Use translated columns if available, otherwise fallback to template defaults
                // We construct the translation keys: template.mad_sad_glad.columns (array)
                // But i18n usually returns string or object.
                // For now, let's use the template object's columns and map them to their translations if possible
                // OR just use the raw values if the system uses raw values.
                // V0.10.51 logic check:
                const template = BOARD_TEMPLATES[selectedValue];
                // BOARD_TEMPLATES values are arrays of strings
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

    // BenTro v0.2.0 Event Listeners
    document.getElementById('continueAsUserBtn')?.addEventListener('click', confirmReturningUser);

    document.getElementById('changeUserBtn')?.addEventListener('click', () => {
        document.getElementById('returningUserModal').style.display = 'none';
        window.currentUser = null;
        localStorage.removeItem('retroUser');
        localStorage.removeItem('adminToken'); // Security fix: clear admin access
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

// Global Action Wrappers (called via onclick in HTML)
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

// Load Modals dynamically
async function loadModals() {
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

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await loadModals();
    setupEventListeners();
    setupKeyboardShortcuts();
    initApp();
});

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Allow Esc to blur/close even in inputs
            if (e.key === 'Escape') {
                e.target.blur();
                closeModals();
            }
            return;
        }

        // Global Shortcuts
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

        // Board-specific shortcuts (only if in a board)
        if (window.currentBoard) {
            // Export CSV (Shift + E)
            if ((e.key === 'E' || e.key === 'e') && e.shiftKey) {
                e.preventDefault();
                if (typeof exportBoardToCSV === 'function') exportBoardToCSV(window.currentBoard.id);
            }

            // Toggle Timer (Shift + T)
            if ((e.key === 'T' || e.key === 't') && e.shiftKey) {
                e.preventDefault();
                const startBtn = document.getElementById('startTimerBtn');
                const stopBtn = document.getElementById('stopTimerBtn');

                if (stopBtn && stopBtn.style.display !== 'none') {
                    if (typeof stopTimer === 'function') stopTimer();
                } else if (startBtn && !startBtn.disabled) {
                    if (typeof startTimer === 'function') startTimer();
                }
            }

            // Switch Phase (Shift + V)
            if ((e.key === 'V' || e.key === 'v') && e.shiftKey) {
                e.preventDefault();
                const switchBtn = document.getElementById('switchPhaseBtn');
                if (switchBtn && !switchBtn.disabled) {
                    if (typeof switchPhase === 'function') switchPhase();
                }
            }

            // New Card (Shift + N)
            if ((e.key === 'N' || e.key === 'n') && e.shiftKey) {
                e.preventDefault();
                // Open new card modal for the first column by default
                if (window.currentBoard.columns && window.currentBoard.columns.length > 0) {
                    const firstColumnId = window.currentBoard.columns[0].id;
                    if (typeof openNewCardModal === 'function') openNewCardModal(firstColumnId);
                }
            }
        }
    });
}

// Avatar Selection Functions
function populateAvatarSelector() {
    /*
    // Helper to populate teams in New Board modal
    async function populateBoardTeamSelect() {
        const select = document.getElementById('boardTeamSelect');
        if (!select) return;

        // Clear existing (keep first option)
        select.innerHTML = `<option value="" data-i18n="option.no_team">${i18n.t('option.no_team') || 'No Team (Personal)'}</option>`;

        try {
            const userTeams = await apiCall('/teams'); // Use cached or new call
            // Sort alphabetically
            userTeams.sort((a, b) => a.name.localeCompare(b.name));

            userTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            });

            // If inside a team view, select it and disable
            if (window.currentTeamId) {
                select.value = window.currentTeamId;
                select.disabled = true;
            } else {
                select.disabled = false;
            }

        } catch (error) {
            console.error('Failed to load teams for dropdown:', error);
        }
    } 
    */
    const selector = document.getElementById('avatarSelector');
    if (!selector) return;

    const currentAvatar = getUserAvatar();

    selector.innerHTML = AVAILABLE_AVATARS.map(avatar => `
        <div class="avatar-option ${avatar === currentAvatar ? 'selected' : ''}" 
             data-avatar="${avatar}"
             onclick="selectAvatar('${avatar}')">
             ${avatar}
        </div>
    `).join('');
}

function selectAvatar(avatar) {
    // Remove previous selection
    document.querySelectorAll('.avatar-option').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selection to clicked avatar
    const clickedElement = document.querySelector(`[data-avatar="${avatar}"]`);
    if (clickedElement) {
        clickedElement.classList.add('selected');
    }

    document.getElementById('selectedAvatar').value = avatar;
    setUserAvatar(avatar);
}

// Helper to populate teams in New Board modal
async function populateBoardTeamSelect() {
    const select = document.getElementById('boardTeamSelect');
    if (!select) return;

    // Clear existing (keep first option)
    select.innerHTML = `<option value="" data-i18n="option.no_team">${i18n.t('option.no_team') || 'No Team (Personal)'}</option>`;

    try {
        const userTeams = await apiCall('/teams'); // Use cached or new call
        // Sort alphabetically
        userTeams.sort((a, b) => a.name.localeCompare(b.name));

        userTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            select.appendChild(option);
        });

        // If inside a team view, select it and disable
        if (window.currentTeamId) {
            select.value = window.currentTeamId;
            select.disabled = true;
        } else {
            select.disabled = false;
        }

    } catch (error) {
        console.error('Failed to load teams for dropdown:', error);
    }
}

// Manage Teams Modal Logic
window.openManageTeamsModal = function () {
    document.getElementById('manageTeamsModal').style.display = 'block';
    populateManageTeamsModal();
};

window.closeManageTeamsModal = function () {
    document.getElementById('manageTeamsModal').style.display = 'none';
};

async function populateManageTeamsModal() {
    if (!window.currentBoard) return;

    const list = document.getElementById('manageTeamsList');
    const select = document.getElementById('manageTeamsSelect');

    list.innerHTML = '<div class="spinner"></div>';

    try {
        // Fetch User's Teams for Dropdown
        const userTeams = await apiCall('/teams');

        // Populate Dropdown
        select.innerHTML = `<option value="" disabled selected>${i18n.t('label.select_team') || 'Select a team...'}</option>`;
        userTeams.forEach(team => {
            // Check if team is already in board
            const isMember = window.currentBoard.teams && window.currentBoard.teams.some(t => t.id === team.id);
            if (!isMember) {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            }
        });

        // Render List
        list.innerHTML = '';
        if (window.currentBoard.teams && window.currentBoard.teams.length > 0) {
            window.currentBoard.teams.forEach(team => {
                const div = document.createElement('div');
                div.className = 'team-item';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                div.style.padding = '8px';
                div.style.borderBottom = '1px solid var(--border-color)';

                div.innerHTML = `
                    <span>${team.name}</span>
                    <button class="btn btn-outline btn-small btn-danger" onclick="removeTeamFromBoard('${team.id}')">Remove</button>
                `;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 10px;">${i18n.t('msg.no_teams') || 'No teams added yet.'}</div>`;
        }

    } catch (error) {
        console.error('Failed to populate manage teams:', error);
        list.innerHTML = `<div class="error">Failed to load teams</div>`;
    }
}

window.addTeamToBoard = async function () {
    const select = document.getElementById('manageTeamsSelect');
    const teamId = select.value;
    if (!teamId || !window.currentBoard) return;

    try {
        const currentTeamIds = window.currentBoard.teams ? window.currentBoard.teams.map(t => t.id) : [];
        if (!currentTeamIds.includes(teamId)) {
            const newTeamIds = [...currentTeamIds, teamId];

            const updatedBoard = await apiCall(`/boards/${window.currentBoard.id}/teams`, 'PUT', { team_ids: newTeamIds });
            window.currentBoard = updatedBoard;
            alert(i18n.t('msg.team_added') || 'Team added successfully');
            populateManageTeamsModal();
            if (typeof renderBoardHeader === 'function') renderBoardHeader();
        }
    } catch (error) {
        console.error('Failed to add team:', error);
        alert(error.message || 'Failed to add team');
    }
};

window.removeTeamFromBoard = async function (teamId) {
    if (!window.currentBoard || !confirm(i18n.t('confirm.remove_team') || 'Are you sure you want to remove this team?')) return;

    try {
        const currentTeamIds = window.currentBoard.teams ? window.currentBoard.teams.map(t => t.id) : [];
        const newTeamIds = currentTeamIds.filter(id => id !== teamId);

        const updatedBoard = await apiCall(`/boards/${window.currentBoard.id}/teams`, 'PUT', { team_ids: newTeamIds });
        window.currentBoard = updatedBoard;
        alert(i18n.t('msg.team_removed') || 'Team removed successfully');
        populateManageTeamsModal();
        if (typeof renderBoardHeader === 'function') renderBoardHeader();
    } catch (error) {
        console.error('Failed to remove team:', error);
        alert(error.message || 'Failed to remove team');
    }
};
