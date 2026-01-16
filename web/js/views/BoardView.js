import { escapeHtml } from '../utils.js';
import { i18n } from '../i18n.js';

export class BoardView {
    constructor(containerId) {
        this.containerId = containerId;
    }

    render(board, currentUser, selectedCardId = null, sortOption = 'position') {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Render Header
        this.renderHeader(board, currentUser, sortOption);
        this.renderParticipants(board.participants); // Render participants
        this.renderLinkedTeams(board);

        // Render Columns
        const boardEncodedName = escapeHtml(board.name);
        const columnsHtml = board.columns
            .sort((a, b) => a.position - b.position)
            .map(col => this.createColumnHTML(col, board, currentUser, selectedCardId, sortOption))
            .join('');

        container.innerHTML = `
            ${columnsHtml}
        `;
    }

    renderParticipants(participants) {
        const container = document.getElementById('boardParticipantsDisplay');
        if (!container) return;

        if (!participants || participants.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        const maxDisplay = 10; // Max avatars to show
        const displayList = participants.slice(0, maxDisplay);
        const remaining = participants.length - maxDisplay;

        const avatarsHtml = displayList.map(p => {
            const initial = (p.username || p.name || '?').charAt(0).toUpperCase();

            let avatarContent;
            // Check if avatar is a generic URL (starts with http) or a relative path (starts with /)
            const isUrl = p.avatar && (p.avatar.startsWith('http') || p.avatar.startsWith('/'));

            if (isUrl) {
                avatarContent = `<img src="${p.avatar}" alt="${escapeHtml(p.username)}" class="participant-avatar-img">`;
            } else if (p.avatar && p.avatar !== '👤') {
                // It's likely an emoji
                avatarContent = `<span class="participant-avatar-text" style="font-size: 1.2rem;">${p.avatar}</span>`;
            } else {
                avatarContent = `<span class="participant-avatar-text">${initial}</span>`;
            }

            return `
                <div class="participant-avatar" title="${escapeHtml(p.display_name || p.username)}">
                    ${avatarContent}
                </div>
            `;
        }).join('');

        const remainingHtml = remaining > 0
            ? `<div class="participant-avatar remaining" title="${remaining} more">+${remaining}</div>`
            : '';

        container.innerHTML = avatarsHtml + remainingHtml;
    }

    renderHeader(board, currentUser, sortOption = 'position') {
        // ... existing logic ...
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

        // Sort Controls - Dropdown
        const sortSelect = document.getElementById('sortCardsSelect');
        if (sortSelect) {
            sortSelect.style.display = 'inline-block';
            sortSelect.value = sortOption;
        }


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

    createColumnHTML(column, board, currentUser, selectedCardId, sortOption = 'position') {
        const visibleCards = (column.cards || []).filter(c => !c.merged_with_id);

        // Sorting Logic
        if (sortOption === 'votes') {
            visibleCards.sort((a, b) => {
                const votesA = (a.votes || []).filter(v => v.vote_type === 'like').length;
                const votesB = (b.votes || []).filter(v => v.vote_type === 'like').length;
                return votesB - votesA; // Descending
            });
        } else if (sortOption === 'az') {
            visibleCards.sort((a, b) => a.content.localeCompare(b.content));
        } else {
            // Position (Default)
            visibleCards.sort((a, b) => a.position - b.position);
        }

        const cardsHtml = visibleCards
            .map(card => this.createCardHTML(card, board, currentUser, selectedCardId))
            .join('');

        return `
            <div class="column" data-column-id="${column.id}">
                <div class="column-header">
                    <h3>
                        ${escapeHtml(column.name)}
                        <span class="badge" style="margin-left:8px; font-size:0.8rem; opacity:0.8; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:10px;">
                            ${visibleCards.length}
                        </span>
                    </h3>
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
        const isManager = board.managers && board.managers.includes(currentUser);
        const canControl = isOwner || isBoardOwner || isManager;
        const isFinished = board.status === 'finished';

        const isSelected = selectedCardId === card.id;
        const isMergeTarget = selectedCardId && !isSelected;

        // Voting Logic - Aggregation
        let allVotes = [...(card.votes || [])];
        if (card.merged_cards) {
            card.merged_cards.forEach(mc => {
                if (mc.votes) allVotes = allVotes.concat(mc.votes);
            });
        }

        const likes = allVotes.filter(v => v.vote_type === 'like').length;
        // const dislikes = allVotes.filter(v => v.vote_type === 'dislike').length;
        const userVotedLike = allVotes.some(v => v.user_name === currentUser && v.vote_type === 'like');

        const isVotingPhase = board.phase === 'voting';
        const isBlindVoting = isVotingPhase && board.blind_voting;
        const showStats = !(isBlindVoting && !isFinished);

        // --- Card Menu (Kebab) ---
        // Contains: Edit, Delete, Toggle Action Item
        let menuHtml = '';
        if (canControl && !isFinished) {
            const isActionItem = card.is_action_item;

            menuHtml = `
                <div class="card-menu-btn" tabindex="0">
                    <i class="fas fa-ellipsis-h"></i>
                    <div class="dropdown-menu">
                        <button class="dropdown-item" data-action="itemEdit" data-card-id="${card.id}" data-content="${escapeHtml(card.content)}">
                            <i class="fas fa-pen"></i> ${i18n.t('btn.edit')}
                        </button>
                        <button class="dropdown-item" data-action="toggleActionItem" data-card-id="${card.id}">
                            <i class="fas ${isActionItem ? 'fa-square' : 'fa-check-square'}"></i> ${isActionItem ? i18n.t('btn.unmark_action') : i18n.t('btn.mark_action')}
                        </button>
                        ${card.merged_cards && card.merged_cards.length > 0 ? `
                        <button class="dropdown-item" data-action="unmerge" data-card-id="${card.id}">
                            <i class="fas fa-undo"></i> ${i18n.t('btn.unmerge')}
                        </button>
                        ` : ''}
                        <button class="dropdown-item danger" data-action="itemDelete" data-card-id="${card.id}">
                            <i class="fas fa-trash"></i> ${i18n.t('btn.delete')}
                        </button>
                    </div>
                </div>
            `;
        }

        // --- Primary Actions (Visible) ---
        // Vote, Merge, Reactions
        let actionsHtml = '';

        // 1. Voting
        if (isVotingPhase && !isFinished) {
            actionsHtml += `
                <button class="btn-glass-icon compact ${userVotedLike ? 'active' : ''}" data-action="vote" data-vote-type="like" data-card-id="${card.id}" title="Upvote">
                    <i class="fas fa-thumbs-up"></i>
                </button>
            `;
        }

        // 2. Merge Logic
        if (!isFinished) {
            if (isSelected) {
                actionsHtml += `
                     <button class="btn-glass-icon compact active" data-action="cancelSelection" title="Cancel Selection">
                        <i class="fas fa-times-circle"></i>
                    </button>
                `;
            } else if (isMergeTarget) {
                actionsHtml += `
                     <button class="btn-glass-icon compact primary" data-action="mergeCard" data-card-id="${card.id}" title="Merge Here">
                        <i class="fas fa-file-import"></i>
                    </button>
                `;
            } else {
                actionsHtml += `
                     <button class="btn-glass-icon compact" data-action="selectCard" data-card-id="${card.id}" title="Select to Merge" style="opacity:0.5;">
                        <i class="fas fa-hand-pointer"></i>
                    </button>
                `;
            }
        }

        // 3. Reactions (Emoji Picker Trigger?)
        // TODO: Add reaction trigger here if we want standard reactions

        // Footer Stats
        const mergedCount = (card.merged_cards && card.merged_cards.length) || (card.merged_count || 0);

        const footerHtml = `
            <div class="card-stats ${!showStats ? 'blind' : ''}">
                ${showStats ?
                `<span class="vote-count likes" data-section="likes"><i class="fas fa-thumbs-up"></i> ${likes}</span>` :
                `<span><i class="fas fa-eye-slash"></i> ???</span>`
            }
                ${mergedCount > 0 ? `<span title="Merged Cards"><i class="fas fa-layer-group"></i> ${mergedCount}</span>` : ''}
                ${card.is_action_item ? `<span class="badge warning" style="font-size:0.7em">Action Item</span>` : ''}
            </div>
            
            <div class="card-primary-actions">
                ${actionsHtml}
            </div>
        `;

        const cardClasses = `retro-card ${isSelected ? 'selected-source' : ''} ${isMergeTarget ? 'merge-target' : ''} ${card.is_action_item ? 'action-item' : ''} ${card.completed ? 'completed' : ''}`;

        return `
            <div class="${cardClasses}" data-id="${card.id}">
                ${menuHtml} <!-- Absolute positioned top-right -->
                
                <div class="card-content">
                    ${escapeHtml(card.content)}
                    ${(card.merged_cards || []).map(mc => `
                        <div class="merged-content-item">
                            ${escapeHtml(mc.content)}
                        </div>
                    `).join('')}
                </div>

                <div class="card-footer">
                    ${footerHtml}
                </div>
            </div>
        `;
    }

}
