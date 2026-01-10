import { Controller } from '../lib/Controller.js';
import { loadBoard } from '../board.js'; // Temporarily importing legacy loadBoard
import { i18n } from '../i18n.js';
import { boardService } from '../services/BoardService.js';
import { router } from '../lib/Router.js'; // Use router directly
window.router = router; // Ensure global availability if needed for inline hacks, though explicit import is better

export class BoardController extends Controller {
    constructor() {
        super();
        this.boardId = null;
    }

    async init(params) {
        console.log('BoardController initialized with params:', params);
        if (!params.id) {
            console.error('BoardController: No board ID provided');
            return;
        }

        this.boardId = params.id;
        this.showView();

        // LEGACY BRIDGE: Call the old loadBoard logic
        // This is the first step of the Wrapper Pattern defined in the plan.
        await loadBoard(this.boardId);
    }

    showView() {
        document.getElementById('dashboardView').style.display = 'none';
        const actionItemsView = document.getElementById('actionItemsView');
        if (actionItemsView) actionItemsView.style.display = 'none';
        const adminView = document.getElementById('adminView');
        if (adminView) adminView.style.display = 'none';
        const teamsView = document.getElementById('teamsView');
        if (teamsView) teamsView.style.display = 'none';

        document.getElementById('boardContainer').style.display = 'block';

        // Visibility Logic (previously in board.js loadBoard)
        if (document.getElementById('dashboardBtn')) document.getElementById('dashboardBtn').style.display = 'inline-block';
        if (document.getElementById('leaveBoardBtn')) document.getElementById('leaveBoardBtn').style.display = 'inline-block';
        if (document.getElementById('editUserBtn')) document.getElementById('editUserBtn').style.display = 'inline-block';
        if (document.getElementById('newBoardBtn')) document.getElementById('newBoardBtn').style.display = 'none';
    }

    async leave() {
        if (!this.boardId) return;
        if (!confirm(i18n.t('confirm.leave_board'))) return;

        try {
            await boardService.leave(this.boardId, window.currentUser);
            // Router will handle view switching
            window.router.navigate('dashboard');
        } catch (error) {
            console.error('Failed to leave board:', error);
            alert('Failed to leave board: ' + error.message);
        }
    }

    async destroy() {
        console.log('BoardController destroyed');
        // TODO: Implement cleanup logic (leave board, close WS, etc.)
        // Currently handled partially by main.js logic when switching views, 
        // but needs to be moved here.
    }
}

export const boardController = new BoardController();
