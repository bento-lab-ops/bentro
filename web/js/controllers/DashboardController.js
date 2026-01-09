import { boardService } from '../services/BoardService.js';
import { i18n } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { loadBoard } from '../board.js'; // Backward compat: loadBoard logic still in board.js for now
// import { showNewBoardModal } from '../modals.js'; // If exists, or direct DOM
// import { router } from '../lib/Router.js';

export class DashboardController {
    constructor() {
        this.cache = [];
        this.currentFilter = 'active';
        this.containerId = 'dashboardView';
    }

    async init() {
        await this.loadBoards();
        this.showView();
    }

    showView() {
        document.getElementById('dashboardView').style.display = 'block';

        // Hide all other views
        const views = ['boardContainer', 'actionItemsView', 'adminView', 'teamsView'];
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Reset Header Buttons
        if (document.getElementById('newBoardBtn')) document.getElementById('newBoardBtn').style.display = 'inline-block';
        if (document.getElementById('dashboardBtn')) document.getElementById('dashboardBtn').style.display = 'none';
        if (document.getElementById('leaveBoardBtn')) document.getElementById('leaveBoardBtn').style.display = 'none';

        // Update URL if not already (handled by router usually, but good for explicit switching)
        // window.location.hash = '#dashboard';
    }

    async loadBoards() {
        try {
            const boards = await boardService.getAll();
            console.log('[DashboardController] Fetched boards:', boards.length);
            this.cache = boards;
            this.filterBoards(this.currentFilter);
        } catch (error) {
            console.error('Failed to load boards:', error);
            // showToast error?
        }
    }

    filterBoards(status) {
        this.currentFilter = status;

        // UI Updates
        document.querySelectorAll('.team-nav-tab').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(status === 'active' ? 'filterActiveBtn' : 'filterFinishedBtn');
        if (activeBtn) activeBtn.classList.add('active');

        // Filter Logic
        const filtered = this.cache.filter(b => b.status === status);
        this.renderList(filtered);
    }

    renderList(boards) {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (boards.length === 0) {
            const emptyState = document.getElementById('emptyDashboard');
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        const emptyState = document.getElementById('emptyDashboard');
        if (emptyState) emptyState.style.display = 'none';

        boards.forEach(board => {
            const card = this.createBoardCard(board);
            grid.appendChild(card);
        });

        // Re-apply client-side filters if they exist (search bar)
        if (typeof window.applyDashboardFilters === 'function') {
            window.applyDashboardFilters();
        }
    }

    createBoardCard(board) {
        const card = document.createElement('div');
        card.className = 'board-card';
        card.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I' && !e.target.closest('button')) {
                // loadBoard is currently global/legacy
                loadBoard(board.id);
            }
        };

        const myUser = (window.currentUser || '').toLowerCase();
        const isOwner = (board.owner || '').toLowerCase() === myUser;
        const isMember = board.participants && board.participants.some(p => (p.username || '').toLowerCase() === myUser);
        const teams = board.teams || [];
        const isTeamBoard = teams.length > 0 || !!board.team_id;

        // Display Name Logic
        let displayTeamName = board.team_name || '';
        if (teams.length > 0) {
            displayTeamName = teams.map(t => t.name).join(', ');
        }
        const hasTeam = !!displayTeamName;

        // Metadata
        const actionItemCount = board.action_item_count || 0;
        const hasActionItems = actionItemCount > 0;
        const isActive = board.status === 'active';
        const statusClass = isActive ? 'status-active' : 'status-finished';

        let deleteTitle = i18n.t('modal.delete');
        if (hasActionItems) {
            deleteTitle = i18n.t('alert.cannot_delete_items');
        } else if (isActive) {
            deleteTitle = i18n.t('alert.cannot_delete_active');
        }

        const actionItemBadge = hasActionItems
            ? `<span class="action-item-dashboard-badge" title="${actionItemCount} Action Items">⚡ ${actionItemCount}</span>`
            : '';

        // Template Literal adapted from board.js
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                <h3 title="${escapeHtml(board.name)}" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 70%;">${escapeHtml(board.name)}</h3>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    ${actionItemBadge}
                    <span class="board-status ${statusClass}">${i18n.t('status.' + board.status) || board.status}</span>
                </div>
            </div>
            
            <div class="board-meta" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.created_at') || 'Created'}:</span>
                    <span>${new Date(board.created_at).toLocaleDateString()}</span>
                </div>
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.participants') || 'Participants'}:</span>
                    <span>${board.participant_count}</span>
                </div>
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.owner') || 'Owner'}:</span>
                    <span>${escapeHtml(board.owner || '-')}</span>
                </div>
                ${hasTeam ? `
                <div class="meta-row">
                    <span style="font-weight:600; color:var(--text-secondary); width: 80px;">${i18n.t('label.team') || 'Team'}:</span>
                    <span title="${escapeHtml(displayTeamName)}" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(displayTeamName)}</span>
                </div>` : ''}
            </div>

            <div class="dashboard-actions">
                ${this.renderActions(board, isMember, isOwner)}
            </div>
        `;

        return card;
    }

    renderActions(board, isMember, isOwner) {
        let html = '';
        if (board.status === 'finished') {
            html += `<button class="btn btn-primary btn-sm" onclick="loadBoard('${board.id}')" title="${i18n.t('btn.view_results')}">
                        <i class="fas fa-chart-bar"></i> ${i18n.t('btn.view')}
                    </button>`;
        } else {
            if (isMember || isOwner) {
                html += `<button class="btn btn-primary btn-sm" onclick="loadBoard('${board.id}')" title="${i18n.t('btn.return')}">
                            <i class="fas fa-arrow-right"></i> ${i18n.t('btn.return')}
                        </button>`;
            } else {
                html += `<button class="btn btn-success btn-sm" onclick="joinBoardPersistent('${board.id}')" title="${i18n.t('btn.join')}">
                            <i class="fas fa-sign-in-alt"></i> ${i18n.t('btn.enter')}
                        </button>`;
            }
        }

        if (board.status === 'finished') {
            html += `<button class="btn btn-warning btn-sm" onclick="updateBoardStatus('${board.id}', 'active')" title="${i18n.t('btn.reopen')}"><i class="fas fa-sync-alt"></i></button>`;
            html += `<button class="btn btn-danger btn-sm" onclick="deleteBoard('${board.id}')" title="${i18n.t('modal.delete')}"><i class="fas fa-trash"></i></button>`;
        }
        return html;
    }

    async joinBoard(id) {
        if (!window.currentUser) {
            alert("Please log in to join a board.");
            return;
        }
        try {
            await boardService.join(id, {
                username: window.currentUser,
                avatar: window.currentUserAvatar
            });
            loadBoard(id); // Global
        } catch (error) {
            console.error('Failed to join:', error);
            alert('Failed to join board: ' + error.message);
        }
    }

    async handleCreateBoard(name, columns, teamId) {
        try {
            const payload = {
                name,
                columns,
                owner: window.currentUser
            };
            if (teamId) {
                payload.team_id = teamId;
            }

            const board = await boardService.create(payload);
            // Auto-join handled by backend usually, but let's assume we load it.
            loadBoard(board.id);
            return board;
        } catch (error) {
            console.error('Failed to create board:', error);
            alert(i18n.t('alert.failed_create_board') + ': ' + error.message);
            throw error;
        }
    }
}

export const dashboardController = new DashboardController();
