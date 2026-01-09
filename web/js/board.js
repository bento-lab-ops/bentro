// Board Management

let allBoardsCache = [];
let currentFilter = 'active';

async function loadBoards() {
    try {
        const boards = await apiCall('/boards');
        console.log('[loadBoards] Fetched boards:', boards.length, boards.map(b => ({ id: b.id, name: b.name, part_count: b.participant_count, participants: b.participants })));
        allBoardsCache = boards;
        filterBoards(currentFilter || 'active');
    } catch (error) {
        console.error('Failed to load boards:', error);
    }
}

function filterBoards(status) {
    currentFilter = status;

    // Update Filter UI
    document.querySelectorAll('.team-nav-tab').forEach(btn => btn.classList.remove('active'));
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
        card.className = 'board-card';
        card.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I' && !e.target.closest('button')) {
                loadBoard(board.id);
            }
        };

        // Determine flags
        const myUser = (window.currentUser || '').toLowerCase();
        const isOwner = (board.owner || '').toLowerCase() === myUser;
        const isMember = board.participants && board.participants.some(p => (p.username || '').toLowerCase() === myUser);

        // Multi-team logic
        const teams = board.teams || [];
        const isTeamBoard = teams.length > 0 || !!board.team_id;

        // Display Name Logic
        let displayTeamName = board.team_name || ''; // Default to legacy
        if (teams.length > 0) {
            displayTeamName = teams.map(t => t.name).join(', ');
        }
        const hasTeam = !!displayTeamName;

        // Add filter attributes
        card.dataset.myBoard = isOwner ? 'true' : 'false';
        card.dataset.participating = isMember ? 'true' : 'false';
        card.dataset.teamBoard = isTeamBoard ? 'true' : 'false';

        // Action Item Logic
        const actionItemCount = board.action_item_count || 0;
        const hasActionItems = actionItemCount > 0;
        const isActive = board.status === 'active';
        const statusClass = isActive ? 'status-active' : 'status-finished';
        const actionItemBadge = hasActionItems
            ? `<span class="action-item-dashboard-badge" title="${actionItemCount} Action Items">⚡ ${actionItemCount}</span>`
            : '';

        let deleteTitle = i18n.t('modal.delete');
        if (hasActionItems) {
            deleteTitle = i18n.t('alert.cannot_delete_items');
        } else if (isActive) {
            deleteTitle = i18n.t('alert.cannot_delete_active') || 'Finish board to delete';
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                <h3 title="${escapeHtml(board.name)}" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 70%;">${escapeHtml(board.name)}</h3>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    ${actionItemBadge}
                    <span class="board-status ${statusClass}">${i18n.t('status.' + board.status) || board.status}</span>
                </div>
            </div>
            
            <div class="board-meta" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.created_at') || 'Created'}:</span>
                    <span>${new Date(board.created_at).toLocaleDateString()}</span>
                </div>
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.participants') || 'Participants'}:</span>
                    <span>${board.participant_count}</span>
                </div>
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.owner') || 'Owner'}:</span>
                    <span>${escapeHtml(board.owner || '-')}</span>
                </div>
                ${hasTeam ? `
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.team') || 'Team'}:</span>
                    <span title="${escapeHtml(displayTeamName)}" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(displayTeamName)}</span>
                </div>` : ''}
            </div>

            <div class="dashboard-actions">
                ${(() => {
                const myUser = (window.currentUser || '').toLowerCase();
                const isMember = board.participants && board.participants.some(p => (p.username || '').toLowerCase() === myUser);
                const isOwner = (board.owner || '').toLowerCase() === myUser;

                if (board.status === 'finished') {
                    return `<button class="btn btn-primary btn-sm" onclick="loadBoard('${board.id}')" title="${i18n.t('btn.view_results') || 'View Results'}">
                             <i class="fas fa-chart-bar"></i> ${i18n.t('btn.view')}
                        </button>`;
                }

                if (isMember || isOwner) {
                    return `<button class="btn btn-primary btn-sm" onclick="loadBoard('${board.id}')" title="${i18n.t('btn.return') || 'Return'}">
                             <i class="fas fa-arrow-right"></i> ${i18n.t('btn.return') || 'Retornar'}
                        </button>`;
                } else {
                    return `<button class="btn btn-success btn-sm" onclick="joinBoardPersistent('${board.id}')" title="${i18n.t('btn.join')}">
                             <i class="fas fa-sign-in-alt"></i> ${i18n.t('btn.enter') || 'Entrar'}
                        </button>`;
                }
            })()}

                ${board.status === 'finished' ?
                `<button class="btn btn-warning btn-sm" onclick="updateBoardStatus('${board.id}', 'active')" title="${i18n.t('btn.reopen')}"><i class="fas fa-sync-alt"></i></button>` : ''}
                
                ${board.status === 'finished' ?
                `<button class="btn btn-danger btn-sm" 
                    onclick="deleteBoard('${board.id}')" 
                    title="${deleteTitle}">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        `;

        grid.appendChild(card);
    });

    // Apply client-side filters (text search, toggles) after rendering
    if (typeof applyDashboardFilters === 'function') {
        applyDashboardFilters();
    }
}

async function joinBoardPersistent(boardId) {
    if (!window.currentUser) {
        alert("Please log in to join a board.");
        return;
    }
    try {
        await apiCall(`/boards/${boardId}/join`, 'POST', {
            username: window.currentUser,
            avatar: window.currentUserAvatar
        });
        await loadBoard(boardId);
    } catch (error) {
        console.error('Failed to join board:', error);
        alert('Failed to join board: ' + error.message);
    }
}

async function leaveBoardPersistent(boardId) {
    const id = boardId || (window.currentBoard ? window.currentBoard.id : null);
    if (!id) {
        console.error("No board ID found for leave action");
        return;
    }
    if (!window.currentUser) {
        window.location.hash = '#dashboard';
        showDashboard();
        return;
    }

    if (!confirm(i18n.t('confirm.leave_board') || "Are you sure you want to leave this board?")) return;
    try {
        await apiCall(`/boards/${id}/leave`, 'POST', {
            username: window.currentUser
        });

        // Success: Redirect to dashboard
        window.location.hash = '#dashboard';

        // Ensure UI update
        if (typeof showDashboard === 'function') {
            showDashboard();
        } else {
            // Fallback if showDashboard is not available or hash change didn't trigger
            document.getElementById('board-view').style.display = 'none';
            document.getElementById('dashboard-view').style.display = 'block';
            loadBoards();
        }

        // Refresh data
        setTimeout(loadBoards, 50);
    } catch (error) {
        console.error('Failed to leave board:', error);
        // If error is "user not participant", we should probably just return to dashboard anyway?
        // For now, alert logic is fine.
        alert('Failed to leave board: ' + error.message);
    }
}

async function createBoard(name, columns, teamId = null) {
    try {
        const payload = {
            name,
            columns,
            owner: window.currentUser
        };
        if (teamId) {
            payload.team_id = teamId;
        }

        const board = await apiCall('/boards', 'POST', payload);
        // Auto-join handled by backend
        // await apiCall(`/boards/${board.id}/join`...

        await loadBoard(board.id);
        return board;
    } catch (error) {
        console.error('Failed to create board:', error);
        alert(i18n.t('alert.failed_create_board') + ': ' + error.message);
    }
}

async function loadBoard(boardId) {
    try {
        // Fix API calls
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
        if (document.getElementById('newBoardBtn')) document.getElementById('newBoardBtn').style.display = 'none'; // Fix: Hide New Board button


        const titleEl = document.getElementById('boardTitle');
        titleEl.textContent = board.name; // Fallback text

        // Team Badge Logic
        const teams = board.teams || [];
        let teamBadge = '';
        if (teams.length > 0) {
            const teamNames = teams.map(t => t.name).join(', ');
            teamBadge = ` <span class="board-header-team-badge" title="Participating Teams: ${escapeHtml(teamNames)}">👥 ${teams.length} Team${teams.length > 1 ? 's' : ''}</span>`;
        } else if (board.team_name) {
            // Legacy fallback
            teamBadge = ` <span class="board-header-team-badge" title="Team: ${escapeHtml(board.team_name)}">👥 1 Team</span>`;
        }

        if (teamBadge) {
            titleEl.innerHTML = `${escapeHtml(board.name)}${teamBadge}`;
        } else {
            titleEl.textContent = board.name;
        }

        renderBoard(board);
        updateBoardStatusUI(board.status);
        updateVoteStatusUI(board);


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
    if (confirm(i18n.t('confirm.delete_board'))) {
        apiCall(`/boards/${id}`, 'DELETE')
            .then(() => loadBoards())
            .catch(err => alert('Failed to delete board: ' + err.message));
    }
}

// Helper to check permissions
function isBoardManager() {
    if (!window.currentBoard) return false;

    // Admin Check
    const adminToken = localStorage.getItem('adminToken');
    // Ensure token is valid and not string "undefined" or "null"
    const isAdmin = !!adminToken && adminToken !== 'undefined' && adminToken !== 'null';

    const currentUser = window.currentUser;
    if (!currentUser) return isAdmin; // If not logged in, only admin counts

    const isOwner = window.currentBoard.owner && window.currentBoard.owner === currentUser;
    const isCoOwner = window.currentBoard.co_owner && window.currentBoard.co_owner === currentUser;
    return isAdmin || isOwner || isCoOwner;
}

// Manager Actions
async function claimManagerAction() {
    if (!window.currentBoard) return;
    if (!confirm(i18n.t('confirm.claim_board'))) return;

    try {
        await claimBoardManager(window.currentBoard.id, window.currentUser);
        loadBoard(window.currentBoard.id); // Reload to update UI
    } catch (error) {
        alert('Failed to claim board: ' + error.message);
    }
}

async function unclaimManagerAction() {
    if (!window.currentBoard) return;
    if (!confirm(i18n.t('confirm.unclaim_board') || "Relinquish your manager role?")) return;

    try {
        await apiCall(`/boards/${window.currentBoard.id}/unclaim`, 'POST', { user: window.currentUser });
        loadBoard(window.currentBoard.id);
    } catch (error) {
        alert('Failed to unclaim board: ' + error.message);
    }
}

async function claimBoardManager(boardId, username) {
    await apiCall(`/boards/${boardId}/claim`, 'POST', { owner: username });
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

async function saveBoardSettings() {
    if (!window.currentBoard) return;

    const voteLimit = parseInt(document.getElementById('settingVoteLimit').value) || 0;
    const blindVoting = document.getElementById('settingBlindVoting').checked;

    try {
        await apiCall(`/admin/boards/${window.currentBoard.id}/settings`, 'POST', {
            vote_limit: voteLimit,
            blind_voting: blindVoting
        });

        closeBoardSettingsModal();
        loadBoard(window.currentBoard.id);
        alert('Settings saved!');
    } catch (error) {
        console.error('Failed to save settings:', error);
        alert('Failed to save settings: ' + error.message);
    }
}


function updateBoardStatusUI(status) {
    const isFinished = status === 'finished';
    const container = document.getElementById('boardContainer');
    const switchPhaseBtn = document.getElementById('switchPhaseBtn');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const stopTimerBtn = document.getElementById('stopTimerBtn');
    const addColumnBtn = document.getElementById('addColumnBtn');

    const leaveBoardBtn = document.getElementById('leaveBoardBtn');
    const exportBtn = document.getElementById('exportBoardBtn');

    document.getElementById('readOnlyBanner').style.display = isFinished ? 'block' : 'none';
    // Buttons visibility handled below via RBAC
    // document.getElementById('finishRetroBtn').style.display = isFinished ? 'none' : 'inline-block';
    // document.getElementById('reopenRetroBtn').style.display = isFinished ? 'inline-block' : 'none';

    // Disable leave board button when finished
    if (leaveBoardBtn) {
        leaveBoardBtn.disabled = isFinished;
        leaveBoardBtn.style.opacity = isFinished ? '0.5' : '1';
        leaveBoardBtn.style.cursor = isFinished ? 'not-allowed' : 'pointer';
        leaveBoardBtn.onclick = () => leaveBoardPersistent(window.currentBoard.id);
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

    // Role-Based Control Visibility
    const isCheck = isBoardManager();

    // Hide Timer Controls for non-managers
    if (startTimerBtn) startTimerBtn.style.display = isCheck ? 'inline-block' : 'none';
    if (stopTimerBtn) stopTimerBtn.style.display = isCheck ? 'inline-block' : 'none';

    // Hide Phase Switching for non-managers (unless finished, already handled above but double check visibility)
    if (switchPhaseBtn) switchPhaseBtn.style.display = isCheck ? 'inline-block' : 'none';

    // Hide Export CSV for non-finished boards (Roadmap item)
    // AND hide it if controls should be restricted (optional, but requested implicitly by 'user can still see buttons')
    if (exportBtn) {
        if (isFinished) {
            exportBtn.style.display = 'inline-block';
        } else {
            // If active, only show if Manager? Or hide completely as per Roadmap 'restrict to finished'?
            // Roadmap said: "Restrict Export CSV to only be available for Finished boards"
            // So we hide it if active, regardless of user.
            exportBtn.style.display = 'none';
        }
    }

    // Hide Finish Retro for non-managers
    const finishBtn = document.getElementById('finishRetroBtn');
    if (finishBtn) {
        if (isFinished) {
            finishBtn.style.display = 'none'; // Already hidden if finished
        } else {
            finishBtn.style.display = isCheck ? 'inline-block' : 'none';
        }
    }

    // Hide Reopen for non-managers
    const reopenBtn = document.getElementById('reopenRetroBtn');
    if (reopenBtn) {
        if (!isFinished) {
            reopenBtn.style.display = 'none';
        } else {
            reopenBtn.style.display = isCheck ? 'inline-block' : 'none';
        }
    }

    // Timer Input Visibility
    const timerInput = document.getElementById('timerMinutes');
    if (timerInput) timerInput.style.display = isCheck ? 'inline-block' : 'none';

    // Disable add column button when finished, Hide if not manager
    if (addColumnBtn) {
        if (!isCheck || isFinished) {
            addColumnBtn.style.display = 'none';
        } else {
            addColumnBtn.style.display = 'block'; // or flex/inline-block
            addColumnBtn.disabled = false;
        }
    }

    // Owner / Admin Button Visibility
    const adminSettingsBtn = document.getElementById('adminSettingsBtn');
    const claimBtn = document.getElementById('claimManagerBtn');

    // Check if user is owner OR admin (JWT or K8s token)
    const isAdmin = (window.currentUserRole === 'admin') || !!localStorage.getItem('adminToken');
    const isOwner = window.currentBoard && window.currentBoard.owner === window.currentUser;
    const isCoOwner = window.currentBoard && window.currentBoard.co_owner === window.currentUser;
    const hasOwner = window.currentBoard && !!window.currentBoard.owner;
    const hasCoOwner = window.currentBoard && !!window.currentBoard.co_owner;

    if (adminSettingsBtn) {
        if (isOwner || isCoOwner || isAdmin) {
            adminSettingsBtn.style.display = 'inline-block';
            adminSettingsBtn.disabled = isFinished;
            if (isFinished) adminSettingsBtn.style.opacity = '0.5';
        } else {
            adminSettingsBtn.style.display = 'none';
        }
    }

    // Unclaim Button Visibility
    const unclaimBtn = document.getElementById('unclaimManagerBtn');
    if (unclaimBtn) {
        if (isOwner || isCoOwner) {
            unclaimBtn.style.display = 'inline-flex'; // Use inline-flex for glass buttons
            // unclaimBtn.textContent = '❌ ' + (i18n.t('btn.unclaim') || 'Relinquish'); // Text is set in HTML
        } else {
            unclaimBtn.style.display = 'none';
        }
    }

    if (claimBtn) {
        if (!isFinished) {
            if (!hasOwner) {
                claimBtn.style.display = 'inline-block';
                claimBtn.innerHTML = '👑 ' + (i18n.t('btn.claim_host') || 'Claim Host');
            } else if (!hasCoOwner && !isOwner && !isCoOwner) {
                // Show if 1 slot open and I'm not already a manager
                // Only show if user is logged in? window.currentUser is required for this check anyway
                claimBtn.style.display = 'inline-block';
                claimBtn.innerHTML = '👑 ' + (i18n.t('btn.claim_co_host') || 'Claim Co-Host');
            } else {
                claimBtn.style.display = 'none';
            }
        } else {
            claimBtn.style.display = 'none';
        }
    }

    // Manage Teams Button Injection
    let manageTeamsBtn = document.getElementById('manageTeamsBtn');
    if (!manageTeamsBtn) {
        manageTeamsBtn = document.createElement('button');
        manageTeamsBtn.id = 'manageTeamsBtn';
        manageTeamsBtn.className = 'btn btn-outline btn-sm';
        manageTeamsBtn.style.marginLeft = '8px';
        manageTeamsBtn.onclick = openManageTeamsModal; // Global from main.js
        manageTeamsBtn.innerHTML = '👥 ' + (i18n.t('btn.manage_teams') || 'Teams');

        const boardHeaderSection = document.querySelector('.board-header-section');
        if (boardHeaderSection) {
            boardHeaderSection.appendChild(manageTeamsBtn);
        }
    }

    if (isOwner || isCoOwner || isAdmin) {
        manageTeamsBtn.style.display = 'inline-block';
        manageTeamsBtn.disabled = isFinished;
        if (isFinished) manageTeamsBtn.style.opacity = '0.5';
    } else {
        manageTeamsBtn.style.display = 'none';
    }

    if (isFinished) {
        container.classList.add('read-only');
    } else {
        container.classList.remove('read-only');
    }
}

function updateVoteStatusUI(board) {
    const display = document.getElementById('voteStatusDisplay');
    if (!display) return;

    if (board.vote_limit > 0 && board.phase === 'voting' && board.status !== 'finished') {
        // Count my votes
        let myVotes = 0;
        if (board.columns && window.currentUser) {
            board.columns.forEach(col => {
                if (col.cards) {
                    col.cards.forEach(card => {
                        if (card.votes) {
                            myVotes += card.votes.filter(v => v.user_name === window.currentUser).length;
                        }
                    });
                }
            });
        }

        const remaining = board.vote_limit - myVotes;
        display.style.display = 'block';
        display.textContent = `${i18n.t('label.votes_remaining') || 'Votes Remaining'}: ${remaining} / ${board.vote_limit}`;

        if (remaining <= 0) {
            display.classList.add('limit-reached');
            display.style.borderColor = 'var(--danger)';
            display.style.color = 'var(--danger)';
        } else {
            display.classList.remove('limit-reached');
            display.style.borderColor = 'var(--primary)';
            display.style.color = 'var(--primary)';
        }
    } else {
        display.style.display = 'none';
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
                ${!isFinished && isBoardManager() ? `
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

    const isBlindVotingEnabled = window.currentBoard.phase === 'voting' && window.currentBoard.blind_voting;

    let voteControlsHTML = '';

    if (isBlindVotingEnabled) {
        voteControlsHTML = `
            <div class="vote-controls-blind">
                <span class="blind-vote-badge" title="${i18n.t('card.votes_hidden')}">${i18n.t('card.votes_hidden')}</span>
                ${!isFinished ? `<button class="vote-btn ${userVoted ? 'voted' : ''}" onclick="voteCard('${card.id}', 'like')">${userVoted ? i18n.t('card.remove_vote') : '👍 ' + i18n.t('card.vote')}</button>` : ''}
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
                mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="cancelSelection()">${i18n.t('btn.cancel')}</button>`;
            } else {
                mergeActionHTML = `<button class="btn btn-primary btn-small" onclick="mergeCard('${card.id}')">${i18n.t('btn.merge_here')}</button>`;
            }
        } else {
            mergeActionHTML = `<button class="btn btn-outline btn-small" onclick="selectCard('${card.id}')">${i18n.t('btn.select')}</button>`;
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
                <div class="action-owner" title="${i18n.t('action.owner')}">
                    👤 ${escapeHtml(card.owner || i18n.t('action.unassigned'))}
                </div>
                <div class="action-due-date ${isOverdue ? 'overdue' : ''}" title="${i18n.t('action.due_date')}">
                    📅 ${dueDate}
                </div>
                <div class="action-status">
                    <label class="action-completed-label" onclick="event.stopPropagation()">
                        <input type="checkbox" class="action-completed-checkbox" 
                            ${card.completed ? 'checked' : ''} 
                            onchange="this.checked ? markActionItemDone('${card.id}', false) : toggleActionItemCompletion('${card.id}', false)">
                        ${i18n.t('action.status_done')}
                    </label>
                </div>
                ${card.completed && (card.completion_link || card.completion_desc) ? `
                    <div class="action-completion-info" style="margin-top: 0.5rem; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 4px;">
                        ${card.completion_link ? `<div style="margin-bottom:4px;"><a href="${escapeHtml(card.completion_link)}" target="_blank" style="color: var(--accent-color); text-decoration: none; font-weight: 500;">🔗 ${i18n.t('action.link')}</a></div>` : ''}
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
    if (!confirm(i18n.t('confirm.delete_card'))) return;

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
    if (!confirm(i18n.t('confirm.delete_column'))) return;

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

    container.innerHTML = displayParticipants.map(p => {
        let badge = '';
        const isOwner = window.currentBoard && window.currentBoard.owner === p.username;
        const isCoOwner = window.currentBoard && window.currentBoard.co_owner === p.username;

        if (isOwner || isCoOwner) {
            badge += '<span class="role-badge" title="Access: Manager">👑</span>';
        }

        // Optimistic check for self, otherwise rely on server flag
        const isAdmin = p.is_admin || (p.username === window.currentUser && !!localStorage.getItem('adminToken'));
        if (isAdmin) {
            badge += '<span class="role-badge" title="Access: Admin">🛡️</span>';
        }

        let avatarHtml = p.avatar || '👤';
        // Detect if avatar is an image URL (Google Auth)
        if (avatarHtml && (avatarHtml.startsWith('http') || avatarHtml.startsWith('/') || avatarHtml.startsWith('data:'))) {
            avatarHtml = `<img src="${avatarHtml}" alt="${escapeHtml(p.username)}" class="participant-avatar-img" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }

        return `
        <div class="participant-avatar" title="${escapeHtml(p.username)}">
            ${avatarHtml}
            ${badge ? `<div class="participant-badges">${badge}</div>` : ''}
        </div>
    `}).join('');
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

// Dashboard Filtering Logic
document.addEventListener('DOMContentLoaded', () => {
    initDashboardFilters();
});

function initDashboardFilters() {
    const filterButtons = document.querySelectorAll('.filter-toggle');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Toggle active state
            btn.classList.toggle('active');
            applyDashboardFilters();
        });
    });

    const searchInput = document.getElementById('boardSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applyDashboardFilters);
    }

    // Clear filters
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('boardSearchInput').value = '';
            document.querySelectorAll('.filter-toggle').forEach(b => b.classList.remove('active'));
            applyDashboardFilters();
        });
    }
}

function applyDashboardFilters() {
    const activeFilters = Array.from(document.querySelectorAll('.filter-toggle.active')).map(btn => btn.dataset.filter);
    const searchTerm = document.getElementById('boardSearchInput')?.value.toLowerCase() || '';

    const boardCards = document.querySelectorAll('.board-card');
    let visibleCount = 0;

    boardCards.forEach(card => {
        let isVisible = true;

        // Text Search
        const name = card.querySelector('h3')?.innerText.toLowerCase() || '';
        if (searchTerm && !name.includes(searchTerm)) {
            isVisible = false;
        }

        // Category Filters
        // Note: Implementation depends on how we tag cards. 
        // Currently we rely on DOM classes or attributes.
        // We need to assume renderDashboard adds these attributes.
        // If not, we rely on best effort or defaults for now.

        if (isVisible && activeFilters.length > 0) {
            // Logic: OR condition between filters? Or AND? Typically OR for categories.
            // If "My Boards" AND "Team Boards" are selected, show boards that match EITHER.

            let matchesFilter = false;

            // Check for data attributes on the card (Need to ensure renderDashboard adds these)
            const isMyBoard = card.dataset.myBoard === 'true';
            const isParticipating = card.dataset.participating === 'true';
            const isTeamBoard = card.dataset.teamBoard === 'true';

            if (activeFilters.includes('myBoards') && isMyBoard) matchesFilter = true;
            if (activeFilters.includes('participant') && isParticipating) matchesFilter = true;
            if (activeFilters.includes('teamBoards') && isTeamBoard) matchesFilter = true;

            if (!matchesFilter) isVisible = false;
        }

        card.style.display = isVisible ? 'block' : 'none';
        if (isVisible) visibleCount++;
    });

    // Update empty state if needed
    const container = document.getElementById('activeBoards'); // or whatever container ID
    // ... logic to show "No boards found" if visibleCount === 0
}

// Make sure to expose it if needed, or just let the event listeners handle it.
window.initDashboardFilters = initDashboardFilters;
window.applyDashboardFilters = applyDashboardFilters;
window.stopParticipantPolling = stopParticipantPolling;
window.loadBoards = loadBoards;

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
        if (!confirm(i18n.t('confirm.reopen_action_item'))) {
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
        alert(i18n.t('alert.update_status_failed') || 'Failed to update status: ' + error.message);
        // Revert checkbox if failed
        await loadBoard(window.currentBoard.id);
    }
};

window.removeActionItem = async function () {
    const cardId = document.getElementById('actionItemCardId').value;
    if (!confirm(i18n.t('confirm.remove_action_item'))) return;

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
