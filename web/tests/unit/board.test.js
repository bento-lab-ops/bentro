/**
 * @jest-environment jsdom
 */

import { createCard, claimManagerAction } from '../../js/board.js';
import { apiCall, sendWebSocketMessage } from '../../js/api.js';

// Mocks
jest.mock('../../js/api.js', () => ({
    apiCall: jest.fn(),
    sendWebSocketMessage: jest.fn(),
    joinBoard: jest.fn()
}));
jest.mock('../../js/i18n.js', () => ({ i18n: { t: k => k } }));
jest.mock('../../js/utils.js', () => ({ escapeHtml: s => s }));

describe('board.js Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup Window Globals
        window.currentBoard = { id: 'board-123', owner: 'other' };
        window.currentUser = 'me';
        window.boardController = { load: jest.fn() };
        window.confirm = jest.fn(() => true);
        window.alert = jest.fn();
        // Shim loadBoard if checked
        window.loadBoard = jest.fn();
    });

    describe('createCard', () => {
        test('should call API with correct payload and reload board', async () => {
            await createCard('col-1', 'Test Content');

            // Verify API Call
            expect(apiCall).toHaveBeenCalledWith('/columns/col-1/cards', 'POST', {
                content: 'Test Content',
                position: 0
            });

            // Verify Reload (uses boardController since it is defined)
            expect(window.boardController.load).toHaveBeenCalledWith('board-123');

            // Verify Websocket
            expect(sendWebSocketMessage).toHaveBeenCalledWith('board_update', { board_id: 'board-123' });
        });

        test('should handle API error gracefully', async () => {
            const error = new Error('API Error');
            apiCall.mockRejectedValue(error);
            console.error = jest.fn(); // Silence error logs

            await createCard('col-1', 'Fail');

            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to create card'));
            expect(window.boardController.load).not.toHaveBeenCalled();
        });
    });

    describe('claimManagerAction', () => {
        test('should claim board via API if confirmed', async () => {
            await claimManagerAction();

            expect(window.confirm).toHaveBeenCalled();
            expect(apiCall).toHaveBeenCalledWith('/boards/board-123/claim', 'POST', { owner: 'me' });
            expect(window.boardController.load).toHaveBeenCalledWith('board-123');
        });

        test('should not call API if user cancels', async () => {
            window.confirm.mockReturnValue(false);

            await claimManagerAction();

            expect(apiCall).not.toHaveBeenCalled();
            expect(window.boardController.load).not.toHaveBeenCalled();
        });

        test('should do nothing if currentBoard is missing', async () => {
            window.currentBoard = null;
            await claimManagerAction();
            expect(window.confirm).not.toHaveBeenCalled();
        });
    });
});
