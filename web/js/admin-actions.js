// Admin Action Items Logic
import { i18n } from './i18n.js';
import { apiCall } from './api.js';
import { escapeHtml } from './utils.js';

let allActions = [];

export function openAdminActionItemsModal() {
    const modal = document.getElementById('adminActionItemsModal');
    if (modal) {
        modal.style.display = 'block';
        loadAdminActions();
    }
}

export function closeAdminActionItemsModal() {
    document.getElementById('adminActionItemsModal').style.display = 'none';
}

export async function loadAdminActions() {
    const tbody = document.getElementById('adminActionsList');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading-spinner"></div> Loading actions...</td></tr>';

    try {
        const response = await fetch('/api/admin/actions');
        if (!response.ok) throw new Error('Failed to fetch action items');

        allActions = await response.json();
        filterAdminActions();
    } catch (error) {
        console.error('Error loading actions:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center class="text-danger">Failed to load actions: ${error.message}</td></tr>`;
    }
}

export function renderAdminActions(actions) {
    const tbody = document.getElementById('adminActionsList');
    tbody.innerHTML = '';

    if (actions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No action items found</td></tr>';
        return;
    }

    actions.forEach(item => {
        const tr = document.createElement('tr');
        const boardName = item.board_name || 'Unknown Board';
        const isCompleted = item.completed;
        const statusBadge = isCompleted
            ? `<span class="badge badge-success">Completed</span>`
            : `<span class="badge badge-warning">Pending</span>`;

        // Actions: Delete only for now? Or toggle status?
        // Let's allow Delete.
        const actionButtons = `
            <button class="btn btn-danger btn-sm" onclick="handleDeleteAdminAction('${item.id}')" title="Delete Item">🗑️</button>
        `;

        tr.innerHTML = `
            <td title="${escapeHtml(item.content)}">${escapeHtml(item.content).substring(0, 50)}${item.content.length > 50 ? '...' : ''}</td>
            <td>${escapeHtml(boardName)}</td>
            <td>${escapeHtml(item.owner || '-')}</td>
            <td>${statusBadge}</td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function filterAdminActions() {
    const searchTerm = document.getElementById('adminActionSearch').value.toLowerCase();
    const statusFilter = document.getElementById('adminActionFilter').value;

    const filtered = allActions.filter(item => {
        const matchesSearch = item.content.toLowerCase().includes(searchTerm) ||
            (item.owner && item.owner.toLowerCase().includes(searchTerm)) ||
            (item.board_name && item.board_name.toLowerCase().includes(searchTerm));

        let matchesStatus = true;
        if (statusFilter === 'pending') matchesStatus = !item.completed;
        if (statusFilter === 'completed') matchesStatus = item.completed;

        return matchesSearch && matchesStatus;
    });

    renderAdminActions(filtered);
}

export async function handleDeleteAdminAction(id) {
    if (!confirm('Are you sure you want to delete this action item?')) return;

    try {
        await apiCall(`/cards/${id}`, 'DELETE');
        // Refresh
        loadAdminActions();
    } catch (error) {
        alert('Failed to delete item: ' + error.message);
    }
}

// Global Shims
window.openAdminActionItemsModal = openAdminActionItemsModal;
window.closeAdminActionItemsModal = closeAdminActionItemsModal;
window.loadAdminActions = loadAdminActions;
window.renderAdminActions = renderAdminActions;
window.filterAdminActions = filterAdminActions;
window.handleDeleteAdminAction = handleDeleteAdminAction;
