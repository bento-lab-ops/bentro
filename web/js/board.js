<<<<<<< HEAD:web/app.js
// API Base URL
const API_BASE = '/api';
const WS_URL = `ws://${window.location.host}/ws`;

// Global state
let currentBoard = null;
let currentPhase = 'input'; // 'input' or 'voting'
let timerInterval = null;
let timerSeconds = 0;
let ws = null;
let currentUser = localStorage.getItem('retroUser');
let selectedCardId = null; // For Select-to-Merge

// Initialize WebSocket
function initWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(initWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'timer_update':
            updateTimerDisplay(message.data.seconds);
            break;
        case 'timer_start':
            startTimerUI(message.data.seconds);
            break;
        case 'timer_stop':
            stopTimerUI();
            break;
        case 'phase_change':
            updatePhase(message.data.phase);
            break;
        case 'board_update':
            if (document.getElementById('dashboardView').style.display !== 'none') {
                loadBoards();
            }
            if (currentBoard && currentBoard.id === message.data.board_id) {
                loadBoard(currentBoard.id);
            }
            break;
    }
}

function sendWebSocketMessage(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

// API Functions
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
}

// Team State
let currentTeam = JSON.parse(localStorage.getItem('retroTeam'));

// Team Service
const TeamService = {
    async create(name) {
        return await apiCall('/teams', 'POST', { name });
    },
    async list() {
        return await apiCall('/teams');
    },
    async join(teamId, userId) {
        return await apiCall(`/teams/${teamId}/join`, 'POST', { user_id: userId });
    }
};

// App Initialization
function initApp() {
    console.log('🚀 initApp called');
    console.log('📝 currentUser:', currentUser);

    initWebSocket();

    if (!currentUser) {
        console.log('❌ No user found, showing user modal');
        document.getElementById('userModal').style.display = 'block';
        document.getElementById('dashboardBtn').style.display = 'none';
    } else {
        console.log('✅ User found, showing returning user modal for:', currentUser);
        // User exists in localStorage, show returning user modal
        showReturningUserModal(currentUser);
        document.getElementById('dashboardBtn').style.display = 'inline-block';
    }

    updateTeamDisplay();
}

function showReturningUserModal(username) {
    console.log('👋 showReturningUserModal called for:', username);
    const nameElement = document.getElementById('returningUserName');
    const modalElement = document.getElementById('returningUserModal');

    console.log('📍 returningUserName element:', nameElement);
    console.log('📍 returningUserModal element:', modalElement);
    document.getElementById('userModal').style.display = 'none';

    if (nameElement) nameElement.textContent = username;
    if (modalElement) modalElement.style.display = 'block';

    console.log('✅ Modal should be visible now');
}

function confirmReturningUser() {
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    document.getElementById('editUserBtn').style.display = 'inline-block';

    // Check if team is selected
    if (!currentTeam) {
        showTeamSelectionModal();
    } else {
        showDashboard();
    }
}

function showTeamSelectionModal() {
    const modal = document.getElementById('teamSelectionModal');
    const select = document.getElementById('teamSelectDropdown');

    // Load teams
    TeamService.list().then(teams => {
        select.innerHTML = '<option value="">Select a team...</option>';
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            select.appendChild(option);
        });
    });

    modal.style.display = 'block';
}

function updateTeamDisplay() {
    const teamName = currentTeam ? currentTeam.name : 'Global';
    const teamLabel = document.getElementById('currentTeamName');
    const dashboardLabel = document.getElementById('dashboardTeamLabel');
    const switcher = document.getElementById('teamSwitcher');

    if (teamLabel) teamLabel.textContent = teamName;
    if (dashboardLabel) dashboardLabel.textContent = `(${teamName})`;

    // Only show switcher if user is logged in
    if (currentUser && switcher) {
        switcher.style.display = 'flex';
    }
}

function handleTeamSelection(team) {
    currentTeam = team;
    if (team) {
        localStorage.setItem('retroTeam', JSON.stringify(team));
    } else {
        localStorage.removeItem('retroTeam');
    }

    document.getElementById('teamSelectionModal').style.display = 'none';
    updateTeamDisplay();
    showDashboard();
}

function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = currentUser;
    modal.style.display = 'block';
}

function updateUserDisplay() {
    document.getElementById('userDisplay').textContent = `👤 ${currentUser}`;
    document.getElementById('editUserBtn').style.display = 'inline-block';
    updateTeamDisplay();
}

function showDashboard() {
    document.getElementById('dashboardView').style.display = 'block';
    document.getElementById('boardContainer').style.display = 'none';
    document.getElementById('dashboardBtn').style.display = 'none';
    currentBoard = null;
    loadBoards();
}

// Board Management
async function loadBoards() {
    try {
        // Add team_id query param if team is selected
        let endpoint = '/boards';
        if (currentTeam) {
            endpoint += `?team_id=${currentTeam.id}`;
        } else {
            endpoint += `?team_id=null`; // Explicitly ask for global boards
        }

        const boards = await apiCall(endpoint);
        renderDashboard(boards);
    } catch (error) {
        console.error('Failed to load boards:', error);
    }
}

function renderDashboard(boards) {
    const grid = document.getElementById('dashboardGrid');
    grid.innerHTML = '';

    if (boards.length === 0) {
        document.getElementById('emptyDashboard').style.display = 'flex';
        // Update empty state message based on context
        const emptyMsg = document.querySelector('#emptyDashboard p');
        if (emptyMsg) {
            emptyMsg.textContent = currentTeam
                ? `No boards found for team "${currentTeam.name}". Create one!`
                : 'No global boards found. Create one!';
        }
        return;
    }

    document.getElementById('emptyDashboard').style.display = 'none';

    boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        const statusClass = board.status === 'active' ? 'status-active' : 'status-finished';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h3 style="margin:0;">${escapeHtml(board.name)}</h3>
                <span class="board-status ${statusClass}">${board.status}</span>
            </div>
            <div class="board-meta">
                Created: ${new Date(board.created_at).toLocaleDateString()}
            </div>
            <div class="dashboard-actions">
                <button class="btn btn-primary btn-small" onclick="loadBoard('${board.id}')">Enter</button>
                ${board.status === 'finished' ?
                `<button class="btn btn-warning btn-small" onclick="updateBoardStatus('${board.id}', 'active')">Re-open</button>` : ''}
                <button class="btn btn-danger btn-small" onclick="deleteBoard('${board.id}')">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function createBoard(name, columns) {
    try {
        const payload = { name, columns };
        if (currentTeam) {
            payload.team_id = currentTeam.id;
        }

        const board = await apiCall('/boards', 'POST', payload);
        await loadBoard(board.id);
        return board;
    } catch (error) {
        console.error('Failed to create board:', error);
        alert('Failed to create board: ' + error.message);
    }
}

// ... (rest of the file)

// Event Listeners - Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    initApp();

    // Team Event Listeners
    document.getElementById('continueGlobalBtn')?.addEventListener('click', () => {
        handleTeamSelection(null);
    });

    document.getElementById('teamSelectDropdown')?.addEventListener('change', (e) => {
        document.getElementById('joinTeamBtn').disabled = !e.target.value;
    });

    document.getElementById('joinTeamBtn')?.addEventListener('click', async () => {
        const select = document.getElementById('teamSelectDropdown');
        const teamId = select.value;
        const teamName = select.options[select.selectedIndex].text;

        if (teamId) {
            try {
                await TeamService.join(teamId, currentUser);
                handleTeamSelection({ id: teamId, name: teamName });
            } catch (error) {
                alert('Failed to join team: ' + error.message);
            }
        }
    });

    document.getElementById('createTeamBtn')?.addEventListener('click', async () => {
        const nameInput = document.getElementById('newTeamNameInput');
        const name = nameInput.value.trim();

        if (name) {
            try {
                const team = await TeamService.create(name);
                await TeamService.join(team.id, currentUser);
                handleTeamSelection(team);
            } catch (error) {
                alert('Failed to create team: ' + error.message);
            }
        }
    });

    document.getElementById('switchTeamBtn')?.addEventListener('click', () => {
        showTeamSelectionModal();
    });

    // User Form Handler
    document.getElementById('userForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userNameInput').value.trim();
        if (name) {
            currentUser = name;
            localStorage.setItem('retroUser', name);
            closeModals();
            updateUserDisplay();

            // Show team selection instead of dashboard directly
            showTeamSelectionModal();
        }
    });

    async function loadBoard(boardId) {
        try {
            const board = await apiCall(`/boards/${boardId}`);
            currentBoard = board;

            document.getElementById('dashboardView').style.display = 'none';
            document.getElementById('boardContainer').style.display = 'block';
            document.getElementById('dashboardBtn').style.display = 'inline-block';

            renderBoard(board);
            updateBoardStatusUI(board.status);
        } catch (error) {
            console.error('Failed to load board:', error);
            alert('Failed to load board: ' + error.message);
            showDashboard();
        }
    }

    async function updateBoardStatus(boardId, status) {
        try {
            await apiCall(`/boards/${boardId}/status`, 'PUT', { status });
            if (currentBoard && currentBoard.id === boardId) {
                loadBoard(boardId);
            } else {
                loadBoards();
            }
            sendWebSocketMessage('board_update', { board_id: boardId });
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status: ' + error.message);
        }
    }

    async function deleteBoard(boardId) {
        if (!confirm('Are you sure you want to delete this board? This cannot be undone.')) return;
        try {
            await apiCall(`/boards/${boardId}`, 'DELETE');
            loadBoards();
        } catch (error) {
            console.error('Failed to delete board:', error);
            alert('Failed to delete board: ' + error.message);
        }
    }

    function updateBoardStatusUI(status) {
        const isFinished = status === 'finished';
        const container = document.getElementById('boardContainer');

        document.getElementById('readOnlyBanner').style.display = isFinished ? 'block' : 'none';
        document.getElementById('finishRetroBtn').style.display = isFinished ? 'none' : 'inline-block';
        document.getElementById('reopenRetroBtn').style.display = isFinished ? 'inline-block' : 'none';

        if (isFinished) {
            container.classList.add('read-only');
        } else {
            container.classList.remove('read-only');
        }
    }

    function renderBoard(board) {
        const container = document.getElementById('columnsContainer');
        container.innerHTML = '';

        const sortedColumns = board.columns.sort((a, b) => a.position - b.position);

        sortedColumns.forEach(column => {
            if (column.cards) {
                column.cards = column.cards.filter(c => !c.merged_with_id);
            }
            const columnEl = createColumnElement(column);
            container.appendChild(columnEl);
        });

        if (board.status === 'active') {
            initializeDragAndDrop();
        }
    }

    function createColumnElement(column) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.dataset.columnId = column.id;

        columnDiv.innerHTML = `
        <div class="column-header">
            <h3 class="column-title">${escapeHtml(column.name)}</h3>
            <div class="column-actions">
                <button class="icon-btn sort-column-btn" data-column-id="${column.id}" title="Sort by Votes">🔃</button>
                <button class="icon-btn edit-column-btn" data-column-id="${column.id}" title="Edit column">✏️</button>
                <button class="icon-btn delete-column-btn" data-column-id="${column.id}" title="Delete column">🗑️</button>
            </div>
        </div>
        <div class="cards-list" data-column-id="${column.id}">
            ${column.cards ? column.cards.map(card => createCardHTML(card)).join('') : ''}
        </div>
        <button class="add-card-btn" data-column-id="${column.id}">+ Add Card</button>
    `;

        columnDiv.querySelector('.add-card-btn').addEventListener('click', () => openNewCardModal(column.id));
        columnDiv.querySelector('.sort-column-btn').addEventListener('click', () => sortColumnByVotes(column.id));
        columnDiv.querySelector('.edit-column-btn').addEventListener('click', () => openEditColumnModal(column.id, column.name));
        columnDiv.querySelector('.delete-column-btn').addEventListener('click', () => deleteColumn(column.id));

        return columnDiv;
    }

    function createCardHTML(card) {
        const votes = card.votes || [];
        const likes = votes.filter(v => v.vote_type === 'like').length;
        const dislikes = votes.filter(v => v.vote_type === 'dislike').length;
        const isSelected = selectedCardId === card.id ? 'selected' : '';
        const userVoted = votes.some(v => v.user_name === currentUser);

        let mergedContentHTML = '';
        if (card.merged_cards && card.merged_cards.length > 0) {
            mergedContentHTML = `
            <div class="merged-cards-container">
                ${card.merged_cards.map(mc => `
                    <div class="merged-card-preview">
                        <span class="merged-card-text">${escapeHtml(mc.content)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        }

        let mergeActionHTML = '';
        if (selectedCardId) {
            if (selectedCardId === card.id) {
                mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="cancelSelection()">Cancel</button>`;
            } else {
                mergeActionHTML = `<button class="btn btn-primary btn-small" onclick="mergeCard('${card.id}')">Merge Here</button>`;
            }
        } else {
            mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="selectCard('${card.id}')">Select</button>`;
        }

        return `
        <div class="card ${isSelected}" data-card-id="${card.id}">
            <div class="card-content">${escapeHtml(card.content)}</div>
            ${mergedContentHTML}
            ${card.merged_cards && card.merged_cards.length > 0 ? `
                <div class="merged-indicator">
                    🔗 ${card.merged_cards.length} merged card(s)
                    <button class="btn-link" onclick="openUnmergeModal('${card.id}')">Unmerge</button>
                </div>
            ` : ''}
            <div class="card-footer">
                <div class="card-votes">
                    <span class="vote-count likes">👍 ${likes}</span>
                    <span class="vote-count dislikes">👎 ${dislikes}</span>
                </div>
                <div class="card-actions">
                    ${mergeActionHTML}
                    ${currentPhase === 'voting' && !userVoted ? `
                        <button class="vote-btn" onclick="voteCard('${card.id}', 'like')">👍</button>
                        <button class="vote-btn" onclick="voteCard('${card.id}', 'dislike')">👎</button>
                    ` : ''}
                    <button class="delete-card-btn" onclick="deleteCard('${card.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `;
    }

    // Select-to-Merge Logic
    function selectCard(cardId) {
        selectedCardId = cardId;
        renderBoard(currentBoard);
    }

    function cancelSelection() {
        selectedCardId = null;
        renderBoard(currentBoard);
    }

    async function mergeCard(targetCardId) {
        if (!selectedCardId) return;

        const sourceCardId = selectedCardId;
        if (sourceCardId === targetCardId) return;

        try {
            await apiCall(`/cards/${sourceCardId}/merge`, 'POST', {
                target_card_id: targetCardId
            });
            selectedCardId = null;
            sendWebSocketMessage('board_update', { board_id: currentBoard.id });
            await loadBoard(currentBoard.id);
        } catch (error) {
            console.error('Failed to merge card:', error);
            alert('Failed to merge: ' + error.message);
        }
    }

    // Unmerge Logic
    function openUnmergeModal(cardId) {
        const card = findCardById(cardId);
        if (!card || !card.merged_cards) {
            return;
        }

        const list = document.getElementById('mergedCardsList');
        list.innerHTML = '';

        card.merged_cards.forEach(mergedCard => {
            const item = document.createElement('div');
            item.className = 'merged-card-item';
            item.innerHTML = `
            <span>${escapeHtml(mergedCard.content)}</span>
            <button class="btn btn-danger btn-small" onclick="unmergeCard('${mergedCard.id}')">Unmerge</button>
        `;
            list.appendChild(item);
        });

        document.getElementById('unmergeModal').style.display = 'block';
    }

    async function unmergeCard(cardId) {
        try {
            await apiCall(`/cards/${cardId}/unmerge`, 'POST');
            document.getElementById('unmergeModal').style.display = 'none';
            await loadBoard(currentBoard.id);
            sendWebSocketMessage('board_update', { board_id: currentBoard.id });
        } catch (error) {
            console.error('Failed to unmerge card:', error);
            alert('Failed to unmerge: ' + error.message);
        }
    }

    function findCardById(cardId) {
        for (const column of currentBoard.columns) {
            if (column.cards) {
                const card = column.cards.find(c => c.id === cardId);
                if (card) return card;
            }
        }
        return null;
    }

    // Drag and Drop (Sorting Only)
    function initializeDragAndDrop() {
        const cardLists = document.querySelectorAll('.cards-list');

        cardLists.forEach(list => {
            new Sortable(list, {
                group: 'cards',
                animation: 150,
                ghostClass: 'dragging',
                onEnd: async (evt) => {
                    const itemEl = evt.item;
                    const cardId = itemEl.dataset.cardId;
                    const newColumnId = evt.to.dataset.columnId;
                    const newPosition = evt.newIndex;

                    try {
                        await apiCall(`/cards/${cardId}/move`, 'PUT', {
                            column_id: newColumnId,
                            position: newPosition
                        });
                        sendWebSocketMessage('board_update', { board_id: currentBoard.id });
                    } catch (error) {
                        console.error('Failed to move card:', error);
                        loadBoard(currentBoard.id);
                    }
                }
            });
        });
    }

    async function sortColumnByVotes(columnId) {
        const column = currentBoard.columns.find(c => c.id === columnId);
        if (!column || !column.cards) return;

        const sortedCards = [...column.cards].sort((a, b) => {
            const scoreA = (a.votes?.filter(v => v.vote_type === 'like').length || 0) - (a.votes?.filter(v => v.vote_type === 'dislike').length || 0);
            const scoreB = (b.votes?.filter(v => v.vote_type === 'like').length || 0) - (b.votes?.filter(v => v.vote_type === 'dislike').length || 0);
            return scoreB - scoreA;
        });

        try {
            for (let i = 0; i < sortedCards.length; i++) {
                const card = sortedCards[i];
                if (card.position !== i) {
                    await apiCall(`/cards/${card.id}/move`, 'PUT', {
                        column_id: columnId,
                        position: i
                    });
                }
            }
            sendWebSocketMessage('board_update', { board_id: currentBoard.id });
            loadBoard(currentBoard.id);
        } catch (error) {
            console.error('Failed to sort column:', error);
            alert('Failed to sort column: ' + error.message);
        }
    }

    // Card Management
    async function createCard(columnId, content) {
        try {
            await apiCall(`/columns/${columnId}/cards`, 'POST', { content, position: 0 });
            await loadBoard(currentBoard.id);
            sendWebSocketMessage('board_update', { board_id: currentBoard.id });
        } catch (error) {
            console.error('Failed to create card:', error);
            alert('Failed to create card: ' + error.message);
        }
    }

    async function deleteCard(cardId) {
        if (!confirm('Are you sure you want to delete this card?')) return;

        try {
            await apiCall(`/cards/${cardId}`, 'DELETE');
            await loadBoard(currentBoard.id);
            sendWebSocketMessage('board_update', { board_id: currentBoard.id });
        } catch (error) {
            console.error('Failed to delete card:', error);
            alert('Failed to delete card: ' + error.message);
        }
    }

    async function voteCard(cardId, voteType) {
        try {
            await apiCall(`/cards/${cardId}/votes`, 'POST', {
                user_name: currentUser,
                vote_type: voteType
            });
            await loadBoard(currentBoard.id);
            sendWebSocketMessage('board_update', { board_id: currentBoard.id });
        } catch (error) {
            console.error('Failed to vote:', error);
            alert(error.message);
        }
    }

    // Column Management
    async function createColumn(name, position) {
        try {
            await apiCall(`/boards/${currentBoard.id}/columns`, 'POST', { name, position });
            await loadBoard(currentBoard.id);
        } catch (error) {
            console.error('Failed to create column:', error);
            alert('Failed to create column: ' + error.message);
        }
    }

    async function updateColumn(columnId, name) {
        try {
            await apiCall(`/columns/${columnId}`, 'PUT', { name });
            await loadBoard(currentBoard.id);
        } catch (error) {
            console.error('Failed to update column:', error);
            alert('Failed to update column: ' + error.message);
        }
    }

    async function deleteColumn(columnId) {
        if (!confirm('Are you sure you want to delete this column? All cards will be deleted.')) return;

        try {
            await apiCall(`/columns/${columnId}`, 'DELETE');
            await loadBoard(currentBoard.id);
        } catch (error) {
            console.error('Failed to delete column:', error);
            alert('Failed to delete column: ' + error.message);
        }
    }

    // Timer Management
    function startTimer() {
        const minutes = parseInt(document.getElementById('timerMinutes').value) || 5;
        timerSeconds = minutes * 60;

        sendWebSocketMessage('timer_start', { seconds: timerSeconds });
        startTimerUI(timerSeconds);
    }

    function startTimerUI(seconds) {
        timerSeconds = seconds;
        document.getElementById('startTimerBtn').style.display = 'none';
        document.getElementById('stopTimerBtn').style.display = 'inline-block';

        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay(timerSeconds);
            sendWebSocketMessage('timer_update', { seconds: timerSeconds });

            if (timerSeconds <= 0) {
                stopTimer();
            }
        }, 1000);
    }

    function stopTimer() {
        sendWebSocketMessage('timer_stop', {});
        stopTimerUI();
    }

    function stopTimerUI() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        document.getElementById('startTimerBtn').style.display = 'inline-block';
        document.getElementById('stopTimerBtn').style.display = 'none';
        timerSeconds = 0;
        updateTimerDisplay(0);
    }

    function updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('timerDisplay').textContent =
            `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function switchPhase() {
        currentPhase = currentPhase === 'input' ? 'voting' : 'input';
        updatePhase(currentPhase);
        sendWebSocketMessage('phase_change', { phase: currentPhase });
    }

    function updatePhase(phase) {
        currentPhase = phase;
        const phaseLabel = phase === 'input' ? 'Input Phase' : 'Voting Phase';
        document.getElementById('currentPhase').textContent = phaseLabel;
        document.getElementById('switchPhaseBtn').textContent =
            phase === 'input' ? 'Switch to Voting' : 'Switch to Input';

        if (currentBoard) {
            loadBoard(currentBoard.id);
        }
    }

    // Modal Management
    function openNewCardModal(columnId) {
        document.getElementById('cardColumnId').value = columnId;
        document.getElementById('newCardModal').style.display = 'block';
        document.getElementById('cardContent').value = '';
        document.getElementById('cardContent').focus();
    }

    function openEditColumnModal(columnId, currentName) {
        document.getElementById('editColumnId').value = columnId;
        document.getElementById('columnNameEdit').value = currentName;
        document.getElementById('editColumnModal').style.display = 'block';
        document.getElementById('columnNameEdit').focus();
    }

    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.id === 'userModal' && !currentUser) return;
            modal.style.display = 'none';
        });
    }

    // Utility Functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // CSV Export Function
    async function exportBoardToCSV(boardId) {
        try {
            const board = await apiCall(`/boards/${boardId}`);

            const rows = [
                ['Column', 'Card Content', 'Likes', 'Dislikes', 'Merged Cards']
            ];

            if (board.columns && Array.isArray(board.columns)) {
                board.columns.forEach(column => {
                    const cards = (column.cards || []).filter(c => !c.merged_with_id);

                    cards.forEach(card => {
                        const likes = card.votes?.filter(v => v.vote_type === 'like').length || 0;
                        const dislikes = card.votes?.filter(v => v.vote_type === 'dislike').length || 0;
                        const mergedCount = card.merged_cards?.length || 0;

                        rows.push([
                            column.name,
                            card.content,
                            likes,
                            dislikes,
                            mergedCount
                        ]);
                    });
                });

                const csvContent = rows.map(row =>
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                ).join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${board.name}_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export: ' + error.message);
        }
    }

    // Make functions global for onclick handlers
    window.loadBoard = loadBoard;
    window.deleteBoard = deleteBoard;
    window.updateBoardStatus = updateBoardStatus;
    window.voteCard = voteCard;
    window.deleteCard = deleteCard;
    window.exportBoardToCSV = exportBoardToCSV;
    window.openUnmergeModal = openUnmergeModal;
    window.unmergeCard = unmergeCard;
    window.selectCard = selectCard;

    // Event Listeners - Initialize app when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize the app
        initApp();

        // User Form Handler
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('userNameInput').value.trim();
            if (name) {
                currentUser = name;
                localStorage.setItem('retroUser', name);
                closeModals();
                updateUserDisplay();
                showDashboard();
            }
        });

        document.getElementById('dashboardBtn').addEventListener('click', showDashboard);

        document.getElementById('newBoardBtn').addEventListener('click', () => {
            document.getElementById('newBoardModal').style.display = 'block';
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
                timerSeconds--;
                updateTimerDisplay(timerSeconds);
                sendWebSocketMessage('timer_update', { seconds: timerSeconds });

                if (timerSeconds <= 0) {
                    stopTimer();
                }
            }, 1000);
    }

    function stopTimer() {
            sendWebSocketMessage('timer_stop', {});
            stopTimerUI();
        }

    function stopTimerUI() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }

            document.getElementById('startTimerBtn').style.display = 'inline-block';
            document.getElementById('stopTimerBtn').style.display = 'none';
            timerSeconds = 0;
            updateTimerDisplay(0);
        }

    function updateTimerDisplay(seconds) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            document.getElementById('timerDisplay').textContent =
                `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

    function switchPhase() {
            currentPhase = currentPhase === 'input' ? 'voting' : 'input';
            updatePhase(currentPhase);
            sendWebSocketMessage('phase_change', { phase: currentPhase });
        }

    function updatePhase(phase) {
            currentPhase = phase;
            const phaseLabel = phase === 'input' ? 'Input Phase' : 'Voting Phase';
            document.getElementById('currentPhase').textContent = phaseLabel;
            document.getElementById('switchPhaseBtn').textContent =
                phase === 'input' ? 'Switch to Voting' : 'Switch to Input';

            if (currentBoard) {
                loadBoard(currentBoard.id);
            }
        }

    // Modal Management
    function openNewCardModal(columnId) {
            document.getElementById('cardColumnId').value = columnId;
            document.getElementById('newCardModal').style.display = 'block';
            document.getElementById('cardContent').value = '';
            document.getElementById('cardContent').focus();
        }

    function openEditColumnModal(columnId, currentName) {
            document.getElementById('editColumnId').value = columnId;
            document.getElementById('columnNameEdit').value = currentName;
            document.getElementById('editColumnModal').style.display = 'block';
            document.getElementById('columnNameEdit').focus();
        }

    function closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.id === 'userModal' && !currentUser) return;
                modal.style.display = 'none';
            });
        }

    // Utility Functions
    function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

    // CSV Export Function
    async function exportBoardToCSV(boardId) {
            try {
                const board = await apiCall(`/boards/${boardId}`);

                const rows = [
                    ['Column', 'Card Content', 'Likes', 'Dislikes', 'Merged Cards']
                ];

                if (board.columns && Array.isArray(board.columns)) {
                    board.columns.forEach(column => {
                        const cards = (column.cards || []).filter(c => !c.merged_with_id);

                        cards.forEach(card => {
                            const likes = card.votes?.filter(v => v.vote_type === 'like').length || 0;
                            const dislikes = card.votes?.filter(v => v.vote_type === 'dislike').length || 0;
                            const mergedCount = card.merged_cards?.length || 0;

                            rows.push([
                                column.name,
                                card.content,
                                likes,
                                dislikes,
                                mergedCount
                            ]);
                        });
                    });

                    const csvContent = rows.map(row =>
                        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                    ).join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${board.name}_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } catch (error) {
                console.error('Failed to export CSV:', error);
                alert('Failed to export: ' + error.message);
            }
        }

    // Make functions global for onclick handlers
    window.loadBoard = loadBoard;
    window.deleteBoard = deleteBoard;
    window.updateBoardStatus = updateBoardStatus;
    window.voteCard = voteCard;
    window.deleteCard = deleteCard;
    window.exportBoardToCSV = exportBoardToCSV;
    window.openUnmergeModal = openUnmergeModal;
    window.unmergeCard = unmergeCard;
    window.selectCard = selectCard;

    // Event Listeners - Initialize app when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize the app
        initApp();

        // User Form Handler
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('userNameInput').value.trim();
            if (name) {
                currentUser = name;
                localStorage.setItem('retroUser', name);
                closeModals();
                updateUserDisplay();
                showDashboard();
            }
        });

        document.getElementById('dashboardBtn').addEventListener('click', showDashboard);

        document.getElementById('newBoardBtn').addEventListener('click', () => {
            document.getElementById('newBoardModal').style.display = 'block';
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
                const position = currentBoard.columns.length;
                await createColumn(name, position);
            }
        });

        stopTimer();
    }
            }, 1000);
    }

function stopTimer() {
    sendWebSocketMessage('timer_stop', {});
    stopTimerUI();
}

function stopTimerUI() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    document.getElementById('startTimerBtn').style.display = 'inline-block';
    document.getElementById('stopTimerBtn').style.display = 'none';
    timerSeconds = 0;
    updateTimerDisplay(0);
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timerDisplay').textContent =
        `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function switchPhase() {
    currentPhase = currentPhase === 'input' ? 'voting' : 'input';
    updatePhase(currentPhase);
    sendWebSocketMessage('phase_change', { phase: currentPhase });
}

function updatePhase(phase) {
    currentPhase = phase;
    const phaseLabel = phase === 'input' ? 'Input Phase' : 'Voting Phase';
    document.getElementById('currentPhase').textContent = phaseLabel;
    document.getElementById('switchPhaseBtn').textContent =
        phase === 'input' ? 'Switch to Voting' : 'Switch to Input';

    if (currentBoard) {
        loadBoard(currentBoard.id);
    }
}

// Modal Management
function openNewCardModal(columnId) {
    document.getElementById('cardColumnId').value = columnId;
    document.getElementById('newCardModal').style.display = 'block';
    document.getElementById('cardContent').value = '';
    document.getElementById('cardContent').focus();
}

function openEditColumnModal(columnId, currentName) {
    document.getElementById('editColumnId').value = columnId;
    document.getElementById('columnNameEdit').value = currentName;
    document.getElementById('editColumnModal').style.display = 'block';
    document.getElementById('columnNameEdit').focus();
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id === 'userModal' && !currentUser) return;
        modal.style.display = 'none';
    });
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CSV Export Function
async function exportBoardToCSV(boardId) {
    try {
        const board = await apiCall(`/boards/${boardId}`);

        const rows = [
            ['Column', 'Card Content', 'Likes', 'Dislikes', 'Merged Cards']
        ];

        if (board.columns && Array.isArray(board.columns)) {
            board.columns.forEach(column => {
                const cards = (column.cards || []).filter(c => !c.merged_with_id);

                cards.forEach(card => {
                    const likes = card.votes?.filter(v => v.vote_type === 'like').length || 0;
                    const dislikes = card.votes?.filter(v => v.vote_type === 'dislike').length || 0;
                    const mergedCount = card.merged_cards?.length || 0;

                    rows.push([
                        column.name,
                        card.content,
                        likes,
                        dislikes,
                        mergedCount
                    ]);
                });
            });

            const csvContent = rows.map(row =>
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${board.name}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export: ' + error.message);
    }
}

// Make functions global for onclick handlers
window.loadBoard = loadBoard;
window.deleteBoard = deleteBoard;
window.updateBoardStatus = updateBoardStatus;
window.voteCard = voteCard;
window.deleteCard = deleteCard;
window.exportBoardToCSV = exportBoardToCSV;
window.openUnmergeModal = openUnmergeModal;
window.unmergeCard = unmergeCard;
window.selectCard = selectCard;

// Event Listeners - Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    initApp();

    // User Form Handler
    document.getElementById('userForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userNameInput').value.trim();
        if (name) {
            currentUser = name;
            localStorage.setItem('retroUser', name);
            closeModals();
            updateUserDisplay();
            showDashboard();
        }
    });

    document.getElementById('dashboardBtn').addEventListener('click', showDashboard);

    document.getElementById('newBoardBtn').addEventListener('click', () => {
        document.getElementById('newBoardModal').style.display = 'block';
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
            const position = currentBoard.columns.length;
            await createColumn(name, position);
        }
    });

    document.getElementById('startTimerBtn').addEventListener('click', startTimer);
    document.getElementById('stopTimerBtn').addEventListener('click', stopTimer);
    document.getElementById('switchPhaseBtn').addEventListener('click', switchPhase);

    document.getElementById('finishRetroBtn').addEventListener('click', () => {
        if (currentBoard && confirm('Finish this retrospective? It will become read-only.')) {
            updateBoardStatus(currentBoard.id, 'finished');
        }
    });

    document.getElementById('reopenRetroBtn').addEventListener('click', () => {
        if (currentBoard && confirm('Re-open this retrospective?')) {
            updateBoardStatus(currentBoard.id, 'active');
        }
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });

    // BenTro v0.2.0 Event Listeners
    document.getElementById('continueAsUserBtn')?.addEventListener('click', confirmReturningUser);
    document.getElementById('changeUserBtn')?.addEventListener('click', () => {
        document.getElementById('returningUserModal').style.display = 'none';
        currentUser = null;
        localStorage.removeItem('retroUser');
        document.getElementById('userModal').style.display = 'block';
    });
    document.getElementById('editUserBtn')?.addEventListener('click', openEditUserModal);
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'block';
    });
    document.getElementById('exportBoardBtn')?.addEventListener('click', () => {
        if (currentBoard) exportBoardToCSV(currentBoard.id);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
});
=======
// Board Management

async function loadBoards() {
    try {
        const boards = await apiCall('/boards');
        renderDashboard(boards);
    } catch (error) {
        console.error('Failed to load boards:', error);
    }
}

function renderDashboard(boards) {
    const grid = document.getElementById('dashboardGrid');
    grid.innerHTML = '';

    if (boards.length === 0) {
        document.getElementById('emptyDashboard').style.display = 'flex';
        return;
    }

    document.getElementById('emptyDashboard').style.display = 'none';

    boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        const statusClass = board.status === 'active' ? 'status-active' : 'status-finished';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h3 style="margin:0;">${escapeHtml(board.name)}</h3>
                <span class="board-status ${statusClass}">${board.status}</span>
            </div>
            <div class="board-meta">
                Created: ${new Date(board.created_at).toLocaleDateString()}
            </div>
            <div class="dashboard-actions">
                <button class="btn btn-primary btn-small" onclick="loadBoard('${board.id}')">Enter</button>
                ${board.status === 'finished' ?
                `<button class="btn btn-warning btn-small" onclick="updateBoardStatus('${board.id}', 'active')">Re-open</button>` : ''}
                <button class="btn btn-danger btn-small" onclick="deleteBoard('${board.id}')">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function createBoard(name, columns) {
    try {
        const board = await apiCall('/boards', 'POST', { name, columns });
        await loadBoard(board.id);
        return board;
    } catch (error) {
        console.error('Failed to create board:', error);
        alert('Failed to create board: ' + error.message);
    }
}

async function loadBoard(boardId) {
    try {
        const board = await apiCall(`/boards/${boardId}`);
        window.currentBoard = board;

        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('boardContainer').style.display = 'block';
        document.getElementById('dashboardBtn').style.display = 'inline-block';

        renderBoard(board);
        updateBoardStatusUI(board.status);
    } catch (error) {
        console.error('Failed to load board:', error);
        alert('Failed to load board: ' + error.message);
        showDashboard();
    }
}

async function updateBoardStatus(boardId, status) {
    try {
        await apiCall(`/boards/${boardId}/status`, 'PUT', { status });
        if (window.currentBoard && window.currentBoard.id === boardId) {
            loadBoard(boardId);
        } else {
            loadBoards();
        }
        sendWebSocketMessage('board_update', { board_id: boardId });
    } catch (error) {
        console.error('Failed to update status:', error);
        alert('Failed to update status: ' + error.message);
    }
}

async function deleteBoard(boardId) {
    if (!confirm('Are you sure you want to delete this board? This cannot be undone.')) return;
    try {
        await apiCall(`/boards/${boardId}`, 'DELETE');
        loadBoards();
    } catch (error) {
        console.error('Failed to delete board:', error);
        alert('Failed to delete board: ' + error.message);
    }
}

function updateBoardStatusUI(status) {
    const isFinished = status === 'finished';
    const container = document.getElementById('boardContainer');
    const switchPhaseBtn = document.getElementById('switchPhaseBtn');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const stopTimerBtn = document.getElementById('stopTimerBtn');

    document.getElementById('readOnlyBanner').style.display = isFinished ? 'block' : 'none';
    document.getElementById('finishRetroBtn').style.display = isFinished ? 'none' : 'inline-block';
    document.getElementById('reopenRetroBtn').style.display = isFinished ? 'inline-block' : 'none';

    // Disable phase switching button when finished
    if (switchPhaseBtn) {
        switchPhaseBtn.disabled = isFinished;
        switchPhaseBtn.style.opacity = isFinished ? '0.5' : '1';
        switchPhaseBtn.style.cursor = isFinished ? 'not-allowed' : 'pointer';
    }

    // Disable timer buttons when finished
    if (startTimerBtn) {
        startTimerBtn.disabled = isFinished;
        startTimerBtn.style.opacity = isFinished ? '0.5' : '1';
        startTimerBtn.style.cursor = isFinished ? 'not-allowed' : 'pointer';
    }
    if (stopTimerBtn) {
        stopTimerBtn.disabled = isFinished;
        stopTimerBtn.style.opacity = isFinished ? '0.5' : '1';
        stopTimerBtn.style.cursor = isFinished ? 'not-allowed' : 'pointer';
    }

    if (isFinished) {
        container.classList.add('read-only');
    } else {
        container.classList.remove('read-only');
    }
}

function renderBoard(board) {
    const container = document.getElementById('columnsContainer');
    container.innerHTML = '';

    const sortedColumns = board.columns.sort((a, b) => a.position - b.position);

    sortedColumns.forEach(column => {
        if (column.cards) {
            column.cards = column.cards.filter(c => !c.merged_with_id);
        }
        const columnEl = createColumnElement(column);
        container.appendChild(columnEl);
    });

    if (board.status === 'active') {
        initializeDragAndDrop();
    }
}

function createColumnElement(column) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column';
    columnDiv.dataset.columnId = column.id;

    columnDiv.innerHTML = `
        <div class="column-header">
            <h3 class="column-title">${escapeHtml(column.name)}</h3>
            <div class="column-actions">
                <button class="icon-btn sort-column-btn" data-column-id="${column.id}" title="Sort by Votes">🔃</button>
                <button class="icon-btn edit-column-btn" data-column-id="${column.id}" title="Edit column">✏️</button>
                <button class="icon-btn delete-column-btn" data-column-id="${column.id}" title="Delete column">🗑️</button>
            </div>
        </div>
        <div class="cards-list" data-column-id="${column.id}">
            ${column.cards ? column.cards.map(card => createCardHTML(card)).join('') : ''}
        </div>
        <button class="add-card-btn" data-column-id="${column.id}">+ Add Card</button>
    `;

    columnDiv.querySelector('.add-card-btn').addEventListener('click', () => openNewCardModal(column.id));
    columnDiv.querySelector('.sort-column-btn').addEventListener('click', () => sortColumnByVotes(column.id));
    columnDiv.querySelector('.edit-column-btn').addEventListener('click', () => openEditColumnModal(column.id, column.name));
    columnDiv.querySelector('.delete-column-btn').addEventListener('click', () => deleteColumn(column.id));

    return columnDiv;
}

function createCardHTML(card) {
    const votes = card.votes || [];
    const likes = votes.filter(v => v.vote_type === 'like').length;
    const dislikes = votes.filter(v => v.vote_type === 'dislike').length;
    const isSelected = window.selectedCardId === card.id ? 'selected' : '';
    const userVoted = votes.some(v => v.user_name === window.currentUser);

    let mergedContentHTML = '';
    if (card.merged_cards && card.merged_cards.length > 0) {
        mergedContentHTML = `
            <div class="merged-cards-container">
                ${card.merged_cards.map(mc => `
                    <div class="merged-card-preview">
                        <span class="merged-card-text">${escapeHtml(mc.content)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let mergeActionHTML = '';
    if (window.selectedCardId) {
        if (window.selectedCardId === card.id) {
            mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="cancelSelection()">Cancel</button>`;
        } else {
            mergeActionHTML = `<button class="btn btn-primary btn-small" onclick="mergeCard('${card.id}')">Merge Here</button>`;
        }
    } else {
        mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="selectCard('${card.id}')">Select</button>`;
    }

    return `
        <div class="card ${isSelected}" data-card-id="${card.id}">
            <div class="card-content">${escapeHtml(card.content)}</div>
            ${mergedContentHTML}
            ${card.merged_cards && card.merged_cards.length > 0 ? `
                <div class="merged-indicator">
                    🔗 ${card.merged_cards.length} merged card(s)
                    <button class="btn-link" onclick="openUnmergeModal('${card.id}')">Unmerge</button>
                </div>
            ` : ''}
            <div class="card-footer">
                <div class="card-votes">
                    <span class="vote-count likes">👍 ${likes}</span>
                    <span class="vote-count dislikes">👎 ${dislikes}</span>
                </div>
                <div class="card-actions">
                    ${mergeActionHTML}
                    ${window.currentPhase === 'voting' && !userVoted ? `
                        <button class="vote-btn" onclick="voteCard('${card.id}', 'like')">👍</button>
                        <button class="vote-btn" onclick="voteCard('${card.id}', 'dislike')">👎</button>
                    ` : ''}
                    <button class="delete-card-btn" onclick="deleteCard('${card.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

// Select-to-Merge Logic
function selectCard(cardId) {
    window.selectedCardId = cardId;
    renderBoard(window.currentBoard);
}

function cancelSelection() {
    window.selectedCardId = null;
    renderBoard(window.currentBoard);
}

async function mergeCard(targetCardId) {
    if (!window.selectedCardId) return;

    const sourceCardId = window.selectedCardId;
    if (sourceCardId === targetCardId) return;

    try {
        await apiCall(`/cards/${sourceCardId}/merge`, 'POST', {
            target_card_id: targetCardId
        });
        window.selectedCardId = null;
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
        await loadBoard(window.currentBoard.id);
    } catch (error) {
        console.error('Failed to merge card:', error);
        alert('Failed to merge: ' + error.message);
    }
}

// Unmerge Logic
function openUnmergeModal(cardId) {
    const card = findCardById(cardId);
    if (!card || !card.merged_cards) {
        return;
    }

    const list = document.getElementById('mergedCardsList');
    list.innerHTML = '';

    card.merged_cards.forEach(mergedCard => {
        const item = document.createElement('div');
        item.className = 'merged-card-item';
        item.innerHTML = `
            <span>${escapeHtml(mergedCard.content)}</span>
            <button class="btn btn-danger btn-small" onclick="unmergeCard('${mergedCard.id}')">Unmerge</button>
        `;
        list.appendChild(item);
    });

    document.getElementById('unmergeModal').style.display = 'block';
}

async function unmergeCard(cardId) {
    try {
        await apiCall(`/cards/${cardId}/unmerge`, 'POST');
        document.getElementById('unmergeModal').style.display = 'none';
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to unmerge card:', error);
        alert('Failed to unmerge: ' + error.message);
    }
}

function findCardById(cardId) {
    for (const column of window.currentBoard.columns) {
        if (column.cards) {
            const card = column.cards.find(c => c.id === cardId);
            if (card) return card;
        }
    }
    return null;
}

// Drag and Drop (Sorting Only)
function initializeDragAndDrop() {
    const cardLists = document.querySelectorAll('.cards-list');

    cardLists.forEach(list => {
        new Sortable(list, {
            group: 'cards',
            animation: 150,
            ghostClass: 'dragging',
            onEnd: async (evt) => {
                const itemEl = evt.item;
                const cardId = itemEl.dataset.cardId;
                const newColumnId = evt.to.dataset.columnId;
                const newPosition = evt.newIndex;

                try {
                    await apiCall(`/cards/${cardId}/move`, 'PUT', {
                        column_id: newColumnId,
                        position: newPosition
                    });
                    sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
                } catch (error) {
                    console.error('Failed to move card:', error);
                    loadBoard(window.currentBoard.id);
                }
            }
        });
    });
}

async function sortColumnByVotes(columnId) {
    const column = window.currentBoard.columns.find(c => c.id === columnId);
    if (!column || !column.cards) return;

    const sortedCards = [...column.cards].sort((a, b) => {
        const scoreA = (a.votes?.filter(v => v.vote_type === 'like').length || 0) - (a.votes?.filter(v => v.vote_type === 'dislike').length || 0);
        const scoreB = (b.votes?.filter(v => v.vote_type === 'like').length || 0) - (b.votes?.filter(v => v.vote_type === 'dislike').length || 0);
        return scoreB - scoreA;
    });

    try {
        for (let i = 0; i < sortedCards.length; i++) {
            const card = sortedCards[i];
            if (card.position !== i) {
                await apiCall(`/cards/${card.id}/move`, 'PUT', {
                    column_id: columnId,
                    position: i
                });
            }
        }
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
        loadBoard(window.currentBoard.id);
    } catch (error) {
        console.error('Failed to sort column:', error);
        alert('Failed to sort column: ' + error.message);
    }
}

// Card Management
async function createCard(columnId, content) {
    try {
        await apiCall(`/columns/${columnId}/cards`, 'POST', { content, position: 0 });
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to create card:', error);
        alert('Failed to create card: ' + error.message);
    }
}

async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
        await apiCall(`/cards/${cardId}`, 'DELETE');
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to delete card:', error);
        alert('Failed to delete card: ' + error.message);
    }
}

async function voteCard(cardId, voteType) {
    try {
        await apiCall(`/cards/${cardId}/votes`, 'POST', {
            user_name: window.currentUser,
            vote_type: voteType
        });
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to vote:', error);
        alert(error.message);
    }
}

// Column Management
async function createColumn(name, position) {
    try {
        await apiCall(`/boards/${window.currentBoard.id}/columns`, 'POST', { name, position });
        await loadBoard(window.currentBoard.id);
    } catch (error) {
        console.error('Failed to create column:', error);
        alert('Failed to create column: ' + error.message);
    }
}

async function updateColumn(columnId, name) {
    try {
        await apiCall(`/columns/${columnId}`, 'PUT', { name });
        await loadBoard(window.currentBoard.id);
    } catch (error) {
        console.error('Failed to update column:', error);
        alert('Failed to update column: ' + error.message);
    }
}

async function deleteColumn(columnId) {
    if (!confirm('Are you sure you want to delete this column? All cards will be deleted.')) return;

    try {
        await apiCall(`/columns/${columnId}`, 'DELETE');
        await loadBoard(window.currentBoard.id);
    } catch (error) {
        console.error('Failed to delete column:', error);
        alert('Failed to delete column: ' + error.message);
    }
}

// Modal Management
function openNewCardModal(columnId) {
    document.getElementById('cardColumnId').value = columnId;
    document.getElementById('newCardModal').style.display = 'block';
    document.getElementById('cardContent').value = '';
    document.getElementById('cardContent').focus();
}

function openEditColumnModal(columnId, currentName) {
    document.getElementById('editColumnId').value = columnId;
    document.getElementById('columnNameEdit').value = currentName;
    document.getElementById('editColumnModal').style.display = 'block';
    document.getElementById('columnNameEdit').focus();
}

// CSV Export Function
async function exportBoardToCSV(boardId) {
    try {
        const board = await apiCall(`/boards/${boardId}`);
        const rows = [['Column', 'Card Content', 'Likes', 'Dislikes', 'Merged Cards']];

        board.columns.forEach(column => {
            const cards = (column.cards || []).filter(c => !c.merged_with_id);
            cards.forEach(card => {
                const likes = card.votes?.filter(v => v.vote_type === 'like').length || 0;
                const dislikes = card.votes?.filter(v => v.vote_type === 'dislike').length || 0;
                const mergedCount = card.merged_cards?.length || 0;
                rows.push([column.name, card.content, likes, dislikes, mergedCount]);
            });
        });

        const csvContent = rows.map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `${board.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export: ' + error.message);
    }
}

// Make functions global for onclick handlers
window.loadBoard = loadBoard;
window.deleteBoard = deleteBoard;
window.updateBoardStatus = updateBoardStatus;
window.voteCard = voteCard;
window.deleteCard = deleteCard;
window.exportBoardToCSV = exportBoardToCSV;
window.openUnmergeModal = openUnmergeModal;
window.unmergeCard = unmergeCard;
window.selectCard = selectCard;
window.cancelSelection = cancelSelection;
window.mergeCard = mergeCard;
>>>>>>> migration/bentro-namespace:web/js/board.js
