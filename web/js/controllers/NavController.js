import { i18n } from '../i18n.js';
import { logout } from '../api.js';
import { boardController } from './BoardController.js';

export class NavController {
    constructor() {
        this.sidebar = null;
        this.overlay = null;
        // Bind methods
        this.toggleMenu = this.toggleMenu.bind(this);
        this.openMenu = this.openMenu.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.handleUserLogout = this.handleUserLogout.bind(this);
        this.renderMenuLinks = this.renderMenuLinks.bind(this);
        this.navigateTo = this.navigateTo.bind(this);
        this.openSettingsModal = this.openSettingsModal.bind(this);
        this.handleSettingsAdminLogin = this.handleSettingsAdminLogin.bind(this);
        this.logoutAdminInSettings = this.logoutAdminInSettings.bind(this);
        this.toggleThemeFromSettings = this.toggleThemeFromSettings.bind(this);
    }

    init() {
        this.sidebar = document.getElementById('appSidebar');
        this.overlay = document.getElementById('sidebarOverlay');

        // Attach event listeners
        if (this.overlay) {
            this.overlay.addEventListener('click', this.closeMenu);
        }

        // Register global shims for HTML onclick attributes
        this.registerGlobalShims();
    }

    registerGlobalShims() {
        window.toggleMenu = this.toggleMenu;
        window.openMenu = this.openMenu;
        window.closeMenu = this.closeMenu;
        window.renderMenuLinks = this.renderMenuLinks;
        window.handleUserLogout = this.handleUserLogout;
        window.navigateTo = this.navigateTo;
        window.openHelpModal = this.openHelpModal;
        window.openSettingsModal = this.openSettingsModal;
        window.closeSettingsModal = this.closeSettingsModal;
        window.toggleThemeFromSettings = this.toggleThemeFromSettings;
        window.handleSettingsAdminLogin = this.handleSettingsAdminLogin;
        window.logoutAdminInSettings = this.logoutAdminInSettings;
    }

    toggleMenu(forceClose = false) {
        if (forceClose) {
            this.closeMenu();
            return;
        }
        const isOpen = this.sidebar.classList.contains('active');
        isOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu() {
        this.sidebar.classList.add('active');
        this.overlay.classList.add('active');
        this.renderMenuLinks();
    }

    closeMenu() {
        this.sidebar.classList.remove('active');
        this.overlay.classList.remove('active');
    }

    renderMenuLinks() {
        const menuList = document.getElementById('menuList');
        const adminToken = localStorage.getItem('adminToken');

        let html = '';

        // Home
        html += `<li onclick="navigateTo(''); closeMenu()"><span class="menu-icon">🏠</span> ${i18n.t('menu.dashboard')}</li>`;

        // Tasks & Teams
        html += `<li onclick="navigateTo('action-items'); closeMenu()"><span class="menu-icon">⚡</span> ${i18n.t('menu.my_tasks')}</li>`;
        html += `<li onclick="navigateTo('teams'); closeMenu()"><span class="menu-icon">👥</span> ${i18n.t('menu.my_teams') || 'My Teams'}</li>`;

        // Settings
        html += `<li onclick="openSettingsModal(); closeMenu()"><span class="menu-icon">⚙️</span> ${i18n.t('menu.settings')}</li>`;

        // Admin
        if (window.currentUserRole === 'admin' || adminToken) {
            html += `<li onclick="navigateTo('admin'); closeMenu()" class="admin-item"><span class="menu-icon">🛡️</span> ${i18n.t('menu.admin')}</li>`;
        }

        // Help
        html += `<li onclick="openHelpModal(); closeMenu()"><span class="menu-icon">❓</span> ${i18n.t('menu.help')}</li>`;

        // Auth
        html += `<hr style="margin: 0.5rem 0; border-color: var(--border);">`;
        if (window.currentUserId) {
            html += `<li onclick="handleUserLogout(); closeMenu()"><span class="menu-icon">🚪</span> ${i18n.t('menu.logout')}</li>`;
        } else {
            html += `<li onclick="openLoginModal(); closeMenu()"><span class="menu-icon">🔐</span> ${i18n.t('btn.login')}</li>`;
        }

        menuList.innerHTML = html;
    }

    navigateTo(route) {
        if (route === '') {
            window.location.hash = '';
            if (window.showDashboard) window.showDashboard();
        } else {
            window.location.hash = `#${route}`;
        }
    }

    handleUserLogout() {
        logout().then(() => {
            window.currentUser = null;
            window.currentUserId = null;
            window.currentUserAvatar = null;
            localStorage.removeItem('retroUser');
            localStorage.removeItem('retroUserAvatar');
            window.location.hash = '';
            window.location.reload();
        }).catch(err => {
            console.error('Logout failed:', err);
            alert('Logout failed: ' + err.message);
        });
    }

    // Modal Helpers
    openHelpModal() {
        const modal = document.getElementById('helpModal');
        if (modal) modal.style.display = 'block';
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.renderSettingsContent();
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.style.display = 'none';
    }

    renderSettingsContent() {
        const container = document.getElementById('settingsContent');
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const adminToken = localStorage.getItem('adminToken');

        let html = `
            <div class="settings-section">
                <h4>🎨 ${i18n.t('settings.appearance')}</h4>
                <div class="theme-toggle-row">
                    <span>${i18n.t('settings.dark_mode')}</span>
                    <label class="switch">
                        <input type="checkbox" id="themeToggleOutput" ${currentTheme === 'dark' ? 'checked' : ''} onchange="toggleThemeFromSettings(this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        `;

        // Only show Administration if already authenticated
        if (window.currentUserRole === 'admin' || adminToken) {
            html += `
            <div class="settings-section">
                <h4>🛡️ ${i18n.t('settings.administration')}</h4>
                <div class="admin-panel-link">
            `;

            if (window.currentUserRole === 'admin') {
                html += `
                    <div class="alert alert-success">✅ Authenticated as Admin (JWT)</div>
                    <p>You have full administrative access.</p>
                    <div class="settings-actions">
                        <button class="btn btn-primary btn-sm" onclick="navigateTo('admin'); closeSettingsModal()">${i18n.t('menu.admin')}</button>
                    </div>
                `;
            } else if (adminToken) {
                html += `
                    <div class="alert alert-success">✅ ${i18n.t('menu.verified')}</div>
                    <p>${i18n.t('admin.board_management_desc')}</p>
                    <div class="settings-actions">
                        <button class="btn btn-primary btn-sm" onclick="navigateTo('admin'); closeSettingsModal()">${i18n.t('menu.admin')}</button>
                        <button class="btn btn-outline btn-sm" onclick="logoutAdminInSettings()">${i18n.t('menu.logout')}</button>
                    </div>
                `;
            }
            html += `</div></div>`;
        }

        container.innerHTML = html;
    }

    toggleThemeFromSettings(isDark) {
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        if (window.updateThemeIcon) window.updateThemeIcon(newTheme);
    }

    async handleSettingsAdminLogin(e) {
        e.preventDefault();
        const password = document.getElementById('settingsAdminPass').value;
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('adminToken', data.token);
                this.renderSettingsContent();
                if (boardController && boardController.boardId) boardController.loadBoardData();
            } else {
                alert(i18n.t('admin.invalid_pass'));
            }
        } catch (error) {
            alert(i18n.t('admin.login_failed'));
        }
    }

    logoutAdminInSettings() {
        localStorage.removeItem('adminToken');
        this.renderSettingsContent();
        if (boardController && boardController.boardId) boardController.loadBoardData();
    }
}

// Export singleton for now, or instantiate in main.js
export const navController = new NavController();
