// App Initialization
function initApp() {
    console.log(`%c≡ƒÄ» BenTro ${APP_VERSION} `, 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log('%c≡ƒæñ User Status', 'color: #2196F3; font-weight: bold;', window.currentUser ? `Γ£ô Logged in as: ${window.currentUser}` : 'Γ£ù No user found');

    // Load board templates from JSON
    loadBoardTemplates();

    // Request notification permission for timer sounds
    if (typeof requestNotificationPermission === 'function') {
        requestNotificationPermission();
    }

    initWebSocket();

    if (!window.currentUser) {
        console.log('%c≡ƒô¥ Showing login modal', 'color: #FF9800; font-style: italic;');
        document.getElementById('userModal').style.display = 'block';
    } else {
        console.log('%c≡ƒæï Showing welcome back modal', 'color: #4CAF50; font-style: italic;');
        showReturningUserModal(window.currentUser);
    }

    // Set version in Help Modal
    const versionSpan = document.getElementById('appVersion');
    if (versionSpan) {
        versionSpan.textContent = APP_VERSION;
    }
}

function showReturningUserModal(username) {
    document.getElementById('returningUserName').textContent = username;
    document.getElementById('returningUserModal').style.display = 'block';
}

function confirmReturningUser() {
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    document.getElementById('editUserBtn').style.display = 'inline-block';
    showDashboard();
}

function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = window.currentUser || '';
    modal.style.display = 'block';
    document.getElementById('userNameInput').focus();
}

function updateUserDisplay() {
    document.getElementById('userDisplay').textContent = `≡ƒæñ ${window.currentUser}`;
    document.getElementById('editUserBtn').style.display = 'inline-block';
}

function showDashboard() {
    document.getElementById('dashboardView').style.display = 'block';
    document.getElementById('boardContainer').style.display = 'none';
    document.getElementById('dashboardBtn').style.display = 'none';
    document.getElementById('editUserBtn').style.display = 'inline-block';
    window.currentBoard = null;
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

        console.log('%cΓ£à Board templates loaded', 'color: #4CAF50; font-weight: bold;', Object.keys(BOARD_TEMPLATES).length, 'templates');
    } catch (error) {
        console.error('Failed to load board templates:', error);
        // Fallback to default templates
        BOARD_TEMPLATES = {
            'start-stop-continue': ['Start Doing', 'Stop Doing', 'Continue Doing'],
            'mad-sad-glad': ['Mad ≡ƒÿá', 'Sad ≡ƒÿó', 'Glad ≡ƒÿè'],
            '4ls': ['Liked ≡ƒæì', 'Learned ≡ƒÆí', 'Lacked ≡ƒñö', 'Longed For ≡ƒîƒ'],
            'wwn-action': ['What Went Well Γ£à', 'Needs Attention ΓÜá∩╕Å', 'Action Items ≡ƒÄ»'],
            'sailboat': ['Wind ≡ƒÆ¿', 'Anchor ΓÜô', 'Rocks ≡ƒ¬¿', 'Island ≡ƒÅ¥∩╕Å']
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
        if (name) {
            window.currentUser = name;
            localStorage.setItem('retroUser', name);
            // closeModals(); // Modals are managed by display property now
            document.getElementById('userModal').style.display = 'none';
            updateUserDisplay();
            showDashboard();
        }
    });

    document.getElementById('dashboardBtn').addEventListener('click', showDashboard);

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

    document.getElementById('finishRetroBtn').addEventListener('click', () => {
        if (window.currentBoard && confirm('Finish this retrospective? It will become read-only.')) {
            updateBoardStatus(window.currentBoard.id, 'finished');
        }
    });

    document.getElementById('reopenRetroBtn').addEventListener('click', () => {
        if (window.currentBoard && confirm('Re-open this retrospective?')) {
            updateBoardStatus(window.currentBoard.id, 'active');
        }
    });

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

    document.getElementById('exportBoardBtn')?.addEventListener('click', () => {
        if (window.currentBoard) exportBoardToCSV(window.currentBoard.id);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

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
    initApp();
});

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
