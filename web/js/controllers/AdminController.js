import { joinBoard } from '../api.js';
import { i18n } from '../i18n.js';
import { boardController } from './BoardController.js';

// Sub-modules (keeping as helpers for now)
import { openAdminBoardsModal } from '../admin-boards.js';
import { openAdminActionItemsModal } from '../admin-actions.js';
import { openAdminUsersModal } from '../admin-users.js';

export class AdminController {
    constructor() {
        // State is mostly managed by DOM/API for Admin view currently
    }

    // --- View Logic ---

    async showView() {
        // Refresh connection if on a board to update status
        if (boardController && boardController.boardId) {
            // Determine layout based on current hash to avoid view switching issues
            // If we are in admin view, we just stay there, but we send the websocket signal
            joinBoard(boardController.boardId, window.currentUser);
            boardController.loadBoardData(); // Refresh permissions
        }

        // Authorization Check
        const token = localStorage.getItem('adminToken');
        const isJWTAdmin = window.currentUserRole === 'admin';

        // Hide other views
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('boardContainer').style.display = 'none';
        document.getElementById('actionItemsView').style.display = 'none';
        document.getElementById('teamsView').style.display = 'none';
        document.getElementById('teamDetailsView').style.display = 'none';

        // Show Admin View
        const adminView = document.getElementById('adminView');
        if (!adminView) return;
        adminView.style.display = 'block';

        // Update Header
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'inline-block';
        const newBoardBtn = document.getElementById('newBoardBtn');
        if (newBoardBtn) newBoardBtn.style.display = 'none';

        // logic to show dashboard or login
        if (isJWTAdmin || token) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        const container = document.getElementById('adminContent');
        container.innerHTML = `
            <div class="admin-login-card">
                <h3>${i18n.t('admin.title')}</h3>
                <p>${i18n.t('admin.enter_pass')}</p>
                <form id="adminLoginForm" onsubmit="adminController.handleLogin(event)">
                    <input type="password" id="adminPassword" placeholder="${i18n.t('label.password') || 'Password'}" class="form-input" required>
                    <button type="submit" class="btn btn-primary">${i18n.t('btn.login') || 'Login'}</button>
                </form>
            </div>
        `;
    }

    async handleLogin(e) {
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

                // Refresh connection if on a board
                if (window.currentBoard && window.currentUser) {
                    joinBoard(window.currentBoard.id, window.currentUser);
                    // boardController.loadBoardData(); 
                    // Using boardController direct load if available
                    if (boardController) boardController.loadBoardData();
                }

                this.showDashboard();
            } else {
                alert(i18n.t('admin.invalid_pass'));
            }
        } catch (error) {
            alert(i18n.t('admin.login_failed') + ': ' + error.message);
        }
    }

    async showDashboard() {
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

    logout() {
        localStorage.removeItem('adminToken');
        this.showLogin();
    }
}

export const adminController = new AdminController();

// Expose for HTML OnClick
window.adminController = adminController;

// Preserve legacy shims for sub-modules that rely on global scope if any (though we import them here)
// The existing sub-modules (admin-boards.js etc) set their own globals, so those OnClicks in templates will work.
