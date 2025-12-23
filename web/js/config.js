// Application Configuration
const APP_VERSION = 'v0.3.1';
const API_BASE = '/api';
// Auto-detect WebSocket protocol based on page protocol (ws:// for HTTP, wss:// for HTTPS)
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;
