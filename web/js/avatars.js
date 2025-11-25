// Available avatar emojis
const AVAILABLE_AVATARS = [
    '😀', '😎', '🤓', '🥳', '🤩', '😇',
    '🦸', '🦹', '🧙', '🧚', '🧛', '🧜',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
    '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🚀', '⚡', '🔥', '⭐', '💎', '🎯',
    '🎨', '🎭', '🎪', '🎸', '🎮', '🏆'
];

// Get user's current avatar from localStorage
function getUserAvatar() {
    return localStorage.getItem('retroUserAvatar') || '😀';
}

// Set user's avatar in localStorage
function setUserAvatar(avatar) {
    localStorage.setItem('retroUserAvatar', avatar);
    window.currentUserAvatar = avatar;
}

// Initialize avatar on app load
window.currentUserAvatar = getUserAvatar();
console.log('%c🎨 Avatar Initialized', 'color: #9C27B0; font-weight: bold;', 'Avatar:', window.currentUserAvatar);
