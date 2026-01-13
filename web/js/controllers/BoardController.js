import { Controller } from '../lib/Controller.js';
// import { loadBoard } from '../board.js'; // LEGACY REMOVED
import { i18n } from '../i18n.js';
import { boardService } from '../services/BoardService.js';
import { router } from '../lib/Router.js';
import { BoardView } from '../views/BoardView.js';
import { apiCall } from '../api.js';
import { playTimerSound } from '../timer.js';

export class BoardController extends Controller {
    constructor() {
        super();
        this.boardId = null;
        this.board = null;
        this.view = new BoardView('columnsContainer');
        this.eventsBound = false;

        // Bind handlers once in constructor
        this.handleClick = this.handleClick.bind(this);
        // drag handlers removed
    }

    async init(params) {
        console.log('BoardController initialized with params:', params);
        if (!params.id) {
            console.error('BoardController: No board ID provided');
            return;
        }

        this.boardId = params.id;
        this.board = null;

        await this.loadBoardData();
        this.showView();

        this.bindEvents();
        this.bindWebSocketEvents();
    }

    bindWebSocketEvents() {
        this.wsHandlers = {
            onBoardUpdate: (e) => {
                if (e.detail.board_id === this.boardId) {
                    console.log('BoardController: Received External Update');
                    this.loadBoardData();
                }
            },
            onPhaseChange: (e) => {
                if (e.detail.board_id === this.boardId) {
                    console.log('BoardController: Phase Changed', e.detail.phase);
                    this.loadBoardData();
                }
            },
            onParticipantsUpdate: (e) => {
                if (e.detail.board_id === this.boardId) {
                    // Update participants UI
                }
            },
            onTimerStart: (e) => {
                console.log('Timer Start Event', e.detail);
                if (this.startTimerUI) this.startTimerUI(e.detail.seconds);
            },
            onTimerStop: (e) => {
                console.log('Timer Stop Event');
                if (this.stopTimerUI) this.stopTimerUI();
            }
        };

        window.addEventListener('board:update', this.wsHandlers.onBoardUpdate);
        window.addEventListener('phase:change', this.wsHandlers.onPhaseChange);
        window.addEventListener('participants:update', this.wsHandlers.onParticipantsUpdate);
        window.addEventListener('timer:start', this.wsHandlers.onTimerStart);
        window.addEventListener('timer:stop', this.wsHandlers.onTimerStop);
    }

    stopPolling() {
        this.destroy();
    }

    destroy() {
        super.destroy();
        console.log('BoardController destroyed');

        if (this.wsHandlers) {
            window.removeEventListener('board:update', this.wsHandlers.onBoardUpdate);
            window.removeEventListener('phase:change', this.wsHandlers.onPhaseChange);
            window.removeEventListener('participants:update', this.wsHandlers.onParticipantsUpdate);
            window.removeEventListener('timer:start', this.wsHandlers.onTimerStart);
            window.removeEventListener('timer:stop', this.wsHandlers.onTimerStop);
        }

        if (this.cleanup) this.cleanup();
    }

    async loadBoardData() {
        try {
            this.board = await boardService.getById(this.boardId);
            console.log('BoardController: State Updated', this.board);

            // Sync with global legacy state
            window.currentBoard = this.board;
            if (this.board.phase) window.currentPhase = this.board.phase;

            // Render View
            this.view.render(this.board, window.currentUser, this.selectedCardId);

            // Initialize Sortable
            this.initSortable();

        } catch (error) {
            console.error('BoardController: Failed to load data', error);
        }
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

        // Visibility Logic handled by View rendering mostly
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
            window.router.navigate('dashboard');
        } catch (error) {
            console.error('Failed to leave board:', error);
            window.router.navigate('dashboard');
        }
    }

    bindEvents() {
        const container = document.getElementById('boardContainer');
        if (!container) return;

        // Prevent duplicate binding if same instance reused
        if (this.eventsBound) {
            console.log('BoardController: Events already bound, skipping.');
            return;
        }

        this.cleanup = () => {
            if (!this.eventsBound) return;
            container.removeEventListener('click', this.handleClick);
            // Native DnD listeners removed
            this.eventsBound = false;
            console.log('BoardController: Events cleaned up');
        };

        container.addEventListener('click', this.handleClick);
        // Native DnD listeners removed

        this.eventsBound = true;
        console.log('BoardController: Events bound');
    }

    async handleClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        e.preventDefault(); // Prevent default link behavior if any

        console.log('BoardController: Action Triggered', action, target.dataset);

        switch (action) {
            case 'vote':
                await this.handleVote(target.dataset.cardId, target.dataset.voteType);
                break;
            case 'addItem':
                this.handleAddItem(target.dataset.columnId);
                break;
            case 'itemEdit': // Using itemEdit to distinguish from column
                // Content might be in dataset or we fetch it?
                // Usually edit button doesn't have content.
                // We pass ID and let handler find it or just open modal.
                this.handleEditItem(target.dataset.cardId, target.dataset.content);
                break;
            case 'itemDelete':
                this.handleDeleteItem(target.dataset.cardId);
                break;
            case 'addColumn':
                this.handleAddColumn();
                break;
            case 'columnEdit':
                this.handleEditColumn(target.dataset.columnId);
                break;
            case 'columnDelete':
                this.handleDeleteColumn(target.dataset.columnId);
                break;
            case 'deleteBoard':
                this.handleDeleteBoard();
                break;
            case 'manageTeams':
                if (typeof window.openManageTeamsModal === 'function') {
                    window.openManageTeamsModal();
                } else {
                    console.warn('Manage Teams modal not found');
                    alert('Feature not available');
                }
                break;
            case 'switchPhase':
                this.handleSwitchPhase();
                break;
            case 'startTimer':
                this.handleStartTimer();
                break;
            case 'stopTimer':
                this.handleStopTimer();
                break;
            case 'reactionToggle':
                this.handleReactionToggle(target.dataset.cardId, target.dataset.reactionType);
                break;
            case 'reactionPicker':
                // This might need the actual element reference to position a popover?
                // Or just toggle a class on the card? 
                // View implemented it as "onclick=showReactionPicker".
                // Data-action "reactionPicker" on the button.
                // We can find the picker inside the button or card.
                this.handleReactionPicker(target);
                break;
            case 'toggleActionItem':
                // It's a button, so check 'active' class to determine current state
                const isCurrentlyAction = target.classList.contains('active');
                this.handleToggleActionItem(target.dataset.cardId, !isCurrentlyAction);
                break;
            case 'openActionModal':
                this.handleOpenActionModal(target.dataset.cardId);
                break;
            case 'unmerge':
                this.handleUnmerge(target.dataset.cardId);
                break;
            case 'claimManager':
                this.handleClaimManager();
                break;
            case 'unclaimManager':
                this.handleUnclaimManager();
                break;
            case 'finishRetro':
                this.handleFinishRetro();
                break;
            case 'reopenRetro':
                this.handleReopenRetro();
                break;
            case 'openSettings':
                this.openSettingsModal();
                break;
            case 'exportBoard':
                this.handleExportBoard();
                break;
            case 'leaveBoard':
                if (typeof window.leaveBoardPersistent === 'function') {
                    window.leaveBoardPersistent();
                } else {
                    alert("Leave board function not found");
                }
                break;
            case 'saveSettings':
                this.handleSaveSettings();
                break;
            case 'selectCard':
                this.handleSelectCard(target.dataset.cardId);
                break;
            case 'cancelSelection':
                this.handleCancelSelection();
                break;
            case 'mergeCard':
                this.handleMergeCard(target.dataset.cardId);
                break;
        }
    }

    async handleReactionToggle(cardId, type) {
        const { toggleReaction } = await import('../api.js');
        try {
            await toggleReaction(cardId, type);
        } catch (e) {
            console.error(e);
        }
    }

    handleReactionPicker(btn) {
        const picker = btn.querySelector('.reaction-picker') || btn.parentElement.querySelector('.reaction-picker');
        if (picker) {
            const isVisible = picker.style.display === 'flex' || picker.style.display === 'block';
            document.querySelectorAll('.reaction-picker').forEach(p => p.style.display = 'none');
            if (!isVisible) {
                picker.style.display = 'flex';
                const close = (e) => {
                    if (!picker.contains(e.target) && !btn.contains(e.target)) {
                        picker.style.display = 'none';
                        document.removeEventListener('click', close);
                    }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            }
        }
    }
    // ...
    // ...
    async handleToggleActionItem(cardId, isActionItem) {
        console.log('Toggling Action Item Status:', cardId, isActionItem);
        try {
            // We are toggling "Is Action Item", not "Completed"
            await apiCall(`/cards/${cardId}`, 'PUT', {
                is_action_item: isActionItem
            });

            // If turning ON, show the modal to let user set Owner/Due Date
            if (isActionItem) {
                if (window.openActionItemModal) {
                    window.openActionItemModal(cardId);
                } else {
                    console.warn('Action Item Modal function not found on window');
                }
            }

            // WS update triggers reload but we reload just in case
            this.loadBoardData();
        } catch (e) {
            console.error('Action Item toggle failed', e);
            alert('Failed: ' + e.message);
            this.loadBoardData(); // Revert UI
        }
    }

    handleOpenActionModal(cardId) {
        // Legacy Bridge
        if (window.openActionItemModal) {
            window.openActionItemModal(cardId);
        } else {
            alert('Action Item Modal not ported yet.');
        }
    }

    async handleUnmerge(parentId) {
        const parent = this.findCard(parentId);
        if (!parent || !parent.merged_cards || parent.merged_cards.length === 0) {
            alert("No merged cards to unmerge.");
            return;
        }

        // Unmerge the last one (LIFO)
        const lastChild = parent.merged_cards[parent.merged_cards.length - 1];
        if (!confirm(`Unmerge card "${lastChild.content}"?`)) return;

        try {
            console.log(`[Controller] Unmerging child ${lastChild.id} from parent ${parentId}`);
            await boardService.unmergeCard(lastChild.id);
            await this.loadBoardData();
        } catch (e) {
            console.error('[Controller] Unmerge failed:', e);
            alert(e.message);
        }
    }

    async handleSwitchPhase() {
        const newPhase = this.board.phase === 'input' ? 'voting' : 'input';

        // Use Hybrid WebSocket send:
        // 1. Top-level fields for Backend Handler (persists to DB)
        // 2. 'data' wrapper for Frontend api.js Handler (dispatches event)
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({
                type: 'phase_change',
                phase: newPhase,
                board_id: this.boardId,
                data: {
                    phase: newPhase,
                    board_id: this.boardId
                }
            }));
        } else {
            console.warn('WebSocket not connected, cannot switch phase');
            alert('Connection lost. Please refresh.');
        }
    }

    async handleStartTimer() {
        // Need to get minutes from UI
        const minutesInput = document.getElementById('timerMinutes');
        const minutes = minutesInput ? parseInt(minutesInput.value) || 5 : 5;
        const seconds = minutes * 60;

        const { sendWebSocketMessage } = await import('../api.js');
        sendWebSocketMessage('timer_start', { seconds });
    }

    async handleStopTimer() {
        const { sendWebSocketMessage } = await import('../api.js');
        sendWebSocketMessage('timer_stop', {});
    }

    updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }

    startTimerUI(seconds) {
        // Show/Hide buttons handled in View or here?
        // Simplest is here for now.
        this.updateTimerDisplay(seconds);

        if (document.getElementById('startTimerBtn')) document.getElementById('startTimerBtn').style.display = 'none';
        if (document.getElementById('stopTimerBtn')) document.getElementById('stopTimerBtn').style.display = 'inline-block';

        // Start local countdown for smoothness (optional, syncs with server anyway)
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerSeconds = seconds;
        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            if (this.timerSeconds <= 0) {
                this.timerSeconds = 0;
                clearInterval(this.timerInterval);
                playTimerSound();
                // Optionally stop timer via API if this was the leader?
                // For now, let the backend/WS stop it or let the user click stop.
                // Actually, original `timer.js` called `stopTimer()` (which sends WS stop) when it hit 0.
                // We should probably rely on the leader to stop it, OR just stop local UI.
                // If we send 'timer_stop', it stops for everyone.
                // Let's assume the client running the timer (leader) sends the stop.
                // Check if manager?
                // For now, just play sound and clear interval locally.
                // The backend/other clients will sync via WS 'timer:stop' if sent.
            }
            this.updateTimerDisplay(this.timerSeconds);
        }, 1000);

        // Play sound handled by WS event? 
        // Legacy used local counter to trigger sound.
    }

    stopTimerUI() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (document.getElementById('startTimerBtn')) document.getElementById('startTimerBtn').style.display = 'inline-block';
        if (document.getElementById('stopTimerBtn')) document.getElementById('stopTimerBtn').style.display = 'none';
        this.updateTimerDisplay(0);

        // Play Sound?
        // Legacy timer.js played sound on finish.
    }

    handleAddColumn() {
        // Fallback to global modal or prompt
        if (window.openNewColumnModal) {
            window.openNewColumnModal(this.boardId);
        } else {
            const name = prompt(i18n.t('prompt.column_name') || 'Column Name:');
            if (name) {
                this.submitAddColumn(name);
            }
        }
    }

    async submitAddColumn(name) {
        try {
            // Assuming BoardService has createColumn or we use generic apiCall
            await apiCall(`/boards/${this.boardId}/columns`, 'POST', { name });
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    handleEditColumn(columnId) {
        if (window.openEditColumnModal) {
            const col = this.board.columns.find(c => c.id === columnId);
            window.openEditColumnModal(columnId, col ? col.name : '');
        } else {
            // Fallback
            const col = this.board.columns.find(c => c.id === columnId);
            const name = prompt('Edit Column Name:', col ? col.name : '');
            if (name) {
                this.submitEditColumn(columnId, name);
            }
        }
    }

    async submitEditColumn(columnId, name) {
        try {
            await apiCall(`/columns/${columnId}`, 'PUT', { name });
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleDeleteColumn(columnId) {
        if (!confirm(i18n.t('confirm.delete_column'))) return;
        try {
            await apiCall(`/columns/${columnId}`, 'DELETE');
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleVote(cardId, type) {
        if (!cardId || !type) return;

        // Safety check Phase (Local State)
        // If state is not loaded yet, fallback to window or return (safe)
        const currentPhase = this.board ? this.board.phase : (window.currentBoard ? window.currentBoard.phase : null);

        if (currentPhase !== 'voting') {
            console.warn('Voting attempted outside voting phase (Controller Check)');
            alert(i18n.t('alert.voting_closed') || "Voting is only allowed during the Voting phase.");
            return;
        }

        try {
            console.log('BoardController: Voting', { cardId, type });
            await boardService.voteCard(cardId, window.currentUser, type);
            // Optimistic update or wait for WS? 
            // Legacy waited for reload. For now, let's keep it simple:
            // The WS message usually triggers reload/update.
            // But we might want to refresh explicitly if WS is flaky.
            // Legacy: await loadBoard(window.currentBoard.id);
            // New: Refetch board data via Service? 
            // Refresh Data & UI
            await this.loadBoardData();
        } catch (error) {
            console.error('Vote failed:', error);
            alert(error.message);
        }
    }

    handleAddItem(columnId) {
        // Reuse the existing modal logic for now, but routed through Controller
        if (window.openNewCardModal) {
            window.openNewCardModal(columnId);
        } else {
            console.error('openNewCardModal not found');
        }
    }

    async handleDeleteItem(cardId) {
        if (!cardId) return;
        if (!confirm(i18n.t('confirm.delete_card') || 'Delete this card?')) return;

        try {
            await boardService.deleteCard(cardId);
            await this.loadBoardData();
        } catch (error) {
            alert('Failed to delete card: ' + error.message);
        }
    }

    handleEditItem(cardId, content) {
        // This usually opens a modal.
        // We need to find where the modal logic is (openEditCardModal?) or reimplement it.
        // Legacy "editCard(id, content)" might have been the function.
        // Let's assume global `openEditCardModal` exists or inject logic here.
        if (window.openEditCardModal) {
            window.openEditCardModal(cardId, content);
        } else {
            // Fallback: simple prompt if modal missing (TEMPORARY until modal verified)
            // Actually, better to check for the modal element.
            console.error('Edit Modal not found, trying prompt fallback');
            const newContent = prompt('Edit card:', content);
            if (newContent !== null && newContent !== content) {
                this.submitEditCard(cardId, newContent);
            }
        }
    }

    async submitEditCard(cardId, content) {
        try {
            await boardService.updateCard(cardId, content);
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }
    async handleFinishRetro() {
        if (!confirm(i18n.t('confirm.finish_retro'))) return;
        try {
            await apiCall(`/boards/${this.boardId}/status`, 'PUT', { status: 'finished' });
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleReopenRetro() {
        if (!confirm(i18n.t('confirm.reopen_retro'))) return;
        try {
            await apiCall(`/boards/${this.boardId}/status`, 'PUT', { status: 'active' });
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleClaimManager() {
        if (!window.currentUser) {
            alert(i18n.t('alert.login_required') || "Please login to claim host.");
            return;
        }
        if (!confirm(i18n.t('confirm.claim_host') || "Claim hosting of this board?")) return;
        try {
            await apiCall(`/boards/${this.boardId}/claim`, 'POST', { owner: window.currentUser });
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleUnclaimManager() {
        if (!window.currentUser) {
            alert(i18n.t('alert.login_required') || "Please login to unclaim.");
            return;
        }
        if (!confirm(i18n.t('confirm.unclaim_host') || "Relinquish hosting control?")) return;
        try {
            await apiCall(`/boards/${this.boardId}/unclaim`, 'POST', { user: window.currentUser });
            await this.loadBoardData();
        } catch (e) {
            alert(e.message);
        }
    }

    openSettingsModal() {
        if (window.openBoardSettings) {
            window.openBoardSettings(this.boardId);
        } else {
            console.error('Settings Modal not found');
        }
    }

    handleExportBoard() {
        const csvContent = "data:text/csv;charset=utf-8,"
            + this.board.columns.map(col =>
                (col.cards || []).map(c => `"${col.name}","${c.content.replace(/"/g, '""')}","${c.owner}"`).join('\n')
            ).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `board_${this.board.name}_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Merge Logic
    handleSelectCard(cardId) {
        console.log('Selecting Card:', cardId);
        if (this.selectedCardId === cardId) {
            this.handleCancelSelection();
        } else {
            this.selectedCardId = cardId;
            this.view.render(this.board, window.currentUser, this.selectedCardId);
        }
    }

    handleCancelSelection() {
        console.log('Canceling Selection');
        this.selectedCardId = null;
        this.view.render(this.board, window.currentUser, null);
    }

    async handleMergeCard(targetCardId) {
        if (!this.selectedCardId) return;
        if (this.selectedCardId === targetCardId) return;

        try {
            console.log(`[Controller] Attempting merge: ${this.selectedCardId} -> ${targetCardId}`);
            const result = await boardService.mergeCard(this.selectedCardId, targetCardId);
            console.log('[Controller] Merge Result:', result);
            this.selectedCardId = null;
            await this.loadBoardData();
        } catch (e) {
            console.error('[Controller] Merge Failed:', e);
            alert(e.message);
        }
    }

    handleActionItem(cardId) {
        if (window.openActionItemModal) {
            const card = this.findCard(cardId);
            const content = card ? card.content : '';
            window.openActionItemModal(cardId, content);
        } else {
            console.error('Action Item Modal not globally available');
            alert('Action Item Modal not ported yet.');
        }
    }

    findCard(cardId) {
        if (!this.board || !this.board.columns) return null;
        for (const col of this.board.columns) {
            const card = col.cards.find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    // SortableJS Logic
    initSortable() {
        if (typeof Sortable === 'undefined') {
            console.error('SortableJS not loaded');
            return;
        }

        const containers = document.querySelectorAll('.cards-container');
        containers.forEach(container => {
            // Check if already initialized to avoid duplicates? 
            // Better to destroy previous instance or rely on fresh render.
            // Since we re-render full board on update, new DOM elements are created.
            // So we just init on the new elements.

            new Sortable(container, {
                group: 'shared', // Allow dragging between lists
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                delay: 100, // Slight delay to prevent accidental drags on touch
                delayOnTouchOnly: true,
                onEnd: async (evt) => {
                    const itemEl = evt.item;
                    const cardId = itemEl.dataset.id;
                    const toColumnEl = evt.to.closest('.column');
                    const fromColumnEl = evt.from.closest('.column');

                    // If dropped in same list and same position, do nothing (or reorder if we supported it)
                    if (evt.to === evt.from && evt.newIndex === evt.oldIndex) {
                        return;
                    }

                    if (cardId && toColumnEl && toColumnEl.dataset.columnId) {
                        const columnId = toColumnEl.dataset.columnId;
                        console.log(`[Sortable] Moved ${cardId} to Column ${columnId}`);
                        try {
                            await boardService.moveCard(cardId, columnId);
                            // No need to reload, the WS update will trigger reload
                            // But for snappiness we might leave it. 
                            // Actually, if we rely on WS, we might get a flicker revert if WS is slow.
                            // But usually loadBoardData is called after moveCard returns anyway
                            // in previous logic. Let's see.
                            // For now, let's call loadBoardData to confirm state match.
                            this.loadBoardData();
                        } catch (error) {
                            console.error('Move failed:', error);
                            alert('Failed to move card: ' + error.message);
                            // Revert changes on UI if possible? 
                            // Sortable doesn't easily revert unless we reload.
                            this.loadBoardData();
                        }
                    }
                }
            });
        });
    }
}

export const boardController = new BoardController();
