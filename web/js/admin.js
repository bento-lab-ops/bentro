// Admin Dashboard Management
import { apiCall } from './api.js';
import { boardController } from './controllers/BoardController.js';
import { joinBoard } from './api.js';
import { i18n } from './i18n.js';
import { openAdminBoardsModal, loadAdminBoards } from './admin-boards.js';
import { openAdminActionItemsModal, loadAdminActions } from './admin-actions.js';
import { openAdminUsersModal, loadAllUsers } from './admin-users.js';

export async function loadAdminView() {
    // ... unchanged ...
    // Refresh connection if on a board to update status
    if (boardController && boardController.boardId) {
        // Determine layout based on current hash to avoid view switching issues
        // If we are in admin view, we just stay there, but we send the websocket signal
        joinBoard(boardController.boardId, window.currentUser);
        boardController.loadBoardData(); // Refresh permissions
    }
    // Check if user is admin via JWT or has K8s admin token
    const token = localStorage.getItem('adminToken');
    const isJWTAdmin = window.currentUserRole === 'admin';

    // Hide other views
    const dashboardView = document.getElementById('dashboardView');
    if (dashboardView) dashboardView.style.display = 'none';
    const boardContainer = document.getElementById('boardContainer');
    if (boardContainer) boardContainer.style.display = 'none';
    const actionItemsView = document.getElementById('actionItemsView');
    if (actionItemsView) actionItemsView.style.display = 'none';

    // Hide Team Views
    const teamsView = document.getElementById('teamsView');
    if (teamsView) teamsView.style.display = 'none';
    const teamDetailsView = document.getElementById('teamDetailsView');
    if (teamDetailsView) teamDetailsView.style.display = 'none';

    const adminView = document.getElementById('adminView');
    if (!adminView) {
        console.error('Admin view container not found');
        return;
    }
    adminView.style.display = 'block';

    // Update Header
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'inline-block';

    const newBoardBtn = document.getElementById('newBoardBtn');
    if (newBoardBtn) newBoardBtn.style.display = 'none'; // Fix: Hide New Board button


    // Show dashboard if user is JWT admin or has K8s token
    if (isJWTAdmin || token) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
}

export function showAdminLogin() {
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

export async function handleAdminLogin(e) {
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

export async function showAdminDashboard() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-spinner">Loading admin data...</div>';

    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        const stats = await response.json();

        container.innerHTML = `
        <div class="page-container">
            <div class="page-hero">
                <h1 class="page-title">${i18n.t('admin.dashboard')}</h1>
                <p class="page-subtitle">System Overview & Management</p>
            </div>
            
            <div class="admin-section">
                <h4>System Statistics</h4>
                <div class="admin-stats-grid">
                    <div class="stat-card clickable" onclick="openAdminBoardsModal()" style="cursor: pointer;">
                        <span class="stat-value">${stats.boards.total}</span>
                        <span class="stat-label">${i18n.t('admin.stat_total_boards')}</span>
                    </div>

                    <div class="stat-card clickable" onclick="openAdminBoardsModal('active')" style="cursor: pointer;">
                        <span class="stat-value">${stats.boards.active}</span>
                        <span class="stat-label">${i18n.t('admin.stat_active_boards')}</span>
                    </div>
                    <div class="stat-card clickable" onclick="openAdminActionItemsModal()" style="cursor: pointer;">
                        <span class="stat-value">${stats.action_items.total}</span>
                        <span class="stat-label">${i18n.t('admin.stat_total_actions')}</span>
                    </div>
                    <div class="stat-card clickable" onclick="openAdminActionItemsModal()" style="cursor: pointer;">
                        <span class="stat-value">${stats.action_items.completed}</span>
                        <span class="stat-label">${i18n.t('admin.stat_completed_actions')}</span>
                    </div>
                    <div class="stat-card clickable" onclick="openAdminUsersModal()" style="cursor: pointer;">
                        <span class="stat-value">${stats.users || 0}</span>
                        <span class="stat-label">👥 ${i18n.t('admin.stat_total_users')}</span>
                    </div>
                    <div class="stat-card clickable" style="cursor: default;">
                        <span class="stat-value">${stats.teams ? stats.teams.total : 0}</span>
                        <span class="stat-label">🛡️ ${i18n.t('admin.stat_total_teams') || 'Total Teams'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    } catch (error) {
        console.error('Admin stats error:', error);
        container.innerHTML = `<div class="alert alert-danger">Failed to load admin dashboard: ${error.message}</div>`;
    }
}

export function logoutAdmin() {
    localStorage.removeItem('adminToken');
    showAdminLogin();
}

// Global Shims
window.loadAdminView = loadAdminView;
window.showAdminLogin = showAdminLogin;
window.handleAdminLogin = handleAdminLogin;
window.showAdminDashboard = showAdminDashboard;
window.logoutAdmin = logoutAdmin;
