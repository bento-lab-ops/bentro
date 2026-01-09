// Available avatar emojis
export const AVAILABLE_AVATARS = [
    '😀', '😎', '🤓', '🥳', '🤩', '😇',
    '🦸', '🦹', '🧙', '🧚', '🧛', '🧜',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
    '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🚀', '⚡', '🔥', '⭐', '💎', '🎯',
    '🎨', '🎭', '🎪', '🎸', '🎮', '🏆'
];

// Get user's current avatar from localStorage
export function getUserAvatar() {
    return localStorage.getItem('retroUserAvatar') || '😀';
}

// Set user's avatar in localStorage
export function setUserAvatar(avatar) {
    localStorage.setItem('retroUserAvatar', avatar);
    window.currentUserAvatar = avatar;
}

// Select avatar (UI interaction)
export function selectAvatar(avatar) {
    setUserAvatar(avatar);
    // Update UI
    const options = document.querySelectorAll('.avatar-option');
    options.forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.avatar === avatar);
    });
    // Update user display if it exists
    if (window.updateUserDisplay) {
        window.updateUserDisplay();
    }
}

// Global Shims
window.AVAILABLE_AVATARS = AVAILABLE_AVATARS;
window.getUserAvatar = getUserAvatar;
window.setUserAvatar = setUserAvatar;
window.selectAvatar = selectAvatar;

// Initialize avatar on app load (side effect)
window.currentUserAvatar = getUserAvatar();
console.log('%c🎨 Avatar Initialized', 'color: #9C27B0; font-weight: bold;', 'Avatar:', window.currentUserAvatar);
