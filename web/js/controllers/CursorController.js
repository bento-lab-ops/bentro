import { sendWebSocketMessage } from '../api.js';

export class CursorController {
    constructor(boardId, containerId) {
        this.boardId = boardId;
        this.container = document.getElementById(containerId);
        this.cursors = new Map(); // userId -> { element, timeout }
        this.selfId = window.currentUser || 'anon';
        this.lastSend = 0;
        this.THROTTLE_MS = 500; // 2 updates per second

        // Bind methods
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.onCursorMove = this.onCursorMove.bind(this);

        console.log('🖱️ CursorController initialized');
    }

    init() {
        if (!this.container) return;

        // Listen for local mouse movement
        this.container.addEventListener('mousemove', this.handleMouseMove);

        // Listen for remote cursor events
        window.addEventListener('cursor:move', this.onCursorMove);
    }

    destroy() {
        this.container.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('cursor:move', this.onCursorMove);
        this.removeAllCursors();
    }

    handleMouseMove(e) {
        const now = Date.now();
        if (now - this.lastSend < this.THROTTLE_MS) return;

        this.lastSend = now;

        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width; // Relative 0-1
        const y = (e.clientY - rect.top) / rect.height; // Relative 0-1

        // Broad boundary check
        if (x < 0 || x > 1 || y < 0 || y > 1) return;

        sendWebSocketMessage('cursor_move', {
            board_id: this.boardId,
            user: window.currentUser,
            x: x.toFixed(4), // Optimize payload
            y: y.toFixed(4)
        });
    }

    onCursorMove(e) {
        const data = e.detail;

        // Ignore self and other boards
        if (data.board_id !== this.boardId) return;
        if (data.user === this.selfId) return;

        this.updateCursor(data.user, data.x, data.y);
    }

    updateCursor(user, x, y) {
        let cursor = this.cursors.get(user);

        if (!cursor) {
            // Create new cursor element
            const el = document.createElement('div');
            el.className = 'remote-cursor';
            el.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L11.7841 12.3673H5.65376Z" fill="#${this.stringToColor(user)}" stroke="white"/>
                </svg>
                <div class="cursor-label" style="background-color: #${this.stringToColor(user)}">${user}</div>
            `;
            this.container.appendChild(el);
            cursor = { element: el, timeout: null };
            this.cursors.set(user, cursor);
        }

        // Update Position
        // Use requestAnimationFrame for smoothness if needed, but throttle limits it anyway
        cursor.element.style.left = `${x * 100}%`;
        cursor.element.style.top = `${y * 100}%`;

        // Reset inactivity timeout (cleanup after 5s)
        if (cursor.timeout) clearTimeout(cursor.timeout);
        cursor.timeout = setTimeout(() => {
            if (cursor.element) cursor.element.remove();
            this.cursors.delete(user);
        }, 5000);
    }

    removeAllCursors() {
        this.cursors.forEach(c => {
            if (c.element) c.element.remove();
            if (c.timeout) clearTimeout(c.timeout);
        });
        this.cursors.clear();
    }

    // Hash string to color for consistent user colors
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }
}
