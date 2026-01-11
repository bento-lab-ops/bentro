import { apiCall } from '../api.js';

export class BoardService {
    async getAll() {
        return await apiCall('/boards');
    }

    async getById(id) {
        return await apiCall(`/boards/${id}`);
    }

    async create(data) {
        return await apiCall('/boards', 'POST', data);
    }

    async join(boardId, user) {
        return await apiCall(`/boards/${boardId}/join`, 'POST', user);
    }

    async leave(boardId, username) {
        return await apiCall(`/boards/${boardId}/leave`, 'POST', { username });
    }

    async updateStatus(boardId, status) {
        // This endpoint might be PUT /boards/:id/status
        return await apiCall(`/boards/${boardId}/status`, 'PUT', { status });
    }

    async delete(boardId) {
        return await apiCall(`/boards/${boardId}`, 'DELETE');
    }

    async voteCard(cardId, user, type) {
        return await apiCall(`/cards/${cardId}/votes`, 'POST', {
            user_name: user,
            vote_type: type
        });
    }

    async addCard(columnId, content, user) {
        return await apiCall('/cards', 'POST', {
            column_id: columnId,
            content: content,
            owner: user
        });
    }

    async updateCard(cardId, content) {
        return await apiCall(`/cards/${cardId}`, 'PUT', { content });
    }

    async deleteCard(cardId) {
        return await apiCall(`/cards/${cardId}`, 'DELETE');
    }
}

export const boardService = new BoardService();
