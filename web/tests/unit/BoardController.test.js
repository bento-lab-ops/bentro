// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardController } from '../../js/controllers/BoardController.js';
import { boardService } from '../../js/services/BoardService.js';
import { BoardView } from '../../js/views/BoardView.js';

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
    location: { hash: '' }
});

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
        controller = new BoardController();
    });

    describe('handleVote', () => {
        it('should NOT call boardService.voteCard if phase is not "voting"', async () => {
            // Setup
            controller.board = { phase: 'discuss' };
            const cardId = 'card-123';
            const type = 'up';

            // Act
            await controller.handleVote(cardId, type);

            // Assert
            expect(boardService.voteCard).not.toHaveBeenCalled();
            // Code uses window.showAlert, not alert
            expect(window.showAlert).toHaveBeenCalledWith(expect.any(String), 'alert.voting_closed');
        });

        it('should call boardService.voteCard if phase IS "voting"', async () => {
            // Setup
            controller.board = { phase: 'voting' };
            const cardId = 'card-123';
            const type = 'up';
            boardService.voteCard.mockResolvedValue({});

            // Mock loadBoardData to prevent actual loading
            controller.loadBoardData = vi.fn();

            // Act
            await controller.handleVote(cardId, type);

            // Assert
            expect(boardService.voteCard).toHaveBeenCalledWith(cardId, 'TestUser', type);
            expect(controller.loadBoardData).toHaveBeenCalled();
        });
    });
});
