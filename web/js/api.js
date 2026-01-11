// API and WebSocket Handling
import { CONFIG } from './config.js'; // Import dependency

const API_BASE = CONFIG.API_BASE; // Local constant for module use

// Initialize WebSocket
export function initWebSocket() {
    const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;

    window.ws = new WebSocket(WS_URL);
    // ... (rest of initWebSocket body is identical, but we attach variables to window inside)
    window.ws.onopen = () => {
        console.log('%c🔌 WebSocket Connected', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;');
    };

    window.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };

    window.ws.onclose = () => {
        console.log('%c🔌 WebSocket Disconnected - Reconnecting...', 'background: #FF9800; color: white; padding: 2px 6px; border-radius: 3px;');
        setTimeout(initWebSocket, 3000);
    };

    window.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

export function handleWebSocketMessage(message) {
    // ... (rest of function)
    // Event-driven WebSocket Handling
    const eventName = message.type.replace('_', ':'); // e.g., 'board_update' -> 'board:update'

    // Dispatch generic event
    window.dispatchEvent(new CustomEvent(eventName, { detail: message.data }));

    // TODO: Remove Legacy shims once fully migrated
    // Legacy support for parts not yet coupled (like Timer UI in Header if not in Controller)
    switch (message.type) {
        case 'timer_update':
            // BoardController or TimerComponent should listen to 'timer:update'
            if (window.updateTimerDisplay) window.updateTimerDisplay(message.data.seconds);
            break;
        case 'timer_start':
            if (window.startTimerUI) window.startTimerUI(message.data.seconds);
            break;
        case 'timer_stop':
            if (window.stopTimerUI) window.stopTimerUI();
            break;
        case 'phase_change':
            // BoardController listens to 'phase:change'
            if (window.updatePhase) window.updatePhase(message.data.phase);
            break;
        case 'board_update':
            // DashboardController listens to 'board:update' (global)
            // BoardController listens to 'board:update' (specific)
            if (document.getElementById('dashboardView') && window.loadBoards) {
                window.loadBoards();
            }
            // window.loadBoard calls removed here, BoardController must handle it
            break;
        case 'participants_update':
            // BoardController listens to 'participants:update'
            if (window.updateParticipantsDisplay && window.currentBoard && window.currentBoard.id === message.data.board_id) {
                window.updateParticipantsDisplay(message.data.participants);
            }
            break;
    }
}

export function sendWebSocketMessage(type, data) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ type, data }));
    }
}

export function joinBoard(boardId, username, avatar) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
            type: 'join_board',
            board_id: boardId,
            username: username,
            avatar: avatar || (window.getUserAvatar ? window.getUserAvatar() : ''),
            is_admin: !!localStorage.getItem('adminToken')
        }));
    }
}

export function toggleReaction(cardId, reactionType) {
    return apiCall(`/cards/${cardId}/reactions`, 'POST', {
        user_name: window.currentUser,
        reaction_type: reactionType
    });
}

export function leaveBoard(boardId, username) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
            type: 'leave_board',
            board_id: boardId,
            username: username
        }));
    }
}

// API Functions
export async function apiCall(endpoint, method = 'GET', body = null) {
    // ... (rest is same)
    const options = {
        method,
        headers: {},
    };

    if (body) {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
    }

    const authToken = document.cookie.split('; ').find(row => row.startsWith('auth_token='));
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken.split('=')[1]}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    let data;
    const text = await response.text();
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error('API Parse Error:', e, 'Response:', text);
        throw new Error(`Server Error: ${text.substring(0, 50)}...`);
    }

    if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
}

// Auth API
export function login(email, password) {
    return apiCall('/auth/login', 'POST', { email, password });
}

export function register(data) {
    return apiCall('/auth/register', 'POST', data);
}

export function logout() {
    return apiCall('/auth/logout', 'POST');
}

// Global Shims
window.initWebSocket = initWebSocket;
window.handleWebSocketMessage = handleWebSocketMessage;
window.sendWebSocketMessage = sendWebSocketMessage;
window.joinBoard = joinBoard;
window.toggleReaction = toggleReaction;
window.leaveBoard = leaveBoard;
window.apiCall = apiCall;
window.login = login;
window.register = register;
window.logout = logout;


