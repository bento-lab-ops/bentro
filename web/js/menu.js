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
            <span class="menu-icon">🏠</span> Dashboard
        </li>
    `;

    // ⚡ My Tasks
    html += `
        <li onclick="navigateTo('action-items'); closeMenu()">
            <span class="menu-icon">⚡</span> My Tasks
        </li>
    `;

    // ⚙️ Settings (Theme + Admin)
    html += `
        <li onclick="openSettingsModal(); closeMenu()">
            <span class="menu-icon">⚙️</span> Settings
        </li>
    `;

    // 🛡️ Admin Dashboard (Only if logged in)
    if (adminToken) {
        html += `
            <li onclick="navigateTo('admin'); closeMenu()" class="admin-item">
                <span class="menu-icon">🛡️</span> Admin Dashboard
            </li>
        `;
    }

    // ❓ Help
    html += `
        <li onclick="openHelpModal(); closeMenu()">
            <span class="menu-icon">❓</span> Help
        </li>
    `;

    menuList.innerHTML = html;
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
            <h4>🎨 Appearance</h4>
            <div class="theme-toggle-row">
                <span>Dark Mode</span>
                <label class="switch">
                    <input type="checkbox" id="themeToggleOutput" ${currentTheme === 'dark' ? 'checked' : ''} onchange="toggleThemeFromSettings(this.checked)">
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
        
        <div class="settings-section">
            <h4>🛡️ Administration</h4>
    `;

    if (adminToken) {
        html += `
            <div class="alert alert-success">✅ Verified Admin Access</div>
            <p>You have full control over board settings.</p>
            <div class="settings-actions">
                <button class="btn btn-primary btn-sm" onclick="navigateTo('admin'); closeSettingsModal()">Go to Dashboard</button>
                <button class="btn btn-outline btn-sm" onclick="logoutAdminInSettings()">Logout</button>
            </div>
        `;
    } else {
        html += `
            <p class="text-secondary">Enter admin password to unlock features.</p>
            <form id="settingsAdminLogin" onsubmit="handleSettingsAdminLogin(event)">
                <div class="input-group">
                    <input type="password" id="settingsAdminPass" placeholder="Password" class="form-input">
                    <button type="submit" class="btn btn-primary">Unlock</button>
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
            alert('Invalid password');
        }
    } catch (error) {
        alert('Login failed');
    }
}

function logoutAdminInSettings() {
    localStorage.removeItem('adminToken');
    renderSettingsContent();
    if (window.currentBoard) {
        loadBoard(window.currentBoard.id);
    }
}
