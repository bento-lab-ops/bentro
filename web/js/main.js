// App Initialization
function initApp() {
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

    // Initialize User State from LocalStorage
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
        // User is logged in
        updateUserDisplay();

        if (!window.location.hash.startsWith('#board/')) {
            // Only show welcome back if not directly loading a board
            console.log('%c👋 Showing welcome back modal', 'color: #4CAF50; font-style: italic;');
            showReturningUserModal(window.currentUser);
            // Also load boards in background so they are ready
            loadBoards();
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
    if (window.currentBoard && window.currentUser) {
        leaveBoard(window.currentBoard.id, window.currentUser);
        stopParticipantPolling();
    }

    document.getElementById('dashboardView').style.display = 'block';
    document.getElementById('boardContainer').style.display = 'none';
    const actionItemsView = document.getElementById('actionItemsView');
    if (actionItemsView) actionItemsView.style.display = 'none';
    const adminView = document.getElementById('adminView');
    if (adminView) adminView.style.display = 'none';

    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'none';

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
let BOARD_TEMPLATES = {};
let RAW_TEMPLATES = {}; // Stores full template objects for UI

// Load templates from JSON file
async function loadBoardTemplates() {
    try {
        const response = await fetch('/static/board-templates.json');
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

    document.getElementById('leaveBoardBtn')?.addEventListener('click', () => {
        if (confirm(i18n.t('confirm.leave_board') || 'Are you sure you want to leave this board?')) {
            showDashboard();
        }
    });

    document.getElementById('newBoardBtn')?.addEventListener('click', () => {
        document.getElementById('newBoardModal').style.display = 'block';
    });



    // Board Template Selector
    document.getElementById('boardTemplate')?.addEventListener('change', (e) => {
        const template = e.target.value;
        const columnNamesTextarea = document.getElementById('columnNames');

        if (template === 'custom') {
            columnNamesTextarea.value = '';
            columnNamesTextarea.placeholder = i18n.t('template.custom_placeholder') || "Enter column names, one per line";
        } else if (BOARD_TEMPLATES[template]) {
            // Translate columns
            const cols = BOARD_TEMPLATES[template].map((col, index) => {
                const colKey = `template.${template}.col${index + 1}`;
                const translatedCol = i18n.t(colKey);
                return (translatedCol && translatedCol !== colKey) ? translatedCol : col;
            });
            columnNamesTextarea.value = cols.join('\n');
        }
    });

    document.getElementById('newBoardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('boardName').value;
        const columnsText = document.getElementById('columnNames').value.trim();
        const columns = columnsText ? columnsText.split('\n').filter(c => c.trim()) : [];

        await createBoard(name, columns);
        closeModals();
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

    // Update hidden input
    document.getElementById('selectedAvatar').value = avatar;
    setUserAvatar(avatar);
}
