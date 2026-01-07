// Menu & Navigation Management

function toggleMenu() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

// Close menu when clicking outside (on the overlay)
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeMenu);
    }
});

function openMenu() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.add('open');
    overlay.classList.add('visible');

    // Update Menu Items based on context
    renderMenuLinks();
}

function closeMenu() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
}

function renderMenuLinks() {
    const menuList = document.getElementById('menuList');
    const currentHash = window.location.hash;
    const adminToken = localStorage.getItem('adminToken');

    let html = '';

    // 🏠 Home / Dashboard
    html += `
        <li onclick="navigateTo(''); closeMenu()">
            <span class="menu-icon">🏠</span> ${i18n.t('menu.dashboard')}
        </li>
    `;

    // ⚡ My Tasks
    html += `
        <li onclick="navigateTo('action-items'); closeMenu()">
            <span class="menu-icon">⚡</span> ${i18n.t('menu.my_tasks')}
        </li>
        <li onclick="navigateTo('teams'); closeMenu()">
            <span class="menu-icon">👥</span> ${i18n.t('menu.my_teams') || 'My Teams'}
        </li>
    `;

    // ⚙️ Settings (Theme + Admin)
    html += `
        <li onclick="openSettingsModal(); closeMenu()">
            <span class="menu-icon">⚙️</span> ${i18n.t('menu.settings')}
        </li>
    `;

    // 🛡️ Admin Dashboard (JWT admin or K8s admin token)
    if (window.currentUserRole === 'admin' || adminToken) {
        html += `
            <li onclick="navigateTo('admin'); closeMenu()" class="admin-item">
                <span class="menu-icon">🛡️</span> ${i18n.t('menu.admin')}
            </li>
        `;
    }

    // ❓ Help
    html += `
        <li onclick="openHelpModal(); closeMenu()">
            <span class="menu-icon">❓</span> ${i18n.t('menu.help')}
        </li>
    `;

    // 👤 User Authentication Section
    html += `<hr style="margin: 0.5rem 0; border-color: var(--border);">`;

    if (window.currentUserId) {
        // User is logged in (authenticated)
        html += `
            <li onclick="handleUserLogout(); closeMenu()">
                <span class="menu-icon">🚪</span> ${i18n.t('menu.logout')}
            </li>
        `;
    } else {
        // User is not logged in
        html += `
            <li onclick="openLoginModal(); closeMenu()">
                <span class="menu-icon">🔐</span> ${i18n.t('btn.login')}
            </li>
        `;
    }

    menuList.innerHTML = html;
}

function handleUserLogout() {
    // Call logout API
    logout().then(() => {
        // Clear user data
        window.currentUser = null;
        window.currentUserId = null;
        window.currentUserAvatar = null;

        // Clear localStorage
        localStorage.removeItem('retroUser');
        localStorage.removeItem('retroUserAvatar');

        // Redirect to home
        window.location.hash = '';
        window.location.reload();
    }).catch(err => {
        console.error('Logout failed:', err);
        alert('Logout failed: ' + err.message);
    });
}

function navigateTo(route) {
    if (route === '') {
        window.location.hash = '';
        showDashboard();
    } else {
        window.location.hash = `#${route}`;
        // Main router handles the rest
    }
}

// Settings Modal Logic
function openHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'block';
        renderSettingsContent();
    }
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function renderSettingsContent() {
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
        
        <div class="settings-section">
            <h4>🛡️ ${i18n.t('settings.administration')}</h4>
    `;

    // Check if user is JWT admin or has K8s admin token
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
    } else {
        html += `
            <p class="text-secondary">${i18n.t('menu.enter_password')}</p>
            <form id="settingsAdminLogin" onsubmit="handleSettingsAdminLogin(event)">
                <div class="input-group">
                    <input type="password" id="settingsAdminPass" placeholder="${i18n.t('label.password') || 'Password'}" class="form-input">
                    <button type="submit" class="btn btn-primary">${i18n.t('menu.unlock')}</button>
                </div>
            </form>
        `;
    }

    html += `</div>`;

    container.innerHTML = html;
}

function toggleThemeFromSettings(isDark) {
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
}

async function handleSettingsAdminLogin(e) {
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
            renderSettingsContent(); // Refresh UI
            // Also refresh board if open to show admin controls
            if (window.currentBoard) {
                loadBoard(window.currentBoard.id);
            }
        } else {
            alert(i18n.t('admin.invalid_pass'));
        }
    } catch (error) {
        alert(i18n.t('admin.login_failed'));
    }
}

function logoutAdminInSettings() {
    localStorage.removeItem('adminToken');
    renderSettingsContent();
    if (window.currentBoard) {
        loadBoard(window.currentBoard.id);
    }
}
