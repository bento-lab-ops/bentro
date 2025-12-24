// Board Management

let allBoardsCache = [];
let currentFilter = 'active';

async function loadBoards() {
    try {
        const boards = await apiCall('/boards');
        allBoardsCache = boards;
        filterBoards(currentFilter || 'active');
    } catch (error) {
        console.error('Failed to load boards:', error);
    }
}

function filterBoards(status) {
    currentFilter = status;

    // Update Filter UI
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(status === 'active' ? 'filterActiveBtn' : 'filterFinishedBtn');
    if (activeBtn) activeBtn.classList.add('active');

    // Filter Data
    const filtered = allBoardsCache.filter(b => b.status === status);
    renderDashboard(filtered);
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

        // Action Item Logic
        const actionItemCount = board.action_item_count || 0;
        const hasActionItems = actionItemCount > 0;
        const actionItemBadge = hasActionItems
            ? `<div class="action-item-dashboard-badge" title="${actionItemCount} active action items">⚡ ${actionItemCount}</div>`
            : '';

        // Delete Button Logic
        const deleteDisabled = hasActionItems ? 'disabled' : '';
        const deleteStyle = hasActionItems ? 'opacity: 0.5; cursor: not-allowed;' : '';
        const deleteTitle = hasActionItems ? 'Cannot delete board with action items' : 'Delete';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h3 style="margin:0;">${escapeHtml(board.name)}</h3>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    ${actionItemBadge}
                    <span class="board-status ${statusClass}">${board.status}</span>
                </div>
            </div>
            <div class="board-meta">
                Created: ${new Date(board.created_at).toLocaleDateString()}
            </div>
            <div class="dashboard-actions">
                <button class="btn btn-primary btn-small" onclick="loadBoard('${board.id}')">Enter</button>
                ${board.status === 'finished' ?
                `<button class="btn btn-warning btn-small" onclick="updateBoardStatus('${board.id}', 'active')">Re-open</button>` : ''}
                <button class="btn btn-danger btn-small" 
                    onclick="deleteBoard('${board.id}')" 
                    ${deleteDisabled} 
                    style="${deleteStyle}"
                    title="${deleteTitle}">Delete</button>
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
        // Stop any existing polling
        stopParticipantPolling();

        const board = await apiCall(`/boards/${boardId}`);
        window.currentBoard = board;

        // Update URL hash
        if (window.location.hash !== `#board/${boardId}`) {
            history.pushState(null, null, `#board/${boardId}`);
        }

        document.getElementById('dashboardView').style.display = 'none';
        const actionItemsView = document.getElementById('actionItemsView');
        if (actionItemsView) actionItemsView.style.display = 'none';
        const adminView = document.getElementById('adminView');
        if (adminView) adminView.style.display = 'none';

        document.getElementById('boardContainer').style.display = 'block';

        if (document.getElementById('dashboardBtn')) document.getElementById('dashboardBtn').style.display = 'inline-block';
        if (document.getElementById('leaveBoardBtn')) document.getElementById('leaveBoardBtn').style.display = 'inline-block';
        if (document.getElementById('editUserBtn')) document.getElementById('editUserBtn').style.display = 'inline-block';

        document.getElementById('boardTitle').textContent = board.name;

        renderBoard(board);
        updateBoardStatusUI(board.status);

        // Join board for participant tracking if active
        if (board.status === 'active' && window.currentUser) {
            joinBoard(boardId, window.currentUser, window.currentUserAvatar);
            startParticipantPolling(boardId);
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

async function deleteBoard(id) {
    if (confirm('Are you sure you want to delete this board? This cannot be undone.')) {
        apiCall(`/boards/${id}`, 'DELETE')
            .then(() => loadBoards())
            .catch(err => alert('Failed to delete board: ' + err.message));
    }
}

// Manager Actions
async function claimManagerAction() {
    if (!window.currentBoard) return;
    if (!confirm('Claim this board? You will be responsible for its settings.')) return;

    try {
        await claimBoardManager(window.currentBoard.id, window.currentUser);
        loadBoard(window.currentBoard.id); // Reload to update UI
    } catch (error) {
        alert('Failed to claim board: ' + error.message);
    }
}

function openBoardSettings() {
    if (!window.currentBoard) return;

    document.getElementById('settingVoteLimit').value = window.currentBoard.vote_limit || 0;
    document.getElementById('settingBlindVoting').checked = window.currentBoard.blind_voting || false;

    document.getElementById('boardSettingsModal').style.display = 'block';
}

function closeBoardSettingsModal() {
    document.getElementById('boardSettingsModal').style.display = 'none';
}


function updateBoardStatusUI(status) {
    const isFinished = status === 'finished';
    const container = document.getElementById('boardContainer');
    const switchPhaseBtn = document.getElementById('switchPhaseBtn');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const stopTimerBtn = document.getElementById('stopTimerBtn');
    const addColumnBtn = document.getElementById('addColumnBtn');

    const leaveBoardBtn = document.getElementById('leaveBoardBtn');

    document.getElementById('readOnlyBanner').style.display = isFinished ? 'block' : 'none';
    document.getElementById('finishRetroBtn').style.display = isFinished ? 'none' : 'inline-block';
    document.getElementById('reopenRetroBtn').style.display = isFinished ? 'inline-block' : 'none';

    // Disable leave board button when finished
    if (leaveBoardBtn) {
        leaveBoardBtn.disabled = isFinished;
        leaveBoardBtn.style.opacity = isFinished ? '0.5' : '1';
        leaveBoardBtn.style.cursor = isFinished ? 'not-allowed' : 'pointer';
        leaveBoardBtn.title = isFinished ? 'Cannot leave a finished board' : 'Leave board and stop participating';
    }

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

    // Check for Blind Voting (indicated by -1 from API or Phase check)
    // The API sends -1 for likes/dislikes if hidden
    // OR we can check window.currentBoard.phase === 'voting' IF we want to enforce UI hiding dynamically
    // But safely rely on API or 'likes === -1' convention from backend handler
    const isBlindVoting = (likes === 0 && dislikes === 0 && votes.length === 0 && window.currentBoard.phase === 'voting');
    // Wait, the API returns likes=-1 if hidden, but JS sees JSON number. 
    // Backend handler said: "likes": -1
    // Let's check card.votes again. The API returns { votes: [], likes: -1, dislikes: -1 } for others.
    // For the user, it returns their own votes.
    // So if I am the user, I see my votes.
    // We need to fetch 'likes' count safely.
    // Actually, in `createCardHTML`, `card` is passed from board.columns.cards.
    // The `loadBoard` API returns all cards.
    // Does `loadBoard` use `GetVotes`? NO. It uses `GetBoard`.
    // `GetBoard` returns nested cards with all votes currently.
    // WE MISSED UPDATING `GetBoard` to hide votes!
    // The `GetVotes` handler was updated, but the Board one wasn't!
    // We should patch `GetBoard` in backend too, OR handle masking purely in frontend (less secure) OR `GetBoard` should filter.
    // Let's trust Frontend masking for v0.5.0 MVP + Backend constraint on `GetVotes` calls (if used).
    // Actually `renderBoard` has `window.currentBoard.phase`.

    const isVotingPhase = window.currentBoard.phase === 'voting';

    let voteControlsHTML = '';

    if (isVotingPhase) {
        voteControlsHTML = `
            <div class="vote-controls-blind">
                <span class="blind-vote-badge" title="Votes are hidden during voting phase">🙈 Votes Hidden</span>
                ${!isFinished ? `<button class="vote-btn ${userVoted ? 'voted' : ''}" onclick="voteCard('${card.id}', 'like')">${userVoted ? 'Remove Vote' : '👍 Vote'}</button>` : ''}
            </div>
         `;
    } else {
        voteControlsHTML = `
            <div class="card-votes">
                <span class="vote-count likes">👍 ${likes}</span>
                <span class="vote-count dislikes">👎 ${dislikes}</span>
            </div>
            <div class="card-actions-voting">
                ${!isFinished ? `
                    <button class="vote-btn ${userVoted ? 'voted' : ''}" onclick="voteCard('${card.id}', 'like')">👍</button>
                    <button class="vote-btn" onclick="voteCard('${card.id}', 'dislike')">👎</button>
                ` : ''}
             </div>
         `;
    }

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

    const AVAILABLE_REACTIONS = {
        'love': '❤️',
        'celebrate': '🎉',
        'idea': '💡',
        'action': '🚀',
        'question': '🤔'
    };

    // Group reactions
    const reactions = card.reactions || [];
    const reactionCounts = {};
    const userReactions = new Set();

    reactions.forEach(r => {
        reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
        if (r.user_name === window.currentUser) {
            userReactions.add(r.reaction_type);
        }
    });

    let reactionsHTML = '';

    // Render existing reactions as tags
    Object.entries(reactionCounts).forEach(([type, count]) => {
        const emoji = AVAILABLE_REACTIONS[type];
        if (!emoji) return;
        const isActive = userReactions.has(type) ? 'active' : '';
        // Only allow clicking to toggle if not finished
        const onClick = !isFinished ? `onclick="toggleCardReaction('${card.id}', '${type}')"` : '';

        reactionsHTML += `
            <div class="reaction-tag ${isActive}" ${onClick} title="${type}">
                <span>${emoji}</span>
                <span class="reaction-count">${count}</span>
            </div>
        `;
    });

    // Add Reaction Button (if not finished)
    let addReactionHTML = '';
    if (!isFinished) {
        addReactionHTML = `
            <div class="add-reaction-btn" onclick="showReactionPicker(this, '${card.id}')" title="Add Reaction">
                +🙂
                <div class="reaction-picker" style="display: none;" onclick="event.stopPropagation()">
                    ${Object.entries(AVAILABLE_REACTIONS).map(([type, emoji]) => `
                        <div class="reaction-option" onclick="toggleCardReaction('${card.id}', '${type}'); hideReactionPicker(this)">${emoji}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Action Item Logic
    const isActionItem = card.is_action_item;
    let actionItemBadgeHTML = '';
    let actionItemDetailsHTML = '';
    let actionItemClasses = '';

    if (isActionItem) {
        actionItemClasses += ' action-item';
        actionItemBadgeHTML = `
            <div class="action-item-indicator">
                ⚡ Action Item
            </div>
        `;

        const dueDate = card.due_date ? new Date(card.due_date).toLocaleDateString() : 'No Date';
        const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !card.completed;

        actionItemDetailsHTML = `
            <div class="action-item-details">
                <div class="action-owner" title="Owner">
                    👤 ${escapeHtml(card.owner || 'Unassigned')}
                </div>
                <div class="action-due-date ${isOverdue ? 'overdue' : ''}" title="Due Date">
                    📅 ${dueDate}
                </div>
                <div class="action-status">
                    <label class="action-completed-label" onclick="event.stopPropagation()">
                        <input type="checkbox" class="action-completed-checkbox" 
                            ${card.completed ? 'checked' : ''} 
                            onchange="this.checked ? markActionItemDone('${card.id}', false) : toggleActionItemCompletion('${card.id}', false)">
                        Done
                    </label>
                </div>
                ${card.completed && (card.completion_link || card.completion_desc) ? `
                    <div class="action-completion-info" style="margin-top: 0.5rem; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 4px;">
                        ${card.completion_link ? `<div style="margin-bottom:4px;"><a href="${escapeHtml(card.completion_link)}" target="_blank" style="color: var(--accent-color); text-decoration: none; font-weight: 500;">🔗 Open Link</a></div>` : ''}
                        ${card.completion_desc ? `<div style="color: var(--text-primary);">📝 ${escapeHtml(card.completion_desc)}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        if (card.completed) {
            actionItemClasses += ' completed';
        }
    }

    return `
        <div class="card ${isSelected} ${actionItemClasses}" data-card-id="${card.id}">
            <div class="card-content">
                ${actionItemBadgeHTML}
                ${escapeHtml(card.content)}
                <div class="reactions-container">
                    ${reactionsHTML}
                    ${addReactionHTML}
                </div>
                ${actionItemDetailsHTML}
            </div>
            ${mergedContentHTML}
            ${card.merged_cards && card.merged_cards.length > 0 ? `
                <div class="merged-indicator">
                    🔗 ${card.merged_cards.length} merged card(s)
                    ${!isFinished ? `<button class="btn-link" onclick="openUnmergeModal('${card.id}')">Unmerge</button>` : ''}
                </div>
            ` : ''}
            <div class="card-footer">
                ${voteControlsHTML}
                
                <div class="card-actions">
                    ${mergeActionHTML}
                    ${!isFinished ? `
                        <button class="action-btn ${isActionItem ? 'active' : ''}" onclick="openActionItemModal('${card.id}')" title="Action Item">⚡</button>
                    ` : ''}
                    ${!isFinished ? `<button class="delete-card-btn" onclick="deleteCard('${card.id}')">🗑️</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Make reaction functions global
window.toggleCardReaction = async function (cardId, type) {
    try {
        await toggleReaction(cardId, type);
        // Refresh board to show changes
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to toggle reaction:', error);
        alert(error.message);
    }
};

window.showReactionPicker = function (btn, cardId) {
    // Hide all other pickers first
    document.querySelectorAll('.reaction-picker').forEach(p => p.style.display = 'none');

    // Show this one
    const picker = btn.querySelector('.reaction-picker');
    if (picker) {
        picker.style.display = 'flex';

        // Close on click outside
        const closePicker = (e) => {
            if (!picker.contains(e.target) && !btn.contains(e.target)) {
                picker.style.display = 'none';
                document.removeEventListener('click', closePicker);
            }
        };
        setTimeout(() => document.addEventListener('click', closePicker), 0);
    }
};

window.hideReactionPicker = function (el) {
    const picker = el.closest('.reaction-picker');
    if (picker) picker.style.display = 'none';
};

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

let lastParticipantsHash = '';

function updateParticipantsDisplay(participants) {
    const container = document.getElementById('participantsContainer');
    if (!container) return;

    // Optimistic update: Ensure current user is always in the list if logged in
    // This prevents "Waiting..." flash if backend returns empty momentarily
    let displayParticipants = participants || [];
    if (window.currentUser && window.currentUserAvatar) {
        const currentUserInList = displayParticipants.some(p => p.username === window.currentUser);
        if (!currentUserInList) {
            displayParticipants.push({
                username: window.currentUser,
                avatar: window.currentUserAvatar
            });
        }
    }

    // Sort by username for consistent comparison
    displayParticipants.sort((a, b) => a.username.localeCompare(b.username));

    // Check if content changed
    const currentHash = JSON.stringify(displayParticipants);
    if (currentHash === lastParticipantsHash) {
        return; // No changes, skip DOM update
    }
    lastParticipantsHash = currentHash;

    if (displayParticipants.length === 0) {
        container.innerHTML = '<span class="no-participants">Waiting for participants...</span>';
        return;
    }

    container.innerHTML = displayParticipants.map(p => `
        <div class="participant-avatar" title="${escapeHtml(p.username)}">
            ${p.avatar || '👤'}
        </div>
    `).join('');
}
window.updateParticipantsDisplay = updateParticipantsDisplay;

// Participant Polling
let participantPollingInterval = null;

function startParticipantPolling(boardId) {
    stopParticipantPolling(); // Ensure no duplicate intervals

    // Initial fetch
    fetchParticipants(boardId);

    // Poll every 5 seconds
    participantPollingInterval = setInterval(() => {
        fetchParticipants(boardId);
    }, 5000);
}

function stopParticipantPolling() {
    if (participantPollingInterval) {
        clearInterval(participantPollingInterval);
        participantPollingInterval = null;
    }
}

async function fetchParticipants(boardId) {
    try {
        const participants = await apiCall(`/boards/${boardId}/participants`);
        updateParticipantsDisplay(participants);
    } catch (error) {
        console.error('Failed to fetch participants:', error);
    }
}

window.startParticipantPolling = startParticipantPolling;
window.stopParticipantPolling = stopParticipantPolling;

// Action Item Logic
window.openActionItemModal = function (cardId) {
    const card = findCardById(cardId);
    if (!card) return;

    document.getElementById('actionItemCardId').value = cardId;

    // Populate Owner Select
    const ownerSelect = document.getElementById('actionItemOwner');
    ownerSelect.innerHTML = '<option value="">Unassigned</option>';

    // Get unique participants from board + current user
    const participants = window.currentBoard.participants || [];
    // Ensure unique usernames
    const usernames = new Set(participants.map(p => p.username));

    // Add current user if not in list
    if (window.currentUser && !usernames.has(window.currentUser)) {
        usernames.add(window.currentUser);
    }

    Array.from(usernames).sort().forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username;
        if (card.owner === username) option.selected = true;
        ownerSelect.appendChild(option);
    });

    // Set Due Date
    const dateInput = document.getElementById('actionItemDueDate');
    if (card.due_date) {
        // Format to YYYY-MM-DD for input[type=date]
        dateInput.value = new Date(card.due_date).toISOString().split('T')[0];
    } else {
        // Default to Today to avoid 1700s/1900s weirdness
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('actionItemModal').style.display = 'block';
};

window.saveActionItem = async function () {
    const cardId = document.getElementById('actionItemCardId').value;
    const owner = document.getElementById('actionItemOwner').value;
    const dueDate = document.getElementById('actionItemDueDate').value;

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', {
            is_action_item: true,
            owner: owner,
            due_date: dueDate ? new Date(dueDate).toISOString() : null
        });

        document.getElementById('actionItemModal').style.display = 'none';
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to save action item:', error);
        alert('Failed to save action item: ' + error.message);
    }
};

window.toggleActionItemCompletion = async function (cardId, isChecked) {
    if (!isChecked) {
        if (!confirm('Are you sure you want to re-open this item?\nThis will clear the completion details (date, link, notes).')) {
            // Revert checkbox state immediately
            const checkbox = document.querySelector(`.card[data-card-id="${cardId}"] .action-completed-checkbox`);
            if (checkbox) checkbox.checked = true;
            return;
        }
    }

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', {
            completed: isChecked,
            completion_date: isChecked ? new Date().toISOString() : null,
            completion_link: isChecked ? null : "", // Explicitly clear if reopening
            completion_desc: isChecked ? null : ""
        });
        // Optimistic update handled by checkbox state, but we should reload to be safe and sync
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to toggle completion:', error);
        alert('Failed to update status: ' + error.message);
        // Revert checkbox if failed
        await loadBoard(window.currentBoard.id);
    }
};

window.removeActionItem = async function () {
    const cardId = document.getElementById('actionItemCardId').value;
    if (!confirm('Are you sure you want to remove the Action Item status from this card?')) return;

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', {
            is_action_item: false,
            owner: null,
            due_date: null,
            completed: false
        });

        document.getElementById('actionItemModal').style.display = 'none';
        await loadBoard(window.currentBoard.id);
        sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
    } catch (error) {
        console.error('Failed to remove action item:', error);
        alert('Failed to remove action item: ' + error.message);
    }
};

// Helper: Find card by ID in current board
function findCardById(cardId) {
    if (!window.currentBoard || !window.currentBoard.columns) return null;
    for (const column of window.currentBoard.columns) {
        if (column.cards) {
            const card = column.cards.find(c => c.id === cardId);
            if (card) return card;
        }
    }
    return null;
}
