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
}

export const boardService = new BoardService();
