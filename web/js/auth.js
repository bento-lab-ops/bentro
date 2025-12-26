// Auth UI Logic

function openLoginModal() {
    closeRegisterModal();
    document.getElementById('loginModal').style.display = 'block';

    // Check if we are inside userModal context and hide it if so
    const userModal = document.getElementById('userModal');
    if (userModal && userModal.style.display === 'block') {
        userModal.style.display = 'none';
        window.returnToUserModal = true;
    }
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    if (window.returnToUserModal) {
        document.getElementById('userModal').style.display = 'block';
        window.returnToUserModal = false;
    }
}

function openRegisterModal() {
    closeLoginModal();
    document.getElementById('registerModal').style.display = 'block';

    // Check if we are inside userModal context and hide it if so
    const userModal = document.getElementById('userModal');
    if (userModal && userModal.style.display === 'block') {
        userModal.style.display = 'none';
        window.returnToUserModal = true;
    }
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    if (window.returnToUserModal) {
        document.getElementById('userModal').style.display = 'block';
        window.returnToUserModal = false;
    }
}

function switchToRegister() {
    // Keep returnToUserModal state
    const returnState = window.returnToUserModal;
    closeLoginModal();
    window.returnToUserModal = returnState; // Restore state after close
    openRegisterModal();
    // Prevent openRegister from resetting the state (it sets it to true if userModal is visible, which it isn't now)
    // Actually openRegister handles logic correctly if userModal is hidden. 
    // We just need to ensure we don't return to userModal in between switch.
    // Simplest: direct display manipulation
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'block';
}

function switchToLogin() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'block';
}

function toggleGuestForm() {
    const form = document.getElementById('userForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

async function handleLoginSubmit(event) {
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

        // Check if password change is required
        if (response.require_password_change) {
            closeLoginModal();
            closeRegisterModal();
            document.getElementById('userModal').style.display = 'none';
            openChangePasswordModal(true); // Forced password change
            return;
        }

        // Close Modals
        closeLoginModal();
        closeRegisterModal();
        // Close user modal if it was underlying
        document.getElementById('userModal').style.display = 'none';

        // Refresh UI
        updateUserDisplay();

        // Refresh menu to show logout option
        if (typeof renderMenuLinks === 'function') {
            renderMenuLinks();
        }

        // If on board, join it
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('board/')) {
            const boardId = hash.split('/')[1];
            loadBoard(boardId);
        } else {
            showDashboard();
        }

        console.log('✅ Login successful!');

    } catch (error) {
        alert('Login Failed: ' + error.message);
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const displayName = document.getElementById('registerDisplayName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        await register({
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            email,
            password,
            avatar: '👤'
        });
        // Auto login after register?
        // For now, ask to login
        alert('Registration successful! Please login.');
        switchToLogin();
        // Pre-fill email
        document.getElementById('loginEmail').value = email;

    } catch (error) {
        alert('Registration Failed: ' + error.message);
    }
}

// User Profile Modal
function openUserProfileModal() {
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
        window.i18n.translatePage();
    }
}

function closeUserProfileModal() {
    document.getElementById('userProfileModal').style.display = 'none';
}

// Avatar Selection Functions
function populateProfileAvatarSelector() {
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

function toggleProfileAvatarSelector() {
    const selector = document.getElementById('profileAvatarSelector');
    if (selector) {
        selector.style.display = selector.style.display === 'none' ? 'grid' : 'none';
    }
}

function selectProfileAvatar(avatar) {
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

async function saveProfileChanges() {
    try {
        const response = await apiCall('/auth/profile', 'PUT', {
            avatar_url: window.selectedProfileAvatar
        });

        // Update global state
        window.currentUserAvatar = window.selectedProfileAvatar;

        // Update UI
        updateUserDisplay();

        alert('Profile updated successfully!');
        closeUserProfileModal();
    } catch (error) {
        alert('Failed to update profile: ' + error.message);
    }
}

// Change Password Modal
let isPasswordChangeForced = false;

function openChangePasswordModal(forced = false) {
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
        if (closeBtn) closeBtn.style.display = 'inline';
    }

    modal.style.display = 'block';
}

function closeChangePasswordModal() {
    if (isPasswordChangeForced) {
        alert('You must change your password before continuing.');
        return;
    }
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
}

async function handleChangePasswordSubmit(event) {
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

        alert('Password changed successfully!');
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

// Attach to window for HTML access
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
