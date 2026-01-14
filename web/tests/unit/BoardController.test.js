// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardController } from '../../js/controllers/BoardController.js';
import { boardService } from '../../js/services/BoardService.js';
import { BoardView } from '../../js/views/BoardView.js';
import { apiCall } from '../../js/api.js';

// Mocks
vi.mock('../../js/services/BoardService.js');
vi.mock('../../js/views/BoardView.js');
vi.mock('../../js/i18n.js', () => ({
    i18n: {
        t: (key) => key
    }
}));
vi.mock('../../js/api.js', () => ({
    apiCall: vi.fn(),
    sendWebSocketMessage: vi.fn()
}));
vi.mock('../../js/timer.js', () => ({
    playTimerSound: vi.fn()
}));
vi.mock('../../js/lib/Router.js', () => ({
    router: {
        navigate: vi.fn()
    }
}));
vi.mock('../../js/lib/Controller.js', () => ({
    Controller: class {
        destroy() { }
    }
}));

// Helper to update window properties safer
Object.assign(window, {
    currentUser: 'TestUser',
    location: { hash: '' },
    showAlert: vi.fn().mockResolvedValue(),
    showConfirm: vi.fn().mockResolvedValue(true),
    // Mock global modal functions usually present in index.html scripts
    openNewColumnModal: vi.fn(),
    openEditColumnModal: vi.fn(),
    openNewCardModal: vi.fn(),
    openEditCardModal: vi.fn(),
    openManageTeamsModal: vi.fn(),
    openBoardSettings: vi.fn(),
    // Mock WebSocket
    ws: {
        readyState: 1, // WebSocket.OPEN
        send: vi.fn()
    }
});
global.WebSocket = { OPEN: 1 }; // For constant check

describe('BoardController', () => {
    let controller;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window state if needed
        window.currentUser = 'TestUser';

        // BoardView constructor mock
        BoardView.mockImplementation(() => ({
            render: vi.fn(),
            renderHeader: vi.fn()
        }));

        // Setup DOM elements needed
        document.body.innerHTML = `
            <div id="dashboardView"></div>
            <div id="boardContainer" style="display:none;"></div>
            <div id="dashboardBtn"></div>
            <div id="leaveBoardBtn"></div>
            <div id="editUserBtn"></div>
            <div id="newBoardBtn"></div>
        `;

        controller = new BoardController();
    });

    describe('init', () => {
        it('should load board data and show view when valid ID provided', async () => {
            const mockBoard = { id: 'board-1', name: 'Test Board', columns: [] };
            boardService.getById.mockResolvedValue(mockBoard);

            await controller.init({ id: 'board-1' });

            expect(boardService.getById).toHaveBeenCalledWith('board-1');
            expect(controller.board).toEqual(mockBoard);
            expect(document.getElementById('boardContainer').style.display).toBe('block');
        });

        it('should log error if no ID provided', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await controller.init({});
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No board ID'));
            consoleSpy.mockRestore();
        });
    });

    describe('Column CRUD', () => {
        beforeEach(() => {
            controller.boardId = 'board-1';
            apiCall.mockResolvedValue({});
        });

        it('handleAddColumn should assume modal existence (global)', () => {
            controller.handleAddColumn();
            expect(window.openNewColumnModal).toHaveBeenCalledWith('board-1');
        });

        it('submitAddColumn should call API and reload', async () => {
            controller.loadBoardData = vi.fn();

            await controller.submitAddColumn('New Col');

            expect(apiCall).toHaveBeenCalledWith('/boards/board-1/columns', 'POST', { name: 'New Col' });
            expect(controller.loadBoardData).toHaveBeenCalled();
        });

        it('handleDeleteColumn should confirm and call API', async () => {
            controller.loadBoardData = vi.fn();

            await controller.handleDeleteColumn('col-1');

            expect(window.showConfirm).toHaveBeenCalled();
            expect(apiCall).toHaveBeenCalledWith('/columns/col-1', 'DELETE');
            expect(controller.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('Card CRUD', () => {
        beforeEach(() => {
            controller.boardId = 'board-1';
        });

        it('handleAddItem should open modal', () => {
            controller.handleAddItem('col-1');
            expect(window.openNewCardModal).toHaveBeenCalledWith('col-1');
        });

        it('handleDeleteItem should call service', async () => {
            controller.loadBoardData = vi.fn();
            boardService.deleteCard.mockResolvedValue({});

            await controller.handleDeleteItem('card-1');

            expect(window.showConfirm).toHaveBeenCalled();
            expect(boardService.deleteCard).toHaveBeenCalledWith('card-1');
            expect(controller.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('handleVote', () => {
        it('should NOT call boardService.voteCard if phase is not "voting"', async () => {
            controller.board = { phase: 'discuss' };
            const cardId = 'card-123';
            const type = 'up';

            await controller.handleVote(cardId, type);

            expect(boardService.voteCard).not.toHaveBeenCalled();
            expect(window.showAlert).toHaveBeenCalledWith(expect.any(String), 'alert.voting_closed');
        });

        it('should call boardService.voteCard if phase IS "voting"', async () => {
            controller.board = { phase: 'voting' };
            const cardId = 'card-123';
            const type = 'up';
            boardService.voteCard.mockResolvedValue({});
            controller.loadBoardData = vi.fn();

            await controller.handleVote(cardId, type);

            expect(boardService.voteCard).toHaveBeenCalledWith(cardId, 'TestUser', type);
            expect(controller.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('handleSwitchPhase', () => {
        it('should send WebSocket message if connected', async () => {
            controller.boardId = 'board-1';
            controller.board = { phase: 'input' };

            await controller.handleSwitchPhase();

            expect(window.ws.send).toHaveBeenCalled();
            const sentMsg = JSON.parse(window.ws.send.mock.calls[0][0]);
            expect(sentMsg.type).toBe('phase_change');
            expect(sentMsg.phase).toBe('voting');
        });

        it('should warn if WebSocket not connected', async () => {
            controller.boardId = 'board-1';
            controller.board = { phase: 'input' };

            const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const origState = window.ws.readyState;
            window.ws.readyState = 3; // CLOSED

            await controller.handleSwitchPhase();

            expect(spy).toHaveBeenCalled();
            expect(window.showAlert).toHaveBeenCalled();

            window.ws.readyState = origState;
            spy.mockRestore();
        });
    });
});
