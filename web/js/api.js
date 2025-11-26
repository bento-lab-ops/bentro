// API and WebSocket Handling

// Initialize WebSocket
function initWebSocket() {
    window.ws = new WebSocket(WS_URL);

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

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'timer_update':
            updateTimerDisplay(message.data.seconds);
            break;
        case 'timer_start':
            startTimerUI(message.data.seconds);
            break;
        case 'timer_stop':
            stopTimerUI();
            break;
        case 'phase_change':
            updatePhase(message.data.phase);
            break;
        case 'board_update':
            if (document.getElementById('dashboardView').style.display !== 'none') {
                loadBoards();
            }
            if (window.currentBoard && window.currentBoard.id === message.data.board_id) {
                loadBoard(window.currentBoard.id);
            }
            break;
        case 'participants_update':
            if (window.currentBoard && window.currentBoard.id === message.data.board_id) {
                updateParticipantsDisplay(message.data.participants);
            }
            break;
    }
}

function sendWebSocketMessage(type, data) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ type, data }));
    }
}

function joinBoard(boardId, username, avatar) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
            type: 'join_board',
            board_id: boardId,
            username: username,
            avatar: avatar || getUserAvatar()
        }));
    }
}

function leaveBoard(boardId, username) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
            type: 'leave_board',
            board_id: boardId,
            username: username
        }));
    }
}

// API Functions
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
}
