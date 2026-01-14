/**
 * @vi-environment jsdom
 */

import { DashboardController } from '../../js/controllers/DashboardController.js';
import { boardService } from '../../js/services/BoardService.js';

// Mocks
vi.mock('../../js/services/BoardService.js', () => ({
    boardService: {
        getAll: vi.fn(),
        join: vi.fn(),
        create: vi.fn()
    }
}));

vi.mock('../../js/i18n.js', () => ({
    i18n: { t: k => k }
}));

vi.mock('../../js/utils.js', () => ({
    escapeHtml: s => s
}));

// Mock Router globally
window.router = {
    navigate: vi.fn()
};

describe('DashboardController', () => {
    let dashboardController;
    let mockGrid;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup DOM
        document.body.innerHTML = `
            <div id="dashboardView">
                <div id="dashboardGrid"></div>
                <div id="emptyDashboard" style="display: none;">msg.no_boards</div>
                <button id="filterActiveBtn" class="team-nav-tab active"></button>
                <button id="filterFinishedBtn" class="team-nav-tab"></button>
                <div id="boardContainer"></div>
            </div>
            <div id="newBoardBtn"></div>
        `;

        mockGrid = document.getElementById('dashboardGrid');
        dashboardController = new DashboardController();

        // Mock window functions called by rendered HTML
        window.joinBoardPersistent = vi.fn();
        window.deleteBoard = vi.fn(); // Logic relies on global deleteBoard?
        window.updateBoardStatus = vi.fn();

        // Ensure applyDashboardFilters exists
        window.applyDashboardFilters = vi.fn();
    });

    test('loadBoards should fetch and render active boards by default', async () => {
        const mockBoards = [
            { id: '1', name: 'Active Board', status: 'active' },
            { id: '2', name: 'Finished Board', status: 'finished' }
        ];
        boardService.getAll.mockResolvedValue(mockBoards);

        await dashboardController.loadBoards();

        expect(boardService.getAll).toHaveBeenCalled();
        expect(mockGrid.children.length).toBe(1);
        expect(mockGrid.innerHTML).toContain('Active Board');
        expect(dashboardController.cache).toEqual(mockBoards);
        // Ensure empty state hidden
        expect(document.getElementById('emptyDashboard').style.display).toBe('none');
    });

    test('should update view when filtering', async () => {
        // Setup Cache
        dashboardController.cache = [
            { id: '1', name: 'Active Board', status: 'active' },
            { id: '2', name: 'Finished Board', status: 'finished' }
        ];

        // Filter 'finished'
        dashboardController.filterBoards('finished');

        expect(mockGrid.innerHTML).toContain('Finished Board');
        expect(mockGrid.innerHTML).not.toContain('Active Board');
        expect(document.getElementById('filterFinishedBtn').classList.contains('active')).toBe(true);
    });

    test('renderBoards should handle empty list', () => {
        dashboardController.renderList([]); // Corrected method name to renderList as used in class
        // Expect empty state to be visible
        const emptyState = document.getElementById('emptyDashboard');
        expect(emptyState.style.display).toBe('flex');
    });

    // Reproduction Scenario: Reactivity Test
    // If we rely on window.deleteBoard to call controller.loadBoards(), we assume the integration works.
    // Here we test if calling loadBoards() REFRESHES the view based on new data.
    test('loadBoards should remove deleted board from view', async () => {
        // 1. Initial Load
        const initialBoards = [{ id: '1', name: 'Board A', status: 'active' }];
        boardService.getAll.mockResolvedValue(initialBoards);
        await dashboardController.loadBoards();

        expect(mockGrid.children.length).toBe(1);
        expect(document.getElementById('emptyDashboard').style.display).toBe('none');

        // 2. Simulate "Delete" (Service returns empty array)
        boardService.getAll.mockResolvedValue([]);

        // 3. Reload
        await dashboardController.loadBoards();

        // Expect View to be empty grid and Empty State VISIBLE
        expect(mockGrid.children.length).toBe(0);
        expect(document.getElementById('emptyDashboard').style.display).toBe('flex');
    });

    test('loadBoards should maintain current filter after reload', async () => {
        // 1. Load Data
        const boards = [
            { id: '1', name: 'Active', status: 'active' },
            { id: '2', name: 'Finished', status: 'finished' }
        ];
        boardService.getAll.mockResolvedValue(boards);

        // 2. Set Filter to 'finished'
        dashboardController.filterBoards('finished');

        // 3. Reload (e.g. after status update)
        // Assume service data changed (e.g. added another finished board)
        const newBoards = [
            ...boards,
            { id: '3', name: 'New Finished', status: 'finished' }
        ];
        boardService.getAll.mockResolvedValue(newBoards);

        await dashboardController.loadBoards();

        // 4. Expect 'finished' filter to still be applied and show 2 finished boards
        expect(dashboardController.currentFilter).toBe('finished');
        // If it reset to default 'active', we would see 1 board (Active).
        // If it kept 'finished', we see 2 (Finished, New Finished).
        const renderedText = mockGrid.textContent || mockGrid.innerText;
        expect(renderedText).toContain('Finished');
        expect(renderedText).toContain('New Finished');
        expect(renderedText).not.toContain('Active');
    });
});
