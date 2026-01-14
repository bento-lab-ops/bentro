import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardService } from '../../js/services/BoardService.js';
import { apiCall } from '../../js/api.js';

vi.mock('../../js/api.js');

describe('BoardService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getAll should call GET /boards', async () => {
        await boardService.getAll();
        expect(apiCall).toHaveBeenCalledWith('/boards');
    });

    it('getById should call GET /boards/:id with timestamp', async () => {
        const id = '123';
        await boardService.getById(id);
        expect(apiCall).toHaveBeenCalledWith(expect.stringContaining('/boards/123?t='));
    });

    it('create should call POST /boards', async () => {
        const data = { name: 'New Board' };
        await boardService.create(data);
        expect(apiCall).toHaveBeenCalledWith('/boards', 'POST', data);
    });

    it('voteCard should call POST /cards/:id/votes', async () => {
        await boardService.voteCard('card-1', 'user-1', 'up');
        expect(apiCall).toHaveBeenCalledWith('/cards/card-1/votes', 'POST', {
            user_name: 'user-1',
            vote_type: 'up'
        });
    });

    it('moveCard should call PUT /cards/:id/move', async () => {
        await boardService.moveCard('card-1', 'col-2');
        expect(apiCall).toHaveBeenCalledWith('/cards/card-1/move', 'PUT', { column_id: 'col-2' });
    });

    it('mergeCard should call POST /cards/:id/merge', async () => {
        await boardService.mergeCard('src', 'target');
        expect(apiCall).toHaveBeenCalledWith('/cards/src/merge', 'POST', { target_card_id: 'target' });
    });

    it('unmergeCard should call POST /cards/:id/unmerge', async () => {
        await boardService.unmergeCard('card-1');
        expect(apiCall).toHaveBeenCalledWith('/cards/card-1/unmerge', 'POST');
    });
});
