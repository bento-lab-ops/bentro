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
        document.getElementById('dashboardBtn').style.display = 'inline-block';
        document.getElementById('leaveBoardBtn').style.display = 'none';

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
    container.innerHTML = '<div class="loading-spinner">Loading...</div>';

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

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <h3>No Action Items Found</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="action-items-controls">
            <div class="filter-tabs">
                <button class="filter-tab ${currentFilter === 'pending' ? 'active' : ''}" 
                    onclick="fetchAndRenderActionItems('pending')">Pending</button>
                <button class="filter-tab ${currentFilter === 'completed' ? 'active' : ''}" 
                    onclick="fetchAndRenderActionItems('completed')">Completed</button>
            </div>
        </div>
        <div class="table-responsive">
            <table class="action-items-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Task</th>
                        <th>Board</th>
                        <th>Owner</th>
                        <th>Due Date</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : '-';
        const createdDate = new Date(item.created_at).toLocaleDateString();
        const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.completed;
        const statusClass = item.completed ? 'status-done' : (isOverdue ? 'status-overdue' : 'status-pending');
        const statusText = item.completed ? 'Done' : (isOverdue ? 'Overdue' : 'Pending');

        html += `
            <tr class="action-item-row ${item.completed ? 'completed' : ''}">
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="task-content" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</td>
                <td><a href="#board/${item.board_id}" onclick="loadBoard('${item.board_id}')">${escapeHtml(item.board_name)}</a></td>
                <td><div class="owner-badge">👤 ${escapeHtml(item.owner || 'Unassigned')}</div></td>
                <td class="${isOverdue ? 'text-danger' : ''}">${dueDate}</td>
                <td class="text-muted">${createdDate}</td>
                <td>
                    ${!item.completed ?
                `<button class="btn btn-small btn-success" onclick="markActionItemDone('${item.id}', '${currentFilter}')">Mark Done</button>` :
                `<button class="btn btn-small btn-secondary" onclick="markActionItemUndone('${item.id}', '${currentFilter}')">Reopen</button>`
            }
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// Helper to toggle status from dashboard
async function markActionItemDone(cardId, currentFilter) {
    try {
        await apiCall(`/cards/${cardId}`, 'PUT', { completed: true });
        // Refresh list
        fetchAndRenderActionItems(currentFilter);
    } catch (error) {
        alert('Failed to update item: ' + error.message);
    }
}

async function markActionItemUndone(cardId, currentFilter) {
    try {
        await apiCall(`/cards/${cardId}`, 'PUT', { completed: false });
        // Refresh list
        fetchAndRenderActionItems(currentFilter);
    } catch (error) {
        alert('Failed to update item: ' + error.message);
    }
}
