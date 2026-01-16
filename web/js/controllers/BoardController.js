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
        console.log('✅ BoardController Instantiated'); // DEBUG
        window.boardController = this; // Expose for debugging
        this.boardId = null;
        this.board = null;
        this.view = new BoardView('columnsContainer');
        this.eventsBound = false;
        this.sortOption = 'position';

        // Bind handlers once in constructor
        this.handleClick = this.handleClick.bind(this);
        // drag handlers removed
    }

    async init(params) {
        console.log('BoardController initialized with params:', params);

        // Cleanup previous instance listeners if any
        this.destroy();

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
        this.lastPollState = new Map(); // Initialize diff cache
        this.startPolling();
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
            },
            onVoteUpdate: (e) => {
                if (e.detail.board_id === this.boardId) {
                    this.handleVoteUpdate(e.detail);
                }
            },
            onCardMove: (e) => {
                if (e.detail.board_id === this.boardId) {
                    console.log('BoardController: Received Card Move Event', e.detail);
                    this.handleCardMove(e.detail);
                }
            }
        };

        window.addEventListener('board:update', this.wsHandlers.onBoardUpdate);
        window.addEventListener('phase:change', this.wsHandlers.onPhaseChange);
        window.addEventListener('participants:update', this.wsHandlers.onParticipantsUpdate);
        window.addEventListener('timer:start', this.wsHandlers.onTimerStart);
        window.addEventListener('timer:stop', this.wsHandlers.onTimerStop);
        window.addEventListener('vote:update', this.wsHandlers.onVoteUpdate);
        window.addEventListener('card:move', this.wsHandlers.onCardMove);
    }

    stopPolling() {
        this.isPolling = false;
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
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
            window.removeEventListener('vote:update', this.wsHandlers.onVoteUpdate);
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
            this.view.render(this.board, window.currentUser, this.selectedCardId, this.sortOption);

            // Initialize Sortable always (to allow moving between columns even if sorted)
            this.initSortable();

        } catch (error) {
            console.error('BoardController: Failed to load data', error);
            if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
                if (window.openLoginModal) {
                    window.openLoginModal();
                    // Optional: Show specific message?
                    // window.showAlert('Authentication Required', 'Please login to view this board.');
                }
            } else {
                // Generic error handling
                if (window.showAlert) window.showAlert('Error', 'Failed to load board: ' + error.message);
            }
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
        if (!await window.showConfirm(i18n.t('confirm.leave_board'), "Are you sure you want to leave this board?")) return;

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

        // Sorting Select
        const sortSelect = document.getElementById('sortCardsSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setSort(e.target.value);
            });
        }

        this.eventsBound = true;
        console.log('BoardController: Events bound');
    }

    setSort(option) {
        console.log('BoardController: Set Sort Option', option);
        this.sortOption = option;

        // Render with new sort option
        if (this.board) {
            this.view.render(this.board, window.currentUser, this.selectedCardId, this.sortOption);

            // Re-initialize DnD always
            this.initSortable();
        }
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
            case 'setSort':
                this.handleSetSort(target.dataset.sort);
                break;
        }
    }

    handleSetSort(option) {
        console.log('BoardController: Setting sort option to', option);
        this.sortOption = option;
        // Re-render
        if (this.board) {
            this.view.render(this.board, window.currentUser, this.selectedCardId, this.sortOption);
            // Re-init sortable ONLY if sort is position (otherwise drag shouldn't work or should be disabled)
            // Actually, if we sort by votes, dragging effectively breaks "position" logic until re-sorted by position.
            // We should probably disable DnD if sort != position, OR just let it act weird.
            // Best to disable DnD if not sorting by position.
            if (this.sortOption === 'position') {
                this.initSortable();
            }
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
            // If turning ON, show the modal FIRST. 
            // The modal's "Save" button will handle the API call to set is_action_item=true.
            if (isActionItem) {
                if (window.actionItemsController) {
                    window.actionItemsController.openEditModal(cardId);
                } else {
                    console.warn('ActionItemsController not found on window');
                    // Fallback if no modal: just toggle it
                    await apiCall(`/cards/${cardId}`, 'PUT', { is_action_item: true });
                    this.loadBoardData();
                }
            } else {
                // If turning OFF, just do it immediately
                await apiCall(`/cards/${cardId}`, 'PUT', { is_action_item: false });
                this.loadBoardData();
            }
        } catch (e) {
            console.error('Action Item toggle failed', e);
            alert('Failed: ' + e.message);
            this.loadBoardData(); // Revert UI
        }
    }

    handleOpenActionModal(cardId) {
        if (window.actionItemsController) {
            window.actionItemsController.openEditModal(cardId);
        } else {
            console.warn('ActionItemsController not found');
        }
    }

    async handleUnmerge(parentId) {
        const parent = this.findCard(parentId);
        if (!parent || !parent.merged_cards || parent.merged_cards.length === 0) {
            await window.showAlert('Notice', "No merged cards to unmerge.");
            return;
        }

        // Unmerge the last one (LIFO)
        const lastChild = parent.merged_cards[parent.merged_cards.length - 1];
        if (!await window.showConfirm("Unmerge?", `Unmerge card "${lastChild.content}"?`)) return;

        try {
            console.log(`[Controller] Unmerging child ${lastChild.id} from parent ${parentId}`);
            await boardService.unmergeCard(lastChild.id);
            await this.loadBoardData();
        } catch (e) {
            console.error('[Controller] Unmerge failed:', e);
            await window.showAlert('Error', e.message);
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
            await window.showAlert('Error', 'Connection lost. Please refresh.');
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
        if (!await window.showConfirm(i18n.t('confirm.delete_column'), "Deleting a column also deletes all cards in it. This cannot be undone.", { isDanger: true, confirmText: 'Delete' })) return;
        try {
            await apiCall(`/columns/${columnId}`, 'DELETE');
            await this.loadBoardData();
        } catch (e) {
            await window.showAlert('Error', e.message);
        }
    }

    async handleVote(cardId, type) {
        if (!cardId || !type) return;

        // Safety check Phase (Local State)
        // If state is not loaded yet, fallback to window or return (safe)
        const currentPhase = this.board ? this.board.phase : (window.currentBoard ? window.currentBoard.phase : null);

        if (currentPhase !== 'voting') {
            console.warn('Voting attempted outside voting phase (Controller Check)');
            await window.showAlert('Notice', i18n.t('alert.voting_closed') || "Voting is only allowed during the Voting phase.");
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
            await window.showAlert('Notice', error.message);
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
        if (!await window.showConfirm(i18n.t('confirm.delete_card'), "Are you sure you want to delete this card?", { isDanger: true, confirmText: 'Delete' })) return;

        try {
            await boardService.deleteCard(cardId);
            await this.loadBoardData();
        } catch (error) {
            await window.showAlert('Error', 'Failed to delete card: ' + error.message);
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
        if (!await window.showConfirm(i18n.t('confirm.finish_retro'), null, { confirmText: 'Finish', isDanger: true })) return;
        try {
            await apiCall(`/boards/${this.boardId}/status`, 'PUT', { status: 'finished' });
            await this.loadBoardData();
        } catch (e) {
            await window.showAlert('Error', e.message);
        }
    }

    async handleReopenRetro() {
        if (!await window.showConfirm(i18n.t('confirm.reopen_retro'), null, { confirmText: 'Reopen', isDanger: false })) return;
        try {
            await apiCall(`/boards/${this.boardId}/status`, 'PUT', { status: 'active' });
            await this.loadBoardData();
        } catch (e) {
            await window.showAlert('Error', e.message);
        }
    }

    async handleClaimManager() {
        if (!window.currentUser) {
            await window.showAlert('Notice', i18n.t('alert.login_required') || "Please login to claim host.");
            return;
        }
        if (!await window.showConfirm(i18n.t('confirm.claim_host') || "Claim Board Hosting?", "Do you want to claim hosting management for this board?")) return;
        try {
            await apiCall(`/boards/${this.boardId}/claim`, 'POST', { owner: window.currentUser });
            await this.loadBoardData();
        } catch (e) {
            await window.showAlert('Error', e.message);
        }
    }

    async handleUnclaimManager() {
        if (!window.currentUser) {
            await window.showAlert('Notice', i18n.t('alert.login_required') || "Please login to unclaim.");
            return;
        }
        if (!await window.showConfirm(i18n.t('confirm.unclaim_host') || "Relinquish Control?", "Are you sure you want to relinquish hosting control?")) return;
        try {
            await apiCall(`/boards/${this.boardId}/unclaim`, 'POST', { user: window.currentUser });
            await this.loadBoardData();
        } catch (e) {
            await window.showAlert('Error', e.message);
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
        if (this.board) {
            this.view.render(this.board, window.currentUser, null);
        }
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

    handleVoteUpdate(data) {
        console.log('[Controller] Received vote update:', data);



        // data: { card_id, likes, dislikes }
        // Try strict selector
        const cardEl = document.querySelector(`.retro-card[data-id="${data.card_id}"]`);

        if (!cardEl) {
            return;
        }

        // If Blind Voting, we assume UI handles it (shows ???) or we do nothing
        if (data.likes === -1) return;

        const likeSpan = cardEl.querySelector('.card-stats span[data-section="likes"]') ||
            cardEl.querySelector('.card-stats span[title="Likes"]');

        const dislikeSpan = cardEl.querySelector('.card-stats span[data-section="dislikes"]') ||
            cardEl.querySelector('.card-stats span[title="Dislikes"]');

        if (likeSpan) {
            likeSpan.innerHTML = `<i class="fas fa-thumbs-up"></i> ${data.likes}`;
            likeSpan.classList.add('updated-flash');
            setTimeout(() => likeSpan.classList.remove('updated-flash'), 500);
        }

        if (dislikeSpan) {
            dislikeSpan.innerHTML = `<i class="fas fa-thumbs-down"></i> ${data.dislikes}`;
            dislikeSpan.classList.add('updated-flash');
            setTimeout(() => dislikeSpan.classList.remove('updated-flash'), 500);
        }
    }

    handleActionItem(cardId) {
        if (window.actionItemsController) {
            window.actionItemsController.openEditModal(cardId);
        } else {
            console.error('Action Item Controller not globally available');
        }
    }

    findCard(cardId) {
        if (!this.board || !this.board.columns) return null;
        for (const col of this.board.columns) {
            if (!col.cards) continue;
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
                sort: this.sortOption === 'position', // Disable sorting within list if not sorting by position
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                delay: 100, // Slight delay to prevent accidental drags on touch
                delayOnTouchOnly: true,
                scroll: true,
                scrollSensitivity: 100, // Smoother scrolling near edges
                bubbleScroll: true,
                onEnd: async (evt) => {
                    const itemEl = evt.item;
                    const cardId = itemEl.dataset.id;
                    const toColumnEl = evt.to.closest('.column');
                    const fromColumnEl = evt.from.closest('.column');

                    // If dropped in same list
                    if (evt.to === evt.from) {
                        // If same position, do nothing
                        if (evt.newIndex === evt.oldIndex) return;

                        // If NOT sorting by position, we cannot reorder within the same column.
                        // Revert the UI change because the list is essentially "locked" by the sort order.
                        if (this.sortOption !== 'position') {
                            console.warn('Cannot reorder manually when custom sort is active. Reverting.');
                            this.loadBoardData(); // Reverts DOM
                            return;
                        }
                    }

                    if (cardId && toColumnEl && toColumnEl.dataset.columnId) {
                        const columnId = toColumnEl.dataset.columnId;
                        const newIndex = evt.newIndex; // Get new index 0-based
                        console.log(`[Sortable] Moved ${cardId} to Column ${columnId} at index ${newIndex}`);
                        try {
                            await boardService.moveCard(cardId, columnId, newIndex);
                            // No need to reload, the WS update will trigger reload
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
    // --- Polling Fallback Logic ---
    // --- Smart Polling Logic ---
    startPolling() {
        if (this.isPolling) return; // Prevent multiple loops
        this.isPolling = true;
        this.pollFailures = 0;
        console.log('[BoardController] Starting smart polling loop');
        this.pollLoop();
    }

    async pollLoop() {
        if (!this.isPolling) return; // Stop if stopped

        await this.syncBoardState();

        // Determine next delay with backoff
        let delay = 3000;
        if (this.pollFailures > 0) {
            // Exponential backoff: 3s -> 4.5s -> 6.75s ... max 30s
            delay = Math.min(3000 * Math.pow(1.5, this.pollFailures), 30000);
            console.warn(`[BoardController] Poll cooling down... next tick in ${delay}ms`);
        }

        this.pollingTimer = setTimeout(() => this.pollLoop(), delay);
    }

    async syncBoardState() {
        if (!this.boardId) return;

        try {
            const freshBoard = await boardService.getById(this.boardId);
            this.pollFailures = 0; // Reset error count on success

            if (freshBoard && freshBoard.columns) {
                // console.log('[BoardController] Poll data received', freshBoard);
                freshBoard.columns.forEach(col => {
                    if (col.cards) {
                        col.cards.forEach(card => {
                            // Smart Diffing: Only update if votes actually changed
                            const likes = card.votes ? card.votes.filter(v => v.vote_type === 'like').length : 0;
                            const dislikes = card.votes ? card.votes.filter(v => v.vote_type === 'dislike').length : 0;

                            // Create a signature of the state we care about
                            const stateSignature = `${card.id}:L${likes}D${dislikes}`;

                            if (this.lastPollState.get(card.id) !== stateSignature) {
                                // console.log(`[BoardController] Vote update detected for ${card.id}`);
                                this.lastPollState.set(card.id, stateSignature);

                                this.handleVoteUpdate({
                                    card_id: card.id,
                                    likes: likes,
                                    dislikes: dislikes
                                });
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('[BoardController] Polling request failed:', e);
            this.pollFailures = (this.pollFailures || 0) + 1;
        }
    }

    handleVoteUpdate(data) {
        const cardId = data.card_id;
        const cardEl = document.querySelector(`.retro-card[data-id="${cardId}"]`);
        if (!cardEl) {
            console.warn(`Card ${cardId} not found in DOM for vote update`);
            return;
        }

        // Update vote counts
        const likesEl = cardEl.querySelector('.vote-count.likes');
        const dislikesEl = cardEl.querySelector('.vote-count.dislikes');

        if (likesEl) likesEl.textContent = data.likes > 0 ? data.likes : '';
        if (dislikesEl) dislikesEl.textContent = data.dislikes > 0 ? data.dislikes : '';

        // Handle Blind Voting (likes == -1)
        if (data.likes === -1) {
            if (likesEl) likesEl.textContent = '?';
            if (dislikesEl) dislikesEl.textContent = '?';
        }

        // We can't update "My Vote" blue status purely from broadcast (because it doesn't say IF I liked).
        // BUT, the optimistic UI update handling the click should have already toggled the blue class.
        // The broadcast settles the COUNT.
        // If we wanted to sync "My Vote" status from another tab of the same user, we'd need user-specific info in broadcast.
        // For now, this is sufficient for 99% cases.
    }

    handleCardMove(data) {
        // data: { card_id, column_id, position }
        const cardId = data.card_id;
        const targetColumnId = data.column_id;
        const newIndex = data.position;

        const cardEl = document.querySelector(`.retro-card[data-id="${cardId}"]`);
        const targetColumnEl = document.querySelector(`.column[data-column-id="${targetColumnId}"] .cards-container`);

        if (!cardEl || !targetColumnEl) {
            console.warn('Card or Target Column not found for move update');
            this.loadBoardData(); // Fallback
            return;
        }

        // Check if already in correct place (to avoid jitter if I was the mover)
        // SortableJS might have already moved it if I did the drag.
        // We can check if parent is correct and index is approximately correct.

        const currentParent = cardEl.parentElement;
        if (currentParent === targetColumnEl) {
            // It's in the right column. Check index?
            const children = Array.from(targetColumnEl.children).filter(c => !c.classList.contains('sortable-ghost'));
            const currentIndex = children.indexOf(cardEl);
            if (currentIndex === newIndex) {
                console.log('Card already in correct position (likely local move)');
                return;
            }
        }

        // Move the element
        // Re-insert at new index
        // IMPORTANT: Filter out SortableJS ghosts/drags to avoid index mismatch
        const siblings = Array.from(targetColumnEl.children).filter(c =>
            c !== cardEl &&
            !c.classList.contains('sortable-ghost') &&
            !c.classList.contains('sortable-drag') &&
            !c.classList.contains('sortable-chosen')
        );

        if (newIndex >= siblings.length) {
            targetColumnEl.appendChild(cardEl);
        } else {
            // Find the correct sibling to insert before
            const referenceNode = siblings[newIndex];
            if (referenceNode) {
                targetColumnEl.insertBefore(cardEl, referenceNode);
            } else {
                targetColumnEl.appendChild(cardEl);
            }
        }

        // Highlight effect?
        cardEl.classList.add('highlight-update');
        setTimeout(() => cardEl.classList.remove('highlight-update'), 1000);
    }
}

export const boardController = new BoardController();
