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

    // Handle URL Hash for persistence
    handleUrlHash();

    // Listen for back/forward navigation
    window.addEventListener('popstate', handleUrlHash);

    if (!window.currentUser) {
        console.log('%c📝 Showing login modal', 'color: #FF9800; font-style: italic;');
        document.getElementById('userModal').style.display = 'block';
    } else if (!window.location.hash.startsWith('#board/')) {
        // Only show welcome back if not directly loading a board
        console.log('%c👋 Showing welcome back modal', 'color: #4CAF50; font-style: italic;');
        showReturningUserModal(window.currentUser);
    }

    // Set version in Help Modal
    const versionSpan = document.getElementById('appVersion');
    if (versionSpan) {
        versionSpan.textContent = APP_VERSION;
    }

    // Initialize Theme
    initTheme();
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
        if (window.currentBoard) {
            showDashboard();
        }
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
    document.getElementById('editUserBtn').style.display = 'inline-block';
    showDashboard();
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
    document.getElementById('userDisplay').textContent = `${avatar} ${window.currentUser}`;
    document.getElementById('editUserBtn').style.display = 'inline-block';
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

    document.getElementById('dashboardBtn').style.display = 'none';
    document.getElementById('actionItemsBtn').style.display = 'inline-block';
    document.getElementById('leaveBoardBtn').style.display = 'none';
    document.getElementById('editUserBtn').style.display = 'inline-block';
    window.currentBoard = null;

    // Clear URL hash
    if (window.location.hash.startsWith('#board/')) {
        history.pushState(null, null, ' ');
    }

    loadBoards();
}

// Board Templates - Loaded from JSON
let BOARD_TEMPLATES = {};

// Load templates from JSON file
async function loadBoardTemplates() {
    try {
        const response = await fetch('/static/board-templates.json');
        const templates = await response.json();

        // Convert to old format for backward compatibility
        BOARD_TEMPLATES = {};
        for (const [key, value] of Object.entries(templates)) {
            BOARD_TEMPLATES[key] = value.columns;
        }

        // Populate template dropdown
        populateTemplateDropdown(templates);

        console.log('%c✅ Board templates loaded', 'color: #4CAF50; font-weight: bold;', Object.keys(BOARD_TEMPLATES).length, 'templates');
    } catch (error) {
        console.error('Failed to load board templates:', error);
        // Fallback to default templates
        BOARD_TEMPLATES = {
            'start-stop-continue': ['Start Doing', 'Stop Doing', 'Continue Doing'],
            'mad-sad-glad': ['Mad 😠', 'Sad 😢', 'Glad 😊'],
            '4ls': ['Liked 👍', 'Learned 💡', 'Lacked 🤔', 'Longed For 🌟'],
            'wwn-action': ['What Went Well ✅', 'Needs Attention ⚠️', 'Action Items 🎯'],
            'sailboat': ['Wind 💨', 'Anchor ⚓', 'Rocks 🪨', 'Island 🏝️']
        };
    }
}

// Populate template dropdown dynamically
function populateTemplateDropdown(templates) {
    const select = document.getElementById('boardTemplate');
    if (!select) return;

    // Clear existing options except "Custom"
    select.innerHTML = '<option value="custom">Custom</option>';

    // Add templates from JSON
    for (const [key, value] of Object.entries(templates)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.name;
        select.appendChild(option);
    }
}

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
            showDashboard();
        }
    });

    document.getElementById('dashboardBtn').addEventListener('click', showDashboard);
    document.getElementById('actionItemsBtn')?.addEventListener('click', () => {
        if (typeof loadActionItemsView === 'function') {
            loadActionItemsView();
        }
    });

    document.getElementById('leaveBoardBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to leave this board? You will be removed from the participant list.')) {
            showDashboard();
        }
    });

    document.getElementById('newBoardBtn').addEventListener('click', () => {
        document.getElementById('newBoardModal').style.display = 'block';
    });



    // Board Template Selector
    document.getElementById('boardTemplate')?.addEventListener('change', (e) => {
        const template = e.target.value;
        const columnNamesTextarea = document.getElementById('columnNames');

        if (template === 'custom') {
            columnNamesTextarea.value = '';
        } else if (BOARD_TEMPLATES[template]) {
            columnNamesTextarea.value = BOARD_TEMPLATES[template].join('\n');
        }
    });

    document.getElementById('newBoardForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('boardName').value;
        const columnsText = document.getElementById('columnNames').value.trim();
        const columns = columnsText ? columnsText.split('\n').filter(c => c.trim()) : [];

        await createBoard(name, columns);
        closeModals();
    });

    document.getElementById('newCardForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('cardColumnId').value;
        const content = document.getElementById('cardContent').value;

        await createCard(columnId, content);
        closeModals();
    });

    document.getElementById('editColumnForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const columnId = document.getElementById('editColumnId').value;
        const name = document.getElementById('columnNameEdit').value;

        await updateColumn(columnId, name);
        closeModals();
    });

    document.getElementById('addColumnBtn').addEventListener('click', async () => {
        const name = prompt('Enter column name:');
        if (name) {
            const position = window.currentBoard.columns.length;
            await createColumn(name, position);
        }
    });

    document.getElementById('startTimerBtn').addEventListener('click', startTimer);
    document.getElementById('stopTimerBtn').addEventListener('click', stopTimer);
    document.getElementById('switchPhaseBtn').addEventListener('click', switchPhase);

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
    if (window.currentBoard && confirm('Finish this retrospective? It will become read-only.')) {
        updateBoardStatus(window.currentBoard.id, 'finished');
    }
};

window.reopenRetro = function () {
    if (window.currentBoard && confirm('Re-open this retrospective?')) {
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
        const response = await fetch('/static/modals.html');
        if (!response.ok) throw new Error('Failed to load modals');
        const html = await response.text();
        document.getElementById('modals-container').innerHTML = html;
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
