// Application Configuration
export const CONFIG = {
    API_BASE: '/api',
    APP_VERSION: 'v0.13.0-rc9'
};

export const APP_VERSION = 'v0.13.0-rc9';

// Global Shim
window.CONFIG = CONFIG;
window.API_BASE = CONFIG.API_BASE;
window.APP_VERSION = CONFIG.APP_VERSION;
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;
