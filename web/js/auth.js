// Auth UI Logic
import { login, register, apiCall } from './api.js';
import { boardController } from './controllers/BoardController.js';
import { i18n } from './i18n.js';

export function openLoginModal() {
    // ... unchanged ...
    // If on board, join it
    const hash = window.location.hash.substring(1);
    if (hash.startsWith('board/')) {
        const boardId = hash.split('/')[1];
        boardController.init({ id: boardId });
    } else {
        if (window.showDashboard) window.showDashboard();
    }
    closeRegisterModal();
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'block';

    // Check if we are inside userModal context and hide it if so
    const userModal = document.getElementById('userModal');
    if (userModal && userModal.style.display === 'block') {
        userModal.style.display = 'none';
        window.returnToUserModal = true;
    }
}

export function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
    if (window.returnToUserModal) {
        document.getElementById('userModal').style.display = 'block';
        window.returnToUserModal = false;
    }
}

export function openRegisterModal() {
    closeLoginModal();
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'block';

    // Check if we are inside userModal context and hide it if so
    const userModal = document.getElementById('userModal');
    if (userModal && userModal.style.display === 'block') {
        userModal.style.display = 'none';
        window.returnToUserModal = true;
    }

    // Reset avatar
    window.selectedRegisterAvatar = '👤';
    const display = document.getElementById('registerAvatarDisplay');
    if (display) display.textContent = '👤';
    const selector = document.getElementById('registerAvatarSelector');
    if (selector) selector.style.display = 'none';
}

export function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'none';
    if (window.returnToUserModal) {
        document.getElementById('userModal').style.display = 'block';
        window.returnToUserModal = false;
    }
}

export function switchToRegister() {
    // Keep returnToUserModal state
    const returnState = window.returnToUserModal;
    closeLoginModal();
    window.returnToUserModal = returnState; // Restore state after close
    openRegisterModal();
    // Simplest: direct display manipulation
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'block';
}

export function switchToLogin() {
    const registerModal = document.getElementById('registerModal');
    const loginModal = document.getElementById('loginModal');
    if (registerModal) registerModal.style.display = 'none';
    if (loginModal) loginModal.style.display = 'block';
}

export function toggleGuestForm() {
    const form = document.getElementById('userForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

export async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await login(email, password);
        // Login success
        // Token is set in cookie by backend
        // Update UI
        window.currentUser = response.user.display_name || response.user.name;
        window.currentUserAvatar = response.user.avatar_url || '👤';
        window.currentUserId = response.user.id;
        window.currentUserEmail = response.user.email;
        window.currentUserFullName = response.user.name;
        window.currentUserRole = response.user.role; // Store role for admin check

        // Check if password change is required
        if (response.require_password_change) {
            closeLoginModal();
            closeRegisterModal();
            const userModal = document.getElementById('userModal');
            if (userModal) userModal.style.display = 'none';
            openChangePasswordModal(true); // Forced password change
            return;
        }

        // Close Modals
        closeLoginModal();
        closeRegisterModal();
        // Close user modal if it was underlying
        const userModal = document.getElementById('userModal');
        if (userModal) userModal.style.display = 'none';

        // Refresh UI via window global (main.js)
        if (window.updateUserDisplay) window.updateUserDisplay();

        // Refresh menu via module or window
        // Ensure menu.js is loaded and renderMenuLinks is global
        if (window.renderMenuLinks) {
            window.renderMenuLinks();
        }

        // If on board, join it
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('board/')) {
            const boardId = hash.split('/')[1];
            loadBoard(boardId);
        } else {
            if (window.showDashboard) window.showDashboard();
        }

        console.log('✅ Login successful!');

    } catch (error) {
        alert('Login Failed: ' + error.message);
    }
}

export async function handleRegisterSubmit(event) {
    event.preventDefault();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    const fullName = `${firstName} ${lastName}`.trim();

    try {
        await register({
            first_name: firstName,
            last_name: lastName,
            display_name: fullName,
            email,
            password,
            avatar: window.selectedRegisterAvatar || '👤'
        });
        // Auto login after register?
        // For now, ask to login
        // alert('Registration successful! Please login.'); // REMOVED
        await window.showAlert(i18n.t('msg.success'), i18n.t('msg.reg_success'));
        switchToLogin();
        // Pre-fill email
        document.getElementById('loginEmail').value = email;

    } catch (error) {
        alert('Registration Failed: ' + error.message);
    }
}

// User Profile Modal
export function openUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (!window.currentUserId) {
        openLoginModal();
        return;
    }

    // Populate profile data
    document.getElementById('profileDisplayName').value = window.currentUser || '';
    document.getElementById('profileFullName').value = window.currentUserFullName || '';
    document.getElementById('profileEmail').value = window.currentUserEmail || '';

    // Initialize avatar
    const avatarDisplay = document.getElementById('profileAvatarDisplay');
    if (avatarDisplay) {
        avatarDisplay.textContent = window.currentUserAvatar || '👤';
        window.selectedProfileAvatar = window.currentUserAvatar || '👤';
    }

    // Populate avatar selector
    populateProfileAvatarSelector();

    modal.style.display = 'block';

    // Refresh i18n for modal content
    if (window.i18n) {
        window.i18n.updatePage();
    }
}

export function closeUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) modal.style.display = 'none';
}

// Avatar Selection Functions
export function populateProfileAvatarSelector() {
    const selector = document.getElementById('profileAvatarSelector');
    if (!selector) return;

    const avatars = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
        '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
        '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
        '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
        '👤', '👥', '👶', '👦', '👧', '👨', '👩', '👴',
        '👵', '👱', '💂', '🕵️', '👷', '👮', '👳', '👲'
    ];

    selector.innerHTML = avatars.map(avatar =>
        `<span class="avatar-option ${avatar === window.selectedProfileAvatar ? 'selected' : ''}" 
               onclick="selectProfileAvatar('${avatar}')">${avatar}</span>`
    ).join('');
}

export function toggleProfileAvatarSelector() {
    const selector = document.getElementById('profileAvatarSelector');
    if (selector) {
        selector.style.display = selector.style.display === 'none' ? 'grid' : 'none';
    }
}

export function selectProfileAvatar(avatar) {
    window.selectedProfileAvatar = avatar;
    const display = document.getElementById('profileAvatarDisplay');
    if (display) {
        display.textContent = avatar;
    }

    // Update selected state in UI
    document.querySelectorAll('#profileAvatarSelector .avatar-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    if (window.event && window.event.target) {
        window.event.target.classList.add('selected');
    }
}

export async function saveProfileChanges() {
    try {
        const response = await apiCall('/auth/profile', 'PUT', {
            avatar_url: window.selectedProfileAvatar
        });

        // Update global state
        window.currentUserAvatar = window.selectedProfileAvatar;

        // Update UI
        if (window.updateUserDisplay) window.updateUserDisplay();

        await window.showAlert(i18n.t('msg.success'), i18n.t('msg.profile_updated') || 'Profile updated successfully!');
        closeUserProfileModal();
    } catch (error) {
        await window.showAlert(i18n.t('msg.error'), 'Failed to update profile: ' + error.message);
    }
}

// Change Password Modal
let isPasswordChangeForced = false;

export function openChangePasswordModal(forced = false) {
    isPasswordChangeForced = forced;
    const modal = document.getElementById('changePasswordModal');
    const warningDiv = document.getElementById('passwordChangeRequired');

    if (forced) {
        warningDiv.style.display = 'block';
        // Prevent closing if forced
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) closeBtn.style.display = 'none';
    } else {
        warningDiv.style.display = 'none';
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) closeBtn.style.display = ''; // Let CSS handle it (was 'inline')
    }

    modal.style.display = 'block';
}

export function closeChangePasswordModal() {
    if (isPasswordChangeForced) {
        window.showAlert(i18n.t('msg.warning'), i18n.t('msg.must_change_password'));
        return;
    }
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('changePasswordForm').reset();
}

export async function handleChangePasswordSubmit(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }

    try {
        const response = await apiCall('/auth/change-password', 'POST', {
            old_password: currentPassword,
            new_password: newPassword
        });

        await window.showAlert(i18n.t('msg.success'), i18n.t('msg.password_changed') || 'Password changed successfully!');
        isPasswordChangeForced = false;
        closeChangePasswordModal();

        // If was forced, now allow normal usage
        if (isPasswordChangeForced) {
            window.location.reload();
        }
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
}

// Register Avatar Selection
export function populateRegisterAvatarSelector() {
    const selector = document.getElementById('registerAvatarSelector');
    if (!selector) return;

    const avatars = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
        '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
        '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
        '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
        '👤', '👥', '👶', '👦', '👧', '👨', '👩', '👴',
        '👵', '👱', '💂', '🕵️', '👷', '👮', '👳', '👲'
    ];

    selector.innerHTML = avatars.map(avatar =>
        `<span class="avatar-option ${avatar === window.selectedRegisterAvatar ? 'selected' : ''}" 
               onclick="selectRegisterAvatar('${avatar}')">${avatar}</span>`
    ).join('');
}

export function toggleRegisterAvatarSelector() {
    const selector = document.getElementById('registerAvatarSelector');
    if (selector) {
        selector.style.display = selector.style.display === 'none' ? 'grid' : 'none';
        if (selector.style.display === 'grid') {
            populateRegisterAvatarSelector();
        }
    }
}

export function selectRegisterAvatar(avatar) {
    window.selectedRegisterAvatar = avatar;
    const display = document.getElementById('registerAvatarDisplay');
    if (display) {
        display.textContent = avatar;
    }

    // Update selected state in UI
    document.querySelectorAll('#registerAvatarSelector .avatar-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    if (window.event && window.event.target) {
        window.event.target.classList.add('selected');
    }
    // Auto close
    toggleRegisterAvatarSelector();
}

// Attach to window
window.toggleRegisterAvatarSelector = toggleRegisterAvatarSelector;
window.selectRegisterAvatar = selectRegisterAvatar;
window.populateRegisterAvatarSelector = populateRegisterAvatarSelector;

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.toggleGuestForm = toggleGuestForm;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.openUserProfileModal = openUserProfileModal;
window.closeUserProfileModal = closeUserProfileModal;
window.toggleProfileAvatarSelector = toggleProfileAvatarSelector;
window.selectProfileAvatar = selectProfileAvatar;
window.saveProfileChanges = saveProfileChanges;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handleChangePasswordSubmit = handleChangePasswordSubmit;
