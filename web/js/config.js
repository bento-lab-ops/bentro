// Application Configuration
export const CONFIG = {
    API_URL: '/api' // Relative to origin for ingress/proxy
};

export const APP_VERSION = 'v0.13.0-rc11';

// Global Shim
window.CONFIG = CONFIG;
window.API_BASE = CONFIG.API_URL; // Changed from API_BASE to API_URL
window.APP_VERSION = APP_VERSION; // Changed from CONFIG.APP_VERSION to APP_VERSION
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;
