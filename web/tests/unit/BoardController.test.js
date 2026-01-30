import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BoardController } from '../../js/controllers/BoardController.js';
import { boardService } from '../../js/services/BoardService.js';

// Mock dependencies
vi.mock('../../js/services/BoardService.js');
vi.mock('../../js/api.js', () => ({
    apiCall: vi.fn(),
}));
vi.mock('../../js/i18n.js', () => ({
    i18n: { t: (key) => key }
}));
vi.mock('../../js/views/BoardView.js', () => ({
    BoardView: class {
        render() { }
    }
}));
vi.mock('../../js/lib/Router.js', () => ({
    router: { navigate: vi.fn() }
}));

describe('BoardController Polling', () => {
    let controller;

    beforeEach(() => {
        vi.useFakeTimers();
        controller = new BoardController();
        controller.boardId = 'test-board';
        controller.handleVoteUpdate = vi.fn(); // Mock UI update handler
        // Silence logs
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        controller.lastPollState = new Map(); // Initialize manually since we skip init()
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('should NOT update UI if votes are unchanged (Smart Diffing)', async () => {
        const mockBoard = {
            columns: [{
                cards: [{ id: 'card1', votes: [{ vote_type: 'like' }] }]
            }]
        };

        vi.mocked(boardService.getById).mockResolvedValue(mockBoard);

        // First Poll - Should Update (Initial State)
        await controller.syncBoardState();
        expect(controller.handleVoteUpdate).toHaveBeenCalledTimes(1);
        expect(controller.handleVoteUpdate).toHaveBeenCalledWith({
            card_id: 'card1', likes: 1, dislikes: 0
        });

        // Clear mock to test second poll
        controller.handleVoteUpdate.mockClear();

        // Second Poll - Same Data -> No Update
        await controller.syncBoardState();
        expect(controller.handleVoteUpdate).not.toHaveBeenCalled();
    });

    it('should update UI if votes change', async () => {
        const initialBoard = {
            columns: [{
                cards: [{ id: 'card1', votes: [] }]
            }]
        };
        const updatedBoard = {
            columns: [{
                cards: [{ id: 'card1', votes: [{ vote_type: 'like' }] }] // 1 Like added
            }]
        };

        // First Poll
        vi.mocked(boardService.getById).mockResolvedValue(initialBoard);
        await controller.syncBoardState();
        controller.handleVoteUpdate.mockClear();

        // Second Poll with New Data
        vi.mocked(boardService.getById).mockResolvedValue(updatedBoard);
        await controller.syncBoardState();

        expect(controller.handleVoteUpdate).toHaveBeenCalledTimes(1);
        expect(controller.handleVoteUpdate).toHaveBeenCalledWith({
            card_id: 'card1', likes: 1, dislikes: 0
        });
    });

    it('should implement exponential backoff on failure', async () => {
        controller.isPolling = true;
        // Mock setTimeout to capture delay but NOT auto-execute recursively
        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

        vi.mocked(boardService.getById).mockRejectedValue(new Error('Network Error'));

        // Trigger Poll (Single Iteration)
        await controller.pollLoop();

        // Check if failure count increased
        expect(controller.pollFailures).toBe(1);

        // Check if next poll was scheduled with backoff
        // 3000 * 1.5 = 4500
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        const lastCallDelay = setTimeoutSpy.mock.calls[0][1];
        expect(lastCallDelay).toBe(4500);
    });
});
