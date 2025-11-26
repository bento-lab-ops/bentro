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
        document.getElementById('editUserBtn').style.display = 'none';

        document.getElementById('boardTitle').textContent = board.name;

        renderBoard(board);
        updateBoardStatusUI(board.status);

        // Join board for participant tracking if active
        if (board.status === 'active' && window.currentUser) {
            joinBoard(boardId, window.currentUser, window.currentUserAvatar);
        }

        // Show participants history if finished
        if (board.status === 'finished' && board.participants) {
            updateParticipantsDisplay(board.participants);
        }
    } catch (error) {
        console.error('Failed to load board:', error);
        alert('Failed to load board: ' + error.message);
        showDashboard();
    }
}

async function updateBoardStatus(boardId, status) {
    try {
        // Stop timer if finishing the board
        if (status === 'finished' && window.timerInterval) {
            stopTimer();
        }

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
    const addColumnBtn = document.getElementById('addColumnBtn');

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

    // Disable add column button when finished
    if (addColumnBtn) {
        addColumnBtn.disabled = isFinished;
        addColumnBtn.style.opacity = isFinished ? '0.5' : '1';
        addColumnBtn.style.cursor = isFinished ? 'not-allowed' : 'pointer';
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
    const isFinished = window.currentBoard?.status === 'finished';

    columnDiv.innerHTML = `
        <div class="column-header">
            <h3 class="column-title">${escapeHtml(column.name)}</h3>
            <div class="column-actions">
                <button class="icon-btn sort-column-btn" data-column-id="${column.id}" title="Sort by Votes">🔃</button>
                ${!isFinished ? `
                    <button class="icon-btn edit-column-btn" data-column-id="${column.id}" title="Edit column">✏️</button>
                    <button class="icon-btn delete-column-btn" data-column-id="${column.id}" title="Delete column">🗑️</button>
                ` : ''}
            </div>
        </div>
        <div class="cards-list" data-column-id="${column.id}">
            ${column.cards ? column.cards.map(card => createCardHTML(card)).join('') : ''}
        </div>
        ${!isFinished ? `<button class="add-card-btn" data-column-id="${column.id}">+ Add Card</button>` : ''}
    `;

    if (!isFinished) {
        const addCardBtn = columnDiv.querySelector('.add-card-btn');
        if (addCardBtn) {
            addCardBtn.addEventListener('click', () => openNewCardModal(column.id));
        }
        const editBtn = columnDiv.querySelector('.edit-column-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => openEditColumnModal(column.id, column.name));
        }
        const deleteBtn = columnDiv.querySelector('.delete-column-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteColumn(column.id));
        }
    }

    const sortBtn = columnDiv.querySelector('.sort-column-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => sortColumnByVotes(column.id));
    }

    return columnDiv;
}

function createCardHTML(card) {
    const votes = card.votes || [];
    const likes = votes.filter(v => v.vote_type === 'like').length;
    const dislikes = votes.filter(v => v.vote_type === 'dislike').length;
    const isSelected = window.selectedCardId === card.id ? 'selected' : '';
    const userVoted = votes.some(v => v.user_name === window.currentUser);
    const isFinished = window.currentBoard?.status === 'finished';

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
    if (!isFinished) {
        if (window.selectedCardId) {
            if (window.selectedCardId === card.id) {
                mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="cancelSelection()">Cancel</button>`;
            } else {
                mergeActionHTML = `<button class="btn btn-primary btn-small" onclick="mergeCard('${card.id}')">Merge Here</button>`;
            }
        } else {
            mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="selectCard('${card.id}')">Select</button>`;
        }
    }

    return `
        <div class="card ${isSelected}" data-card-id="${card.id}">
            <div class="card-content">${escapeHtml(card.content)}</div>
            ${mergedContentHTML}
            ${card.merged_cards && card.merged_cards.length > 0 ? `
                <div class="merged-indicator">
                    🔗 ${card.merged_cards.length} merged card(s)
                    ${!isFinished ? `<button class="btn-link" onclick="openUnmergeModal('${card.id}')">Unmerge</button>` : ''}
                </div>
            ` : ''}
            <div class="card-footer">
                <div class="card-votes">
                    <span class="vote-count likes">👍 ${likes}</span>
                    <span class="vote-count dislikes">👎 ${dislikes}</span>
                </div>
                <div class="card-actions">
                    ${mergeActionHTML}
                    ${!isFinished && window.currentPhase === 'voting' && !userVoted ? `
                        <button class="vote-btn" onclick="voteCard('${card.id}', 'like')">👍</button>
                        <button class="vote-btn" onclick="voteCard('${card.id}', 'dislike')">👎</button>
                    ` : ''}
                    ${!isFinished ? `<button class="delete-card-btn" onclick="deleteCard('${card.id}')">🗑️</button>` : ''}
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

function updateParticipantsDisplay(participants) {
    const container = document.getElementById('participantsContainer');
    if (!container) return;

    if (!participants || participants.length === 0) {
        container.innerHTML = '<span class="no-participants">Waiting for participants...</span>';
        return;
    }

    container.innerHTML = participants.map(p => `
        <div class="participant-avatar" title="${escapeHtml(p.username)}">
            ${p.avatar || '👤'}
        </div>
    `).join('');
}
window.updateParticipantsDisplay = updateParticipantsDisplay;
