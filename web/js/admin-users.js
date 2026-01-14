// Admin User Management Functions
import { i18n } from './i18n.js';
import { escapeHtml } from './utils.js';

export async function openAdminUsersModal() {
    const modal = document.getElementById('adminUsersModal');
    if (!modal) {
        console.error('Admin Users Modal not found');
        return;
    }

    modal.style.display = 'block';
    await loadAllUsers();

    // Refresh i18n
    if (window.i18n) {
        window.i18n.updatePage();
    }
}

export function closeAdminUsersModal() {
    const modal = document.getElementById('adminUsersModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export async function loadAllUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const users = await response.json();
        renderUsersTable(users);
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users: ' + error.message);
    }
}

export function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 0.75rem; font-size: 1.5rem;">${user.avatar_url || '👤'}</td>
            <td style="padding: 0.75rem;">${escapeHtml(user.display_name)}</td>
            <td style="padding: 0.75rem;">${escapeHtml(user.email)}</td>
            <td style="padding: 0.75rem;">
                <select 
                    onchange="updateUserRole('${user.id}', this.value, '${escapeHtml(user.display_name)}')"
                    style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-light); color: var(--text-primary);"
                    ${user.id === window.currentUserId ? 'disabled' : ''}
                >
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td style="padding: 0.75rem; text-align: center;">
                <button 
                    class="btn btn-outline btn-small" 
                    onclick="resetUserPassword('${user.id}', '${escapeHtml(user.display_name)}')"
                    ${user.id === window.currentUserId ? 'disabled' : ''}
                    style="margin-right: 0.5rem;"
                >
                    🔄 Reset
                </button>
                <button 
                    class="btn btn-danger btn-small" 
                    onclick="deleteUser('${user.id}', '${escapeHtml(user.display_name)}')"
                    ${user.id === window.currentUserId ? 'disabled' : ''}
                >
                    🗑️ Delete
                </button>
            </td>
        </tr>
    `).join('');
}

export async function updateUserRole(userId, newRole, userName) {
    if (!confirm(`Change ${userName}'s role to ${newRole}?`)) {
        // Reload to reset dropdown
        await loadAllUsers();
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role: newRole })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update role');
        }

        alert(`Successfully changed ${userName}'s role to ${newRole}`);
        await loadAllUsers();
    } catch (error) {
        console.error('Error updating role:', error);
        alert('Failed to update role: ' + error.message);
        await loadAllUsers();
    }
}

export async function resetUserPassword(userId, userName) {
    if (!confirm(`Reset password for ${userName}?\n\nThe password will be reset to "bentro" and the user will be required to change it on next login.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reset password');
        }

        alert(`Password reset successfully for ${userName}!\n\nNew password: "bentro"\nUser will be required to change it on next login.`);
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Failed to reset password: ' + error.message);
    }
}

export async function deleteUser(userId, userName) {
    if (!confirm(`⚠️ DELETE USER: ${userName}?\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) {
        return;
    }

    // Double confirmation
    if (!confirm(`Final confirmation: Delete ${userName}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }

        alert(`User ${userName} has been deleted successfully.`);
        await loadAllUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user: ' + error.message);
    }
}

// Expose functions to window
window.openAdminUsersModal = openAdminUsersModal;
window.closeAdminUsersModal = closeAdminUsersModal;
window.loadAllUsers = loadAllUsers;
window.updateUserRole = updateUserRole;
window.resetUserPassword = resetUserPassword;
window.deleteUser = deleteUser;
