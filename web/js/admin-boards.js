// Admin Board Management Logic

let allBoards = [];

function openAdminBoardsModal(initialFilter = 'all') {
    const modal = document.getElementById('adminBoardsModal');
    if (modal) {
        modal.style.display = 'block';

        // Set filter dropdown
        const filterSelect = document.getElementById('adminBoardFilter');
        if (filterSelect) {
            filterSelect.value = initialFilter;
        }

        loadAdminBoards();
    }
}

function closeAdminBoardsModal() {
    document.getElementById('adminBoardsModal').style.display = 'none';
}

async function loadAdminBoards() {
    const tbody = document.getElementById('adminBoardsList');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading-spinner"></div> Loading boards...</td></tr>';

    try {
        const response = await fetch('/api/boards');
        if (!response.ok) throw new Error('Failed to fetch boards');

        // Note: The public ListBoards API might filter out deleted boards depending on implementation.
        // For admin purposes, we might need a specific endpoint if we want to see EVERYTHING including deleted.
        // But per current handler, it shows all non-deleted. Admin delete is soft delete.
        // If we want to restore deleted boards, we need a new endpoint.
        // For now, let's work with active/finished boards.

        allBoards = await response.json();
        // Determine if we should filter immediately or show all
        // Check current filter state
        filterAdminBoards();
    } catch (error) {
        console.error('Error loading boards:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center class="text-danger">Failed to load boards: ${error.message}</td></tr>`;
    }
}

function renderAdminBoards(boards) {
    const tbody = document.getElementById('adminBoardsList');
    tbody.innerHTML = '';

    if (boards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No boards found</td></tr>';
        return;
    }

    boards.forEach(board => {
        const tr = document.createElement('tr');

        // Status Badge
        const statusBadge = board.status === 'active'
            ? `<span class="badge badge-success">Active</span>`
            : `<span class="badge badge-secondary">Finished</span>`;

        // Duration Calculation
        let durationText = '-';
        const created = new Date(board.created_at);

        if (board.status === 'active') {
            const now = new Date();
            const diff = now - created;
            durationText = `Active for ${formatDuration(diff)}`;
        } else if (board.finished_at) {
            const finished = new Date(board.finished_at);
            const diff = finished - created;
            durationText = `Ran for ${formatDuration(diff)}`;
        } else {
            // Fallback for old finished boards without finished_at
            durationText = 'Finished (legacy)';
        }

        // Actions
        let actionButtons = '';
        if (board.status === 'active') {
            actionButtons += `<button class="btn btn-warning btn-sm" onclick="handleToggleBoardStatus('${board.id}', 'finished')" title="Finish Board">Finish</button> `;
        } else {
            actionButtons += `<button class="btn btn-success btn-sm" onclick="handleToggleBoardStatus('${board.id}', 'active')" title="Reopen Board">Reopen</button> `;
        }

        actionButtons += `<button class="btn btn-danger btn-sm" onclick="handleDeleteBoard('${board.id}', '${board.name}')" title="Delete Board">🗑️</button>`;

        tr.innerHTML = `
            <td><strong>${board.name}</strong></td>
            <td>${board.owner || '<em>Unclaimed</em>'}</td>
            <td>${statusBadge}</td>
            <td>${new Date(board.created_at).toLocaleDateString()}</td>
            <td><small>${durationText}</small></td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Just now';
}

function filterAdminBoards() {
    const searchTerm = document.getElementById('adminBoardSearch').value.toLowerCase();
    const statusFilter = document.getElementById('adminBoardFilter').value;

    const filtered = allBoards.filter(board => {
        const matchesSearch = board.name.toLowerCase().includes(searchTerm) ||
            (board.owner && board.owner.toLowerCase().includes(searchTerm));
        const matchesStatus = statusFilter === 'all' || board.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderAdminBoards(filtered);
}

async function handleToggleBoardStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to change status to ${newStatus.toUpperCase()}?`)) return;

    try {
        const response = await fetch(`/api/admin/boards/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update status');

        loadAdminBoards(); // Refresh list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function handleDeleteBoard(id, name) {
    if (!confirm(`Are you sure you want to DELETE board "${name}"?\nThis action cannot be undone.`)) return;

    try {
        const response = await fetch(`/api/admin/boards/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete board');

        loadAdminBoards(); // Refresh list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
