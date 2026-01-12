import { escapeHtml } from '../utils.js';
import { i18n } from '../i18n.js';

export class BoardView {
    constructor(containerId) {
        this.containerId = containerId;
    }

    render(board, currentUser, selectedCardId = null) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Render Header
        // Check if correct version loaded
        // console.log('BoardView RC63 Loaded');
        this.renderHeader(board, currentUser);
        this.renderLinkedTeams(board);

        // Render Columns
        const boardEncodedName = escapeHtml(board.name);
        const columnsHtml = board.columns
            .sort((a, b) => a.position - b.position)
            .map(col => this.createColumnHTML(col, board, currentUser, selectedCardId))
            .join('');

        container.innerHTML = `
            ${columnsHtml}
        `;
    }

    renderHeader(board, currentUser) {
        // 1. Update Title and Phase
        const titleEl = document.getElementById('boardTitle');
        if (titleEl) titleEl.textContent = board.name;

        const phaseDisplay = document.getElementById('currentPhase');
        if (phaseDisplay) {
            phaseDisplay.textContent = i18n.t('phase.' + board.phase) || board.phase;
        }

        // 2. Permission Check
        const isOwner = board.owner === currentUser;
        const isCoOwner = board.co_owner === currentUser;
        // Check managers array if it exists
        const isManager = Array.isArray(board.managers) && board.managers.includes(currentUser);
        // "Control" means Owner, CoOwner, or explicitly in Managers list
        const canControl = isOwner || isCoOwner || isManager;
        const isFinished = board.status === 'finished';

        console.log('Permissions:', { currentUser, owner: board.owner, isOwner, isManager, canControl, isFinished });

        // 3. Toggle Control Buttons
        // Helper to toggle
        const toggle = (id, show) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = show ? 'inline-flex' : 'none';
                if (show) el.classList.remove('hidden');
            }
        };

        // Phase Switch (Only if not finished)
        const switchBtn = document.getElementById('switchPhaseBtn');
        if (switchBtn) {
            const isVoting = board.phase === 'voting';
            switchBtn.innerHTML = isVoting ? `<i class="fas fa-gavel"></i> ${i18n.t('btn.end_voting') || 'End Voting'}` : `<i class="fas fa-vote-yea"></i> ${i18n.t('btn.start_voting') || 'Start Voting'}`;
            toggle('switchPhaseBtn', canControl && !isFinished);
        }

        // Timer Controls
        // Allow Start if authorized and not finished. 
        // Stop is toggled by Controller usually, but we ensure Start is at least initially visible if idle.
        if (canControl && !isFinished) {
            const startBtn = document.getElementById('startTimerBtn');
            const stopBtn = document.getElementById('stopTimerBtn');
            // If both hidden, show start as default state
            if (startBtn && stopBtn && startBtn.style.display === 'none' && stopBtn.style.display === 'none') {
                startBtn.style.display = 'inline-flex';
            }
        } else {
            toggle('startTimerBtn', false);
            toggle('stopTimerBtn', false);
        }

        // Host Claiming
        // Logic: If NOT controlling, show Claim. If controlling, show Unclaim.
        toggle('claimManagerBtn', !canControl && !isFinished);
        toggle('unclaimManagerBtn', canControl && !isFinished);

        // Meta Controls
        toggle('finishRetroBtn', isOwner && !isFinished);
        toggle('reopenRetroBtn', isOwner && isFinished);
        toggle('exportBoardBtn', true); // Everyone

        // Settings
        toggle('adminSettingsBtn', canControl && !isFinished);

        // Manage Teams
        toggle('manageTeamsBtn', canControl && !isFinished);

        // Add Column
        toggle('addColumnBtn', canControl && !isFinished);

        // Leave Board - Everyone
        toggle('leaveBoardBtn', true);

        // 4. Read Only Banner
        const banner = document.getElementById('readOnlyBanner');
        if (banner) {
            banner.style.display = isFinished ? 'block' : 'none';
        }


        // Participants (Updated for Compact View)
        const participants = board.participants || [];
        const pCountEl = document.getElementById('participantsCount');
        const pTooltipEl = document.getElementById('participantsTooltip');
        if (pCountEl) pCountEl.textContent = participants.length;
        if (pTooltipEl) {
            pTooltipEl.innerHTML = '';
            participants.forEach(p => {
                const avatar = document.createElement('div');
                avatar.className = 'user-avatar small';
                avatar.textContent = (p.username || '?').substring(0, 2).toUpperCase();
                avatar.title = p.username;
                avatar.style.display = 'inline-flex'; // styling fix for tooltip
                pTooltipEl.appendChild(avatar);
            });
        }

        // Teams (Updated separately in renderLinkedTeams, but header count logic here if needed)
        // See renderLinkedTeams below

        // ... existing toggle logic ...
        // Control Buttons Visibility
        toggle('finishRetroBtn', canControl && !isFinished);
        toggle('reopenRetroBtn', canControl && isFinished);
        // ... other buttons
    }

    renderLinkedTeams(board) {
        const countEl = document.getElementById('teamsCount');
        const tooltipEl = document.getElementById('teamsTooltip');

        const teams = board.teams || [];
        if (countEl) countEl.textContent = teams.length;

        if (tooltipEl) {
            tooltipEl.innerHTML = '';
            if (teams.length > 0) {
                teams.forEach(team => {
                    const span = document.createElement('span');
                    span.className = 'badge';
                    span.style.background = 'rgba(255,255,255,0.1)';
                    span.style.padding = '4px 8px';
                    span.style.borderRadius = '4px';
                    span.style.display = 'block'; // Block for tooltip list
                    span.innerHTML = `<i class="fas fa-shield-alt"></i> ${escapeHtml(team.name)}`;
                    tooltipEl.appendChild(span);
                });
            } else {
                tooltipEl.innerHTML = '<span style="opacity:0.5; font-size:0.8rem">No linked teams</span>';
            }
        }
    }

    createColumnHTML(column, board, currentUser, selectedCardId) {
        const visibleCards = (column.cards || []).filter(c => !c.merged_with_id);
        const cardsHtml = visibleCards
            .sort((a, b) => a.position - b.position)
            .map(card => this.createCardHTML(card, board, currentUser, selectedCardId))
            .join('');

        return `
            <div class="column" data-column-id="${column.id}">
                <div class="column-header">
                    <h3>${escapeHtml(column.name)}</h3>
                    <div class="column-actions">
                         <!-- Use data-action for delegation -->
                         <button class="btn-icon" data-action="columnEdit" data-column-id="${column.id}"><i class="fas fa-pen"></i></button>
                         <button class="btn-icon" data-action="columnDelete" data-column-id="${column.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="cards-container" id="col-${column.id}">
                    ${cardsHtml}
                </div>
                <button class="btn btn-ghost add-card-btn" data-action="addItem" data-column-id="${column.id}">
                    + ${i18n.t('btn.add_card')}
                </button>
            </div>
        `;
    }

    createCardHTML(card, board, currentUser, selectedCardId) {
        const isOwner = card.owner === currentUser;
        const isBoardOwner = board.owner === currentUser;
        // Managers can edit/delete too
        const isManager = board.managers && board.managers.includes(currentUser);
        const canControl = isOwner || isBoardOwner || isManager;
        const isFinished = board.status === 'finished';

        const isSelected = selectedCardId === card.id;
        const isMergeTarget = selectedCardId && !isSelected;

        // DEBUG LOG
        if (selectedCardId) {
            console.log(`[View] Card ${card.id.substring(0, 4)} | SelectedId: ${selectedCardId.substring(0, 4)} | isSelected: ${isSelected} | isMergeTarget: ${isMergeTarget}`);
        }

        // Voting Logic
        const votes = card.votes || [];
        const likes = votes.filter(v => v.vote_type === 'like').length;
        const dislikes = votes.filter(v => v.vote_type === 'dislike').length;
        const userVotedLike = votes.some(v => v.user_name === currentUser && v.vote_type === 'like');
        const userVotedDislike = votes.some(v => v.user_name === currentUser && v.vote_type === 'dislike');

        const isVotingPhase = board.phase === 'voting';
        // Fix: backend sends 'blind_voting' at root, not in settings
        const isBlindVoting = isVotingPhase && board.blind_voting;

        // --- Toolbar Buttons ---
        let toolbarHtml = '';

        // 1. Voting (Only in Voting Phase, or if finished)
        if (isVotingPhase && !isFinished) {
            toolbarHtml += `
                <button class="btn-glass-icon ${userVotedLike ? 'active' : ''}" data-action="vote" data-vote-type="like" data-card-id="${card.id}" title="${i18n.t('card.vote')} Like">
                    <i class="fas fa-thumbs-up"></i>
                </button>
                <button class="btn-glass-icon ${userVotedDislike ? 'active' : ''}" data-action="vote" data-vote-type="dislike" data-card-id="${card.id}" title="${i18n.t('card.vote')} Dislike">
                    <i class="fas fa-thumbs-down"></i>
                </button>
            `;
        }

        // 2. Edit/Delete (Owner/Manager)
        if (canControl && !isFinished) {
            toolbarHtml += `
                <button class="btn-glass-icon" data-action="itemEdit" data-card-id="${card.id}" data-content="${escapeHtml(card.content)}" title="${i18n.t('btn.edit')}">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-glass-icon danger" data-action="itemDelete" data-card-id="${card.id}" title="${i18n.t('btn.delete')}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        // 3. Action Item Toggle
        const isActionItem = card.is_action_item;
        toolbarHtml += `
            <button class="btn-glass-icon ${isActionItem ? 'active' : ''}" data-action="toggleActionItem" data-card-id="${card.id}" title="Convert to Action Item">
                <i class="fas fa-check-square"></i>
            </button>
        `;

        // 4. Merge / Select Logic
        if (!isFinished) {
            if (isSelected) {
                // Cancel Selection
                toolbarHtml += `
                     <button class="btn-glass-icon active" data-action="cancelSelection" title="Cancel Selection">
                        <i class="fas fa-times-circle"></i>
                    </button>
                `;
            } else if (isMergeTarget) {
                // Merge Here
                toolbarHtml += `
                     <button class="btn-glass-icon primary" data-action="mergeCard" data-card-id="${card.id}" title="Merge Here">
                        <i class="fas fa-file-import"></i>
                    </button>
                `;
            } else {
                // Select to Start Merge
                toolbarHtml += `
                     <button class="btn-glass-icon" data-action="selectCard" data-card-id="${card.id}" title="Select to Merge">
                        <i class="fas fa-hand-pointer"></i>
                    </button>
                `;
            }
        }

        // 5. Unmerge (if merged items exist)
        const mergedCount = (card.merged_cards && card.merged_cards.length) || (card.merged_count || 0);

        if (mergedCount > 0 && !isFinished) {
            toolbarHtml += `
                 <button class="btn-glass-icon" data-action="unmerge" data-card-id="${card.id}" title="Unmerge Last">
                    <i class="fas fa-undo"></i>
                </button>
            `;
        }


        // --- Footer Stats ---
        // Show counts unless Blind Voting is active (and not finished)
        // If finished, show all.
        let showStats = true;
        if (isBlindVoting && !isFinished) showStats = false;

        let footerHtml = '';
        if (showStats) {
            footerHtml = `
                <div class="card-stats">
                    <span title="Likes"><i class="fas fa-thumbs-up"></i> ${likes}</span>
                    <span title="Dislikes"><i class="fas fa-thumbs-down"></i> ${dislikes}</span>
                    ${mergedCount > 0 ? `<span title="Merged Cards"><i class="fas fa-layer-group"></i> ${mergedCount}</span>` : ''}
                </div>
            `;
        } else {
            // Blind Voting Active
            footerHtml = `
                <div class="card-stats blind">
                    <span title="Votes Hidden"><i class="fas fa-eye-slash"></i> ???</span>
                    ${mergedCount > 0 ? `<span title="Merged Cards"><i class="fas fa-layer-group"></i> ${mergedCount}</span>` : ''}
                </div>
            `;
        }

        const cardClasses = `retro-card ${isSelected ? 'selected-source' : ''} ${isMergeTarget ? 'merge-target' : ''} ${isActionItem ? 'action-item' : ''} ${card.completed ? 'completed' : ''}`;

        return `
            <div class="${cardClasses}" data-id="${card.id}">
                <!-- 1. Content -->
                <!-- 1. Content -->
                <div class="card-content">
                    ${escapeHtml(card.content)}
                    ${(card.merged_cards || []).map(mc => `
                        <div class="merged-content-item" style="border-top: 1px dashed rgba(255,255,255,0.2); margin-top: 0.5rem; padding-top: 0.5rem; opacity: 0.8; font-size: 0.9em;">
                            <i class="fas fa-level-up-alt fa-rotate-90" style="margin-right: 5px; opacity: 0.5;"></i> 
                            ${escapeHtml(mc.content)}
                        </div>
                    `).join('')}
                </div>

                <!-- 2. Toolbar Grid -->
                <div class="card-toolbar-grid">
                    ${toolbarHtml}
                </div>

                <!-- 3. Comments Placeholder -->
                <div class="card-comments-placeholder" style="border-top: 1px solid rgba(255,255,255,0.1); margin: 0.5rem 0; padding-top: 0.2rem; display:none;">
                    <!-- Future Comments UI -->
                </div>

                <!-- 4. Footer -->
                <div class="card-footer">
                    ${footerHtml}
                </div>
            </div>
        `;
    }

}
