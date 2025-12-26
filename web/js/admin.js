// Admin Dashboard Management

async function loadAdminView() {
    // Check if we have a token
    const token = localStorage.getItem('adminToken');

    // Hide other views
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('boardContainer').style.display = 'none';
    document.getElementById('actionItemsView').style.display = 'none';

    const adminView = document.getElementById('adminView');
    if (!adminView) {
        console.error('Admin view container not found');
        return;
    }
    adminView.style.display = 'block';

    // Update Header
    document.getElementById('dashboardBtn').style.display = 'inline-block';

    if (token) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
}

function showAdminLogin() {
    const container = document.getElementById('adminContent');
    container.innerHTML = `
        <div class="admin-login-card">
            <h3>${i18n.t('admin.title')}</h3>
            <p>${i18n.t('admin.enter_pass')}</p>
            <form id="adminLoginForm" onsubmit="handleAdminLogin(event)">
                <input type="password" id="adminPassword" placeholder="${i18n.t('label.password') || 'Password'}" class="form-input" required>
                <button type="submit" class="btn btn-primary">${i18n.t('btn.login') || 'Login'}</button>
            </form>
        </div>
    `;
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('adminToken', data.token);

            // Refresh connection if on a board to update status
            if (window.currentBoard && window.currentUser) {
                // Determine layout based on current hash to avoid view switching issues
                // If we are in admin view, we just stay there, but we send the websocket signal
                joinBoard(window.currentBoard.id, window.currentUser);
                loadBoard(window.currentBoard.id); // Refresh permissions
            }

            showAdminDashboard();
        } else {
            alert(i18n.t('admin.invalid_pass'));
        }
    } catch (error) {
        alert(i18n.t('admin.login_failed') + ': ' + error.message);
    }
}

async function showAdminDashboard() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-spinner">Loading admin data...</div>';

    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        const stats = await response.json();

        container.innerHTML = `
        <div class="admin-dashboard">
            <div class="admin-header">
                <h3>${i18n.t('admin.dashboard')}</h3>
                <button onclick="logoutAdmin()" class="btn btn-outline btn-sm">${i18n.t('menu.logout')}</button>
            </div>
            
            <div class="admin-section">
                <h4>Verified Access</h4>
                <div class="alert alert-success">${i18n.t('admin.connection_secure')} - <small>Mode: ${window.location.protocol}</small></div>
            </div>

            <div class="admin-section">
                <h4>System Statistics</h4>
                <div class="admin-stats-grid">
                    <div class="stat-card">
                        <span class="stat-value">${stats.boards.total}</span>
                        <span class="stat-label">${i18n.t('admin.stat_total_boards')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${stats.boards.active}</span>
                        <span class="stat-label">${i18n.t('admin.stat_active_boards')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${stats.action_items.total}</span>
                        <span class="stat-label">${i18n.t('admin.stat_total_actions')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${stats.action_items.completed}</span>
                        <span class="stat-label">${i18n.t('admin.stat_completed_actions')}</span>
                    </div>
                </div>
            </div>

            <div class="admin-section">
                <h4>${i18n.t('admin.board_management')}</h4>
                <p>${i18n.t('admin.board_management_desc')}</p>
            </div>
        </div>
    `;

    } catch (error) {
        console.error('Admin stats error:', error);
        container.innerHTML = `<div class="alert alert-danger">Failed to load admin dashboard: ${error.message}</div>`;
    }
}

function logoutAdmin() {
    localStorage.removeItem('adminToken');
    showAdminLogin();
}

// End of admin.js
