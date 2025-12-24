// Action Items Dashboard Management

async function loadActionItemsView() {
    try {
        // Stop any board polling
        stopParticipantPolling();
        window.currentBoard = null;

        // Hide other views
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('boardContainer').style.display = 'none';

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

        // Update URL hash
        if (window.location.hash !== '#action-items') {
            history.pushState(null, null, '#action-items');
        }

        await fetchAndRenderActionItems();

    } catch (error) {
        console.error('Failed to load action items view:', error);
    }
}

async function fetchAndRenderActionItems(filter = 'pending') {
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

function renderActionItemsTable(items, currentFilter) {
    const container = document.getElementById('actionItemsList');

    // Render Filter Tabs first
    let html = `
        <div class="action-items-controls">
            <div class="filter-tabs">
                <button class="filter-tab ${currentFilter === 'pending' ? 'active' : ''}" 
                    onclick="fetchAndRenderActionItems('pending')">${i18n.t('action.pending')}</button>
                <button class="filter-tab ${currentFilter === 'completed' ? 'active' : ''}" 
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

        html += `
            <tr class="action-item-row ${item.completed ? 'completed' : ''}">
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
                <td><a href="#board/${item.board_id}">${escapeHtml(item.board_name)}</a></td>
                <td><div class="owner-badge">👤 ${escapeHtml(item.owner || i18n.t('action.unassigned'))}</div></td>
                <td class="${isOverdue ? 'text-danger' : ''}">${dueDate}</td>
                <td class="text-muted">${doneDate}</td>
                <td class="text-muted">${createdDate}</td>
                <td>
                    ${!item.completed ?
                `<button class="btn btn-small btn-success" onclick="markActionItemDone('${item.id}', '${currentFilter}')">${i18n.t('action.mark_done')}</button>` :
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

// Helper to toggle status from dashboard
// Helper to toggle status from dashboard
// Make global for board.js access
window.markActionItemDone = function (cardId, fromDashboard = false) {
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
};

window.submitActionItemCompletion = async function (e) {
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

        window.closeCompleteActionItemModal();

        // Refresh based on source
        if (window.actionItemSource === 'dashboard') {
            fetchAndRenderActionItems('pending');
        } else if (window.currentBoard) {
            // Refresh board to update UI
            loadBoard(window.currentBoard.id);
            if (typeof sendWebSocketMessage === 'function') {
                sendWebSocketMessage('board_update', { board_id: window.currentBoard.id });
            }
        }
    } catch (error) {
        alert('Failed to complete item: ' + error.message);
    }
};

window.closeCompleteActionItemModal = function () {
    const modal = document.getElementById('completeActionItemModal');
    if (modal) modal.style.display = 'none';
};

window.openActionItemDetails = function (id, link, desc) {
    const modal = document.getElementById('actionItemDetailsModal');
    if (!modal) {
        alert("Details: \n" + link + "\n" + desc);
        return;
    }

    const linkContainer = document.getElementById('detailsLinkContainer');
    const linkEl = document.getElementById('detailsLink');
    const descEl = document.getElementById('detailsDesc');

    if (link) {
        linkContainer.style.display = 'block';
        linkEl.href = link;
        linkEl.textContent = link;
    } else {
        linkContainer.style.display = 'none';
    }

    descEl.textContent = desc || 'No description provided.';
    modal.style.display = 'block';
};

window.closeActionItemDetailsModal = function () {
    const modal = document.getElementById('actionItemDetailsModal');
    if (modal) modal.style.display = 'none';
};

window.markActionItemUndone = async function (cardId, currentFilter) {
    try {
        await apiCall(`/cards/${cardId}`, 'PUT', { completed: false, completion_date: null });
        // Refresh list
        fetchAndRenderActionItems(currentFilter);
    } catch (error) {
        alert('Failed to update item: ' + error.message);
    }
};
