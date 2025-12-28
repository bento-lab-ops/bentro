// Admin Action Items Management Logic

let allActions = [];
let currentEditActionId = null;

function openAdminActionsModal() {
    const modal = document.getElementById('adminActionsModal');
    if (modal) {
        modal.style.display = 'block';
        loadAdminActions();
    }
}

function closeAdminActionsModal() {
    document.getElementById('adminActionsModal').style.display = 'none';
}

async function loadAdminActions() {
    const tbody = document.getElementById('adminActionsList');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading-spinner"></div> Loading items...</td></tr>';

    try {
        const response = await fetch('/api/admin/action-items'); // Can reuse public if same logic, or use new admin if specialized
        // Assuming we registered GET /admin/action-items -> reusing public handler for now or dedicated one
        // Wait, main.go didn't register GET /admin/action-items, it commented "reusing existing public".
        // Let's use public endpoint: /api/action-items

        const res = await fetch('/api/action-items');
        if (!res.ok) throw new Error('Failed to fetch action items');

        allActions = await res.json();
        renderAdminActions(allActions);
    } catch (error) {
        console.error('Error loading actions:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load actions: ${error.message}</td></tr>`;
    }
}

function renderAdminActions(items) {
    const tbody = document.getElementById('adminActionsList');
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No action items found</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');

        // Calculate Overdue
        const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.completed;
        let statusClass = 'status-pending';
        let statusText = 'Pending';

        if (item.completed) {
            statusClass = 'status-done';
            statusText = 'Done';
            tr.classList.add('completed');
        } else if (isOverdue) {
            statusClass = 'status-overdue';
            statusText = 'Overdue';
            tr.classList.add('overdue');
        } else {
            statusClass = 'status-pending';
            statusText = 'Pending';
        }

        tr.classList.add('action-item-row'); // Apply base style

        // Status Badge
        const statusBadge = `<span class="badge ${statusClass}">${statusText}</span>`;

        // Deleted Board Badge
        const boardName = item.board_deleted
            ? `${item.board_name} <span class="badge badge-danger" style="font-size:0.6em">DELETED</span>`
            : item.board_name;

        tr.innerHTML = `
            <td><div style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</div></td>
            <td><small>${boardName}</small></td>
            <td>${escapeHtml(item.owner || '-')}</td>
            <td><strong>${escapeHtml(item.owner || '-')}</strong></td> <!-- Assignee is curr owner -->
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openActionItemDetails('${item.id}', '${item.board_id}')" title="Details">📄</button>
                <button class="btn btn-outline btn-sm" onclick="openAdminEditActionModal('${item.id}')" title="Edit">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="handleAdminDeleteAction('${item.id}')" title="Delete">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAdminActions() {
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

// Edit Modal Functions
function openAdminEditActionModal(itemId) {
    const item = allActions.find(i => i.id === itemId);
    if (!item) return;

    currentEditActionId = itemId;
    document.getElementById('editActionId').value = itemId;
    document.getElementById('editActionContent').value = item.content;
    document.getElementById('editActionOwner').value = item.owner;
    document.getElementById('editActionStatus').value = item.completed ? 'true' : 'false';

    // Populate completion details
    document.getElementById('editActionLink').value = item.completion_link || '';
    document.getElementById('editActionDesc').value = item.completion_desc || '';

    toggleAdminCompletionFields();

    document.getElementById('adminEditActionModal').style.display = 'block';
}

function toggleAdminCompletionFields() {
    const status = document.getElementById('editActionStatus').value;
    const fieldsDiv = document.getElementById('adminCompletionFields');
    if (status === 'true') {
        fieldsDiv.style.display = 'block';
    } else {
        fieldsDiv.style.display = 'none';
    }
}

function closeAdminEditActionModal() {
    document.getElementById('adminEditActionModal').style.display = 'none';
    currentEditActionId = null;
}

async function handleAdminUpdateAction(e) {
    e.preventDefault();
    if (!currentEditActionId) return;

    const content = document.getElementById('editActionContent').value;
    const owner = document.getElementById('editActionOwner').value;
    const status = document.getElementById('editActionStatus').value === 'true';
    const link = document.getElementById('editActionLink').value;
    const desc = document.getElementById('editActionDesc').value;

    const payload = {
        content,
        owner,
        completed: status
    };

    if (status) {
        payload.completion_link = link;
        payload.completion_desc = desc;
    }

    try {
        const response = await fetch(`/api/admin/action-items/${currentEditActionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to update item');

        closeAdminEditActionModal();
        loadAdminActions(); // Refresh list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function handleAdminDeleteAction(id) {
    if (!confirm('Are you sure you want to delete this action item?')) return;

    try {
        const response = await fetch(`/api/admin/action-items/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete item');

        loadAdminActions(); // Refresh list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
