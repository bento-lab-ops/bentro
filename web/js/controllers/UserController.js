import { escapeHtml } from '../utils.js';
import { AVAILABLE_AVATARS, getUserAvatar, setUserAvatar } from '../avatars.js';
import { navController } from './NavController.js';

export class UserController {
    constructor() {
        this.currentUser = null;
        this.currentUserAvatar = null;
        this.currentUserId = null;
        this.currentUserEmail = null;
        this.currentUserFullName = null;
        this.currentUserRole = null;
        this.isGoogleAuth = false;
    }

    async init() {
        console.log('%c👤 Checking User Status...', 'color: #2196F3;');

        // 1. Check Server Session (API)
        try {
            const response = await fetch('/api/user/me');
            if (response.ok) {
                const user = await response.json();
                this.setUserState(user);
                this.isGoogleAuth = true;
                console.log('%c🔐 Logged in via Server Session', 'color: #4CAF50; font-weight: bold;');
            }
        } catch (e) {
            console.log('No active server session');
        }

        // 2. Fallback to LocalStorage
        if (!this.currentUser) {
            const storedUser = localStorage.getItem('retroUser');
            if (storedUser) {
                this.currentUser = storedUser;
                this.currentUserAvatar = localStorage.getItem('retroUserAvatar') || '👤';
                // ID/Email might be missing in local storage mode if not synced, 
                // but usually this mode is for "Guest" legacy or simple usage.
            }
        }

        // 3. Sync Window Types for Compatibility (Legacy)
        this.syncGlobalState();

        // 4. Update UI or Show Login
        if (!this.currentUser) {
            console.log('%c📝 Showing login modal', 'color: #FF9800; font-style: italic;');
            const userModal = document.getElementById('userModal');
            if (userModal) {
                userModal.style.display = 'block';
                this.populateAvatarSelector();
            }
        } else {
            this.updateDisplay();
        }
    }

    setUserState(user) {
        this.currentUser = user.display_name || user.name;
        this.currentUserAvatar = user.avatar_url || '👤';
        this.currentUserId = user.id;
        this.currentUserEmail = user.email;
        this.currentUserFullName = user.name;
        this.currentUserRole = user.role;
        this.syncGlobalState();
    }

    syncGlobalState() {
        // Maintain window globals for backward compatibility with other scripts
        window.currentUser = this.currentUser;
        window.currentUserAvatar = this.currentUserAvatar;
        window.currentUserId = this.currentUserId;
        window.currentUserEmail = this.currentUserEmail;
        window.currentUserFullName = this.currentUserFullName;
        window.currentUserRole = this.currentUserRole;
        window.isGoogleAuth = this.isGoogleAuth;
    }

    updateDisplay() {
        const avatar = this.currentUserAvatar || getUserAvatar();
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay && this.currentUser) {
            userDisplay.innerHTML = `${avatar} ${escapeHtml(this.currentUser)} <span class="edit-icon" title="Edit Profile">✏️</span>`;
        }

        const editBtn = document.getElementById('editUserBtn');
        if (editBtn) editBtn.style.display = 'inline-block';

        const newBoardBtn = document.getElementById('newBoardBtn');
        if (newBoardBtn) newBoardBtn.style.display = 'inline-block';
    }

    // Modal Logic

    populateAvatarSelector() {
        const selector = document.getElementById('avatarSelector');
        if (!selector) return;

        const currentAvatar = this.currentUserAvatar || getUserAvatar() || '👤';

        selector.innerHTML = AVAILABLE_AVATARS.map(avatar => `
            <div class="avatar-option ${avatar === currentAvatar ? 'selected' : ''}" 
                 data-avatar="${avatar}"
                 onclick="selectAvatar('${avatar}')">
                 ${avatar}
            </div>
        `).join('');
    }

    openEditUserModal() {
        const modal = document.getElementById('userModal');
        const input = document.getElementById('userNameInput');
        if (modal && input) {
            input.value = this.currentUser || '';
            this.populateAvatarSelector();
            modal.style.display = 'block';
            input.focus();
        }
    }

    // Returning User Logic (Legacy Guest Flow)
    showReturningUserModal(username) {
        const avatar = getUserAvatar();
        const nameEl = document.getElementById('returningUserName');
        const modal = document.getElementById('returningUserModal');

        if (nameEl) nameEl.textContent = `${avatar} ${username}`;
        if (modal) modal.style.display = 'block';
    }

    confirmReturningUser() {
        this.currentUserAvatar = getUserAvatar();
        // Assume username is already set in localStorage if we are here?
        // Logic in main.js was:
        // window.currentUserAvatar = getUserAvatar();
        // document.getElementById('returningUserModal').style.display = 'none';
        // updateUserDisplay();

        const modal = document.getElementById('returningUserModal');
        if (modal) modal.style.display = 'none';

        this.syncGlobalState();
        this.updateDisplay();

        // Trigger routing check (replaces handleUrlHash)
        navController.handleRouting();
    }

    handleChangeUser() {
        const modal = document.getElementById('returningUserModal');
        if (modal) modal.style.display = 'none';

        this.logoutLocal();

        const userModal = document.getElementById('userModal');
        if (userModal) userModal.style.display = 'block';
    }

    logoutLocal() {
        this.currentUser = null;
        this.currentUserId = null;
        this.currentUserAvatar = null;
        this.currentUserEmail = null;
        this.currentUserRole = null;
        this.isGoogleAuth = false;

        localStorage.removeItem('retroUser');
        localStorage.removeItem('retroUserAvatar');
        localStorage.removeItem('adminToken');

        this.syncGlobalState();
    }
}

export const userController = new UserController();

// Expose relevant methods for HTML onclicks if needed (though most are event listeners now)
window.openEditUserModal = () => userController.openEditUserModal();
window.confirmReturningUser = () => userController.confirmReturningUser();

// Note: selectAvatar is imported from avatars.js and attached to window in main.js usually?
// or we need to expose it here if we render onclick="selectAvatar"
import { selectAvatar } from '../avatars.js';
window.selectAvatar = selectAvatar;
