// Theme Management
const THEME_KEY = 'bentro_theme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    /* if (savedTheme) {
         document.documentElement.setAttribute('data-theme', savedTheme);
     } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
         document.documentElement.setAttribute('data-theme', 'dark');
     }*/

    // Default to dark for premium feel if not set? Or just rely on CSS variables.
    // For now we just respect the toggle if existing, or default to dark/light as defined in CSS root.
    // Given the 'premium' requirement, we might want to force a specific look or ensure classes are applied.
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
}

// Expose to window
window.toggleTheme = toggleTheme;

// Init on load
document.addEventListener('DOMContentLoaded', initTheme);
