// Action Items Dashboard Management
import { apiCall, sendWebSocketMessage } from './api.js';
import { boardController } from './controllers/BoardController.js';
import { i18n } from './i18n.js';
import { escapeHtml } from './utils.js';

export async function loadActionItemsView() {
    try {
        // Stop any board polling
        // Stop any board polling
        if (boardController) boardController.stopPolling();
        window.currentBoard = null;

        // Hide other views
        const dashboardView = document.getElementById('dashboardView');
        if (dashboardView) dashboardView.style.display = 'none';

        const boardContainer = document.getElementById('boardContainer');
        if (boardContainer) boardContainer.style.display = 'none';

        const adminView = document.getElementById('adminView');
        if (adminView) adminView.style.display = 'none';

        // Hide Team Views
        const teamsView = document.getElementById('teamsView');
        if (teamsView) teamsView.style.display = 'none';
        const teamDetailsView = document.getElementById('teamDetailsView');
        if (teamDetailsView) teamDetailsView.style.display = 'none';

        // Show Action Items View (we need to create this container in index.html)
        let container = document.getElementById('actionItemsView');
        if (!container) {
            console.error('Action Items container not found');
            return;
        }
        container.style.display = 'block';

        // Update Header Buttons
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'inline-block';

        const leaveBoardBtn = document.getElementById('leaveBoardBtn');
        if (leaveBoardBtn) leaveBoardBtn.style.display = 'none';

        const newBoardBtn = document.getElementById('newBoardBtn');
        if (newBoardBtn) newBoardBtn.style.display = 'none'; // Fix: Hide New Board button


        // Update URL hash
        if (window.location.hash !== '#action-items') {
            history.pushState(null, null, '#action-items');
        }

        await fetchAndRenderActionItems();

    } catch (error) {
        console.error('Failed to load action items view:', error);
    }
}

export async function fetchAndRenderActionItems(filter = 'pending') {
    const container = document.getElementById('actionItemsList');
    container.innerHTML = '<div class="loading-spinner">Loading...</div>'; // Can translate "Loading..." if needed, but it's transient


    try {
        // Build query
        let query = filter === 'completed' ? '?completed=true' : '?completed=false';
        // We could add owner filter later

        const items = await apiCall(`/action-items${query}`);
        renderActionItemsTable(items, filter);
    } catch (error) {
        container.innerHTML = `<div class="error-message">Failed to load items: ${error.message}</div>`;
    }
}

export function renderActionItemsTable(items, currentFilter) {
    const container = document.getElementById('actionItemsList');

    // Render Filter Tabs first
    let html = `
        <div class="page-controls">
            <div class="teams-nav-tabs">
                <button class="team-nav-tab ${currentFilter === 'pending' ? 'active' : ''}" 
                    onclick="fetchAndRenderActionItems('pending')">${i18n.t('action.pending')}</button>
                <button class="team-nav-tab ${currentFilter === 'completed' ? 'active' : ''}" 
                    onclick="fetchAndRenderActionItems('completed')">${i18n.t('action.completed')}</button>
            </div>
        </div>
    `;

    if (!items || items.length === 0) {
        html += `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <h3>${i18n.t('action.empty_title')}</h3>
                <p>${i18n.t('action.empty_desc')}</p>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    html += `
        <div class="table-responsive">
            <table class="action-items-table">
                <thead>
                    <tr>
                        <th>${i18n.t('action.status')}</th>
                        <th>${i18n.t('action.task')}</th>
                        <th>${i18n.t('action.board')}</th>
                        <th>${i18n.t('action.owner')}</th>
                        <th>${i18n.t('action.due_date')}</th>
                        <th>${i18n.t('action.done_date')}</th>
                        <th>${i18n.t('action.created')}</th>
                        <th>${i18n.t('action.actions')}</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : '-';
        const doneDate = item.completion_date ? new Date(item.completion_date).toLocaleDateString() : '-';
        const createdDate = new Date(item.created_at).toLocaleDateString();
        const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.completed;
        const statusClass = item.completed ? 'status-done' : (isOverdue ? 'status-overdue' : 'status-pending');
        const statusText = item.completed ? i18n.t('action.status_done') : (isOverdue ? i18n.t('action.status_overdue') : i18n.t('action.status_pending'));

        // Handle deleted boards
        let boardLink = `<a href="#board/${item.board_id}">${escapeHtml(item.board_name)}</a>`;
        if (item.board_deleted) {
            boardLink = `<span class="text-muted" title="${i18n.t('action.board_deleted_tooltip') || 'Board has been deleted'}">${escapeHtml(item.board_name)} <span class="badge badge-warning" style="font-size: 0.7em;">${i18n.t('action.deleted') || 'DELETED'}</span></span>`;
        }

        html += `
            <tr class="action-item-row ${item.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="task-content" title="${escapeHtml(item.content)}">
                    ${escapeHtml(item.content)}
                    ${item.completed && (item.completion_link || item.completion_desc) ?
                `<div class="completion-info">
                            ${item.completion_link ? `<a href="${item.completion_link}" target="_blank">🔗 ${i18n.t('action.link')}</a>` : ''}
                            ${item.completion_desc ? `<span title="${escapeHtml(item.completion_desc)}">📝 ${i18n.t('action.note')}</span>` : ''}
                         </div>`
                : ''}
                </td>
                <td>${boardLink}</td>
                <td><div class="owner-badge">👤 ${escapeHtml(item.owner || i18n.t('action.unassigned'))}</div></td>
                <td class="${isOverdue ? 'text-danger' : ''}">${dueDate}</td>
                <td class="text-muted">${doneDate}</td>
                <td class="text-muted">${createdDate}</td>
                <td>
                    ${!item.completed ?
                `<button class="btn btn-small btn-success" onclick="markActionItemDone('${item.id}', true)">${i18n.t('action.mark_done')}</button>` :
                `<div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-small btn-secondary" onclick="markActionItemUndone('${item.id}', '${currentFilter}')">${i18n.t('action.reopen')}</button>
                            ${(item.completion_link || item.completion_desc) ?
                    `<button class="btn btn-small btn-outline" onclick="openActionItemDetails('${item.id}', '${escapeHtml(item.completion_link || '')}', '${escapeHtml(item.completion_desc || '')}')">${i18n.t('action.details')}</button>`
                    : ''}
                        </div>`
            }
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

export function openCompleteActionItemModal(cardId, fromDashboard = false) {
    const modal = document.getElementById('completeActionItemModal');
    // Store if we came from dashboard to refresh it later
    window.actionItemSource = fromDashboard ? 'dashboard' : 'board';

    document.getElementById('completeActionItemId').value = cardId;

    // Default to Today
    document.getElementById('completeActionItemDate').value = new Date().toISOString().split('T')[0];

    // Clear previous values
    document.getElementById('completeActionItemLink').value = '';
    document.getElementById('completeActionItemDesc').value = '';

    if (modal) modal.style.display = 'block';
}

export async function submitActionItemCompletion(e) {
    e.preventDefault();
    const cardId = document.getElementById('completeActionItemId').value;
    const dateStr = document.getElementById('completeActionItemDate').value;
    const link = document.getElementById('completeActionItemLink').value;
    const desc = document.getElementById('completeActionItemDesc').value;

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', {
            completed: true,
            completion_date: dateStr ? new Date(dateStr).toISOString() : null,
            completion_link: link,
            completion_desc: desc
        });

        closeCompleteActionItemModal();

        // Refresh based on source
        if (window.actionItemSource === 'dashboard') {
            fetchAndRenderActionItems('pending');
        } else if (window.currentBoard || (boardController && boardController.boardId)) {
            // Refresh board to update UI
            boardController.loadBoardData();
        }
    } catch (error) {
        alert('Failed to complete item: ' + error.message);
    }
}

export function closeCompleteActionItemModal() {
    const modal = document.getElementById('completeActionItemModal');
    if (modal) modal.style.display = 'none';
}

export function openActionItemDetails(id, link, desc) {
    const modal = document.getElementById('actionItemDetailsModal');
    if (!modal) {
        alert("Details: \n" + link + "\n" + desc);
        return;
    }

    const linkContainer = document.getElementById('detailsLinkContainer');
    const linkEl = document.getElementById('detailsLink');
    const descEl = document.getElementById('detailsDesc');

    if (link && link !== 'null' && link !== 'undefined') {
        linkContainer.style.display = 'block';
        linkEl.href = link;
        linkEl.textContent = link;
    } else {
        linkContainer.style.display = 'none';
    }

    descEl.textContent = desc || 'No description provided.';
    modal.style.display = 'block';
}

export function closeActionItemDetailsModal() {
    const modal = document.getElementById('actionItemDetailsModal');
    if (modal) modal.style.display = 'none';
}

export async function markActionItemUndone(cardId, currentFilter) {
    try {
        await apiCall(`/cards/${cardId}`, 'PUT', { completed: false, completion_date: null });
        // Refresh list
        fetchAndRenderActionItems(currentFilter);
    } catch (error) {
        alert('Failed to update item: ' + error.message);
    }
}

// Action Item Management (For Board View)
export function openActionItemModal(cardId) {
    const modal = document.getElementById('actionItemModal');
    if (!modal) return;

    // Store card ID
    document.getElementById('actionItemCardId').value = cardId;

    // Populate Owners from current board participants if available
    const ownerSelect = document.getElementById('actionItemOwner');
    if (ownerSelect && boardController && boardController.board && boardController.board.participants) {
        ownerSelect.innerHTML = '<option value="">Unassigned</option>';
        boardController.board.participants.forEach(p => {
            const option = document.createElement('option');
            option.value = p.username; // Or ID? Using username for now as per schema likely
            option.textContent = p.display_name || p.username;
            ownerSelect.appendChild(option);
        });
    }

    // Try to pre-fill if card exists in board
    if (boardController && boardController.board) {
        const card = boardController.findCard(cardId);
        if (card) {
            if (ownerSelect) ownerSelect.value = card.owner || '';
            // If card has due_date, set it
            if (card.due_date) {
                document.getElementById('actionItemDueDate').value = new Date(card.due_date).toISOString().split('T')[0];
            } else {
                document.getElementById('actionItemDueDate').value = '';
            }
        }
    }

    modal.style.display = 'block';
}

export function closeActionItemModal() {
    const modal = document.getElementById('actionItemModal');
    if (modal) modal.style.display = 'none';
}

export async function saveActionItem() {
    const cardId = document.getElementById('actionItemCardId').value;
    const owner = document.getElementById('actionItemOwner').value;
    const dueDate = document.getElementById('actionItemDueDate').value;

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', {
            is_action_item: true,
            owner: owner || null, // If explicit owner field for AI overrides card owner? 
            // NOTE: 'owner' in card update usually refers to card creator. 
            // Action Item 'owner' might be 'assignee'.
            // Backend schema: 'owner' is usually creator. 
            // Do we have 'assignee'? 
            // Looking at `internal/models/card.go` (inferred):
            // Usually we assume 'owner' is the assignee for Action Items. 
            // Let's update 'owner'.
            owner: owner,
            due_date: dueDate ? new Date(dueDate).toISOString() : null
        });

        closeActionItemModal();
        if (boardController) boardController.loadBoardData();
    } catch (error) {
        alert('Failed to save action item: ' + error.message);
    }
}

export async function removeActionItem() {
    const cardId = document.getElementById('actionItemCardId').value;
    if (!confirm(i18n.t('confirm.remove_action_item') || 'Are you sure you want to remove this action item status?')) return;

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', {
            is_action_item: false,
            due_date: null
        });
        closeActionItemModal();
        if (boardController) boardController.loadBoardData();
    } catch (error) {
        alert('Failed to remove action item: ' + error.message);
    }
}


// Global Shims
window.loadActionItemsView = loadActionItemsView;
window.fetchAndRenderActionItems = fetchAndRenderActionItems;
window.renderActionItemsTable = renderActionItemsTable;
window.openCompleteActionItemModal = openCompleteActionItemModal;
window.markActionItemDone = openCompleteActionItemModal; // Alias for Action Items View context
window.submitActionItemCompletion = submitActionItemCompletion;
window.closeCompleteActionItemModal = closeCompleteActionItemModal;
window.openActionItemDetails = openActionItemDetails;
window.closeActionItemDetailsModal = closeActionItemDetailsModal;
window.markActionItemUndone = markActionItemUndone;

// New Modal Global Shims
window.openActionItemModal = openActionItemModal;
window.closeActionItemModal = closeActionItemModal;
window.saveActionItem = saveActionItem;
window.removeActionItem = removeActionItem;
