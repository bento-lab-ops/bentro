// Application Configuration
const CONFIG = {
    API_BASE: '/api',
    APP_VERSION: 'v0.10.64'
};
const API_BASE = '/api';
const APP_VERSION = CONFIG.APP_VERSION;
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;
