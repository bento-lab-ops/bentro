import { apiCall } from '../api.js';
import { i18n } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { boardController } from './BoardController.js';

export class ActionItemsController {
    constructor() {
        this.actionItemSource = null; // 'dashboard' or 'board'
    }

    // --- View Logic ---

    async showView() {
        // Stop polling on board if active
        if (boardController) boardController.stopPolling();
        window.currentBoard = null;

        // Hide other views
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('boardContainer').style.display = 'none';
        const adminView = document.getElementById('adminView');
        if (adminView) adminView.style.display = 'none';
        document.getElementById('teamsView').style.display = 'none';
        document.getElementById('teamDetailsView').style.display = 'none';

        // Show View
        const container = document.getElementById('actionItemsView');
        if (!container) return; // Should exist
        container.style.display = 'block';

        // Update Header
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'inline-block';
        const leaveBtn = document.getElementById('leaveBoardBtn');
        if (leaveBtn) leaveBtn.style.display = 'none';
        const newBoardBtn = document.getElementById('newBoardBtn');
        if (newBoardBtn) newBoardBtn.style.display = 'none';

        // Update Hash
        if (window.location.hash !== '#action-items') {
            history.pushState(null, null, '#action-items');
        }

        await this.fetchAndRender('pending');
    }

    async fetchAndRender(filter = 'pending') {
        const container = document.getElementById('actionItemsList');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner">Loading...</div>';

        try {
            const query = filter === 'completed' ? '?completed=true' : '?completed=false';
            const items = await apiCall(`/action-items${query}`);
            this.renderTable(items, filter);
        } catch (error) {
            container.innerHTML = `<div class="error-message">Failed to load items: ${error.message}</div>`;
        }
    }

    renderTable(items, currentFilter) {
        const container = document.getElementById('actionItemsList');

        // Tabs
        let html = `
            <div class="page-controls">
                <div class="teams-nav-tabs">
                    <button class="team-nav-tab ${currentFilter === 'pending' ? 'active' : ''}" 
                        onclick="actionItemsController.fetchAndRender('pending')">${i18n.t('action.pending') || 'Pending'}</button>
                    <button class="team-nav-tab ${currentFilter === 'completed' ? 'active' : ''}" 
                        onclick="actionItemsController.fetchAndRender('completed')">${i18n.t('action.completed') || 'Completed'}</button>
                </div>
            </div>
        `;

        if (!items || items.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">🎉</div>
                    <h3>${i18n.t('action.empty_title') || 'No Action Items'}</h3>
                    <p>${i18n.t('action.empty_desc') || 'You are all caught up!'}</p>
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
                            <th>${i18n.t('action.status') || 'Status'}</th>
                            <th>${i18n.t('action.task') || 'Task'}</th>
                            <th>${i18n.t('action.board') || 'Board'}</th>
                            <th>${i18n.t('action.owner') || 'Owner'}</th>
                            <th>${i18n.t('action.due_date') || 'Due Date'}</th>
                            <th>${i18n.t('action.done_date') || 'Completed'}</th>
                            <th>${i18n.t('action.created') || 'Created'}</th>
                            <th>${i18n.t('action.actions') || 'Actions'}</th>
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
            const statusText = item.completed
                ? (i18n.t('action.status_done') || 'Done')
                : (isOverdue ? (i18n.t('action.status_overdue') || 'Overdue') : (i18n.t('action.status_pending') || 'Pending'));

            let boardLink = `<a href="#board/${item.board_id}">${escapeHtml(item.board_name)}</a>`;
            if (item.board_deleted) {
                boardLink = `<span class="text-muted" title="Board deleted">${escapeHtml(item.board_name)} <span class="badge badge-warning">DELETED</span></span>`;
            }

            html += `
                <tr class="action-item-row ${item.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="task-content" title="${escapeHtml(item.content)}">
                        ${escapeHtml(item.content)}
                        ${item.completed && (item.completion_link || item.completion_desc) ?
                    `<div class="completion-info">
                                ${item.completion_link ? `<a href="${item.completion_link}" target="_blank">🔗 Link</a>` : ''}
                                ${item.completion_desc ? `<span title="${escapeHtml(item.completion_desc)}">📝 Note</span>` : ''}
                             </div>`
                    : ''}
                    </td>
                    <td>${boardLink}</td>
                    <td><div class="owner-badge">👤 ${escapeHtml(item.owner || 'Unassigned')}</div></td>
                    <td class="${isOverdue ? 'text-danger' : ''}">${dueDate}</td>
                    <td class="text-muted">${doneDate}</td>
                    <td class="text-muted">${createdDate}</td>
                    <td>
                        ${!item.completed ?
                    `<button class="btn btn-small btn-success" onclick="actionItemsController.openCompleteModal('${item.id}', true)">Complete</button>` :
                    `<div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-small btn-secondary" onclick="actionItemsController.markUndone('${item.id}', '${currentFilter}')">Reopen</button>
                                ${(item.completion_link || item.completion_desc) ?
                        `<button class="btn btn-small btn-outline" onclick="actionItemsController.openDetails('${item.id}', '${escapeHtml(item.completion_link || '')}', '${escapeHtml(item.completion_desc || '')}')">Details</button>`
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

    // --- Actions ---

    async markUndone(cardId, currentFilter) {
        try {
            await apiCall(`/cards/${cardId}`, 'PUT', { completed: false, completion_date: null });
            this.fetchAndRender(currentFilter);
        } catch (error) {
            await window.showAlert('Error', 'Failed to update item: ' + error.message);
        }
    }

    // --- Modals: Complete ---

    openCompleteModal(cardId, fromDashboard = false) {
        const modal = document.getElementById('completeActionItemModal');
        this.actionItemSource = fromDashboard ? 'dashboard' : 'board';

        document.getElementById('completeActionItemId').value = cardId;
        document.getElementById('completeActionItemDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('completeActionItemLink').value = '';
        document.getElementById('completeActionItemDesc').value = '';

        if (modal) modal.style.display = 'block';
    }

    closeCompleteModal() {
        const modal = document.getElementById('completeActionItemModal');
        if (modal) modal.style.display = 'none';
    }

    async handleCompleteSubmit(e) {
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

            this.closeCompleteModal();

            if (this.actionItemSource === 'dashboard') {
                this.fetchAndRender('pending');
            } else if (boardController && boardController.boardId) {
                boardController.loadBoardData();
            }
        } catch (error) {
            await window.showAlert('Error', 'Failed to complete: ' + error.message);
        }
    }

    // --- Modals: Details ---

    openDetails(id, link, desc) {
        const modal = document.getElementById('actionItemDetailsModal');
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
        if (modal) modal.style.display = 'block';
    }

    closeDetails() {
        const modal = document.getElementById('actionItemDetailsModal');
        if (modal) modal.style.display = 'none';
    }

    // --- Modals: Edit (Board Context) ---

    openEditModal(cardId) {
        const modal = document.getElementById('actionItemModal');
        if (!modal) return;

        document.getElementById('actionItemCardId').value = cardId;

        // Populate Owners
        const ownerSelect = document.getElementById('actionItemOwner');
        if (ownerSelect && boardController && boardController.board && boardController.board.participants) {
            ownerSelect.innerHTML = '<option value="">Unassigned</option>';
            boardController.board.participants.forEach(p => {
                const option = document.createElement('option');
                option.value = p.username;
                option.textContent = p.display_name || p.username;
                ownerSelect.appendChild(option);
            });
        }

        // Pre-fill
        let card = null;
        if (boardController) {
            card = boardController.findCard(cardId);
            if (card) {
                if (ownerSelect) ownerSelect.value = card.owner || '';
                if (card.due_date) {
                    document.getElementById('actionItemDueDate').value = new Date(card.due_date).toISOString().split('T')[0];
                } else {
                    document.getElementById('actionItemDueDate').value = '';
                }
            }
        }

        const removeBtn = document.querySelector('#actionItemModal .btn-danger');
        if (removeBtn) {
            removeBtn.style.display = (card && card.is_action_item) ? 'block' : 'none';
        }

        // Ensure translations are applied if i18n is available
        if (window.i18n && window.i18n.translatePage) {
            window.i18n.translatePage();
        }

        modal.style.display = 'block';
    }

    closeEditModal() {
        const modal = document.getElementById('actionItemModal');
        if (modal) modal.style.display = 'none';
    }

    async handleSave() {
        const cardId = document.getElementById('actionItemCardId').value;
        const owner = document.getElementById('actionItemOwner').value;
        const dueDate = document.getElementById('actionItemDueDate').value;

        try {
            await apiCall(`/cards/${cardId}`, 'PUT', {
                is_action_item: true,
                owner: owner || null,
                due_date: dueDate ? new Date(dueDate).toISOString() : null
            });

            this.closeEditModal();
            if (boardController) boardController.loadBoardData();
        } catch (error) {
            await window.showAlert('Error', error.message);
        }
    }

    async handleRemove() {
        const cardId = document.getElementById('actionItemCardId').value;
        if (!await window.showConfirm('Remove Action Item', 'Are you sure you want to revert this to a normal card?')) return;

        try {
            await apiCall(`/cards/${cardId}`, 'PUT', {
                is_action_item: false,
                due_date: null
            });
            this.closeEditModal();
            if (boardController) boardController.loadBoardData();
        } catch (error) {
            await window.showAlert('Error', error.message);
        }
    }
}

export const actionItemsController = new ActionItemsController();

// Expose for HTML OnClick
window.actionItemsController = actionItemsController;

// Compatibility shims if needed, but we should update HTML to use controller directly where possible
// For dynamic HTML generated by this controller, we use actionItemsController.method()
