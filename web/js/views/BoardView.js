import { escapeHtml } from '../utils.js';
import { i18n } from '../i18n.js';

export class BoardView {
    constructor(containerId) {
        this.containerId = containerId;
    }

    render(board, currentUser) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Render Header
        // Check if correct version loaded
        console.log('BoardView RC32 Loaded');
        this.renderHeader(board, currentUser);

        // Render Columns
        const boardEncodedName = escapeHtml(board.name);
        const columnsHtml = board.columns
            .sort((a, b) => a.position - b.position)
            .map(col => this.createColumnHTML(col, board, currentUser))
            .join('');

        container.innerHTML = `
            ${columnsHtml}
            <div class="column add-column">
                <button class="btn btn-secondary" style="width:100%; height:100%; min-height:100px;" data-action="addColumn">
                    <i class="fas fa-plus"></i> ${i18n.t('btn.add_column')}
                </button>
            </div>
        `;
    }

    renderHeader(board, currentUser) {
        // 1. Update Title and Phase
        const titleEl = document.getElementById('boardTitle'); // Fixed ID
        if (titleEl) titleEl.textContent = board.name;

        const phaseDisplay = document.getElementById('currentPhase'); // Fixed ID from index.html (line 276)
        if (phaseDisplay) {
            phaseDisplay.textContent = i18n.t('phase.' + board.phase) || board.phase;
            // Update class for styling if needed? 
            // The HTML has `class="phase-name"`. 
            // We might want to add a specific class for color?
            // For now just text update is critical.
        }

        // 2. Permission Check
        // 2. Permission Check
        const isOwner = board.owner === currentUser;
        const isCoOwner = board.co_owner === currentUser;
        const canControl = isOwner || isCoOwner;
        const isFinished = board.status === 'finished';

        // 3. Toggle Control Buttons
        const timerSection = document.querySelector('.timer-controls');
        if (timerSection) {
            // Helper to toggle
            const toggle = (id, show) => {
                const el = document.getElementById(id);
                if (el) el.style.display = show ? 'inline-block' : 'none';
            };

            // Phase Switch (Only if not finished)
            const switchBtn = document.getElementById('switchPhaseBtn');
            if (switchBtn) {
                const isVoting = board.phase === 'voting';
                switchBtn.innerHTML = isVoting ? `<i class="fas fa-gavel"></i> ${i18n.t('btn.end_voting') || 'End Voting'}` : `<i class="fas fa-vote-yea"></i> ${i18n.t('btn.start_voting') || 'Start Voting'}`;
                toggle('switchPhaseBtn', canControl && !isFinished);
            }

            // Timer Controls (Only if not finished)
            // Note: start/stop logic might need to check if timer is running?
            // Currently the UI state for timer is handled by `updateTimerDisplay` mostly?
            // But we need to show at least "Start" if we are manager.
            // Let's rely on BoardController/Timer state if possible, but initially show Start.
            // If timer is running, BoardController should flip it to Stop.
            // For now, just Show Start if authorized.
            if (canControl && !isFinished) {
                // If button is hidden, show it. Logic in Controller might toggle Start/Stop.
                // We ensure the grouping is visible or base buttons are eligible.
                // We'll default to showing Start if not running, but we don't know "running" state here easily without checking display?
                // Actually BoardController manages start/stop visibility dynamically.
                // BUT, they default to NONE in HTML.
                // So we must enable them.
                // Let's enable "Start" by default if nothing is showing?
                const startBtn = document.getElementById('startTimerBtn');
                const stopBtn = document.getElementById('stopTimerBtn');
                if (startBtn && stopBtn) {
                    if (stopBtn.style.display === 'none' && startBtn.style.display === 'none') {
                        startBtn.style.display = 'inline-block';
                    }
                }
            } else {
                toggle('startTimerBtn', false);
                toggle('stopTimerBtn', false);
            }

            // Host Claiming
            // If I am owner, I don't need to claim? Or Owner is always manager?
            // Usually Owner is implicit manager.
            // If I am NOT manager, show Claim.
            // If I AM manager (and not owner?), show Unclaim?
            // Logic:
            toggle('claimManagerBtn', !canControl && !isFinished);
            toggle('unclaimManagerBtn', canControl && !isFinished); // Allow both Owner and CoOwner to relinquish

            // Meta Controls
            toggle('finishRetroBtn', isOwner && !isFinished);
            toggle('reopenRetroBtn', isOwner && isFinished);
            toggle('exportBoardBtn', true); // Everyone can export? Or just members? Let's say everyone for now.

            // Settings
            toggle('adminSettingsBtn', canControl && !isFinished);

            // Add Column (in board container)
            toggle('addColumnBtn', canControl && !isFinished);
        }

        // 4. Read Only Banner
        const banner = document.getElementById('readOnlyBanner');
        if (banner) {
            banner.style.display = isFinished ? 'block' : 'none';
        }
    }

    createColumnHTML(column, board, currentUser) {
        const cardsHtml = (column.cards || [])
            .sort((a, b) => a.position - b.position)
            .map(card => this.createCardHTML(card, board, currentUser))
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

    createCardHTML(card, board, currentUser) {
        const isOwner = card.owner === currentUser;
        const isFinished = board.status === 'finished';

        // Voting Logic
        const votes = card.votes || [];
        const likes = votes.filter(v => v.vote_type === 'like').length;
        const dislikes = votes.filter(v => v.vote_type === 'dislike').length;
        const userVoted = votes.some(v => v.user_name === currentUser);
        const isVotingPhase = board.phase === 'voting';
        const isBlindVoting = isVotingPhase && board.blind_voting; // Logic from legacy

        let voteControls = '';
        if (isVotingPhase) {
            if (isBlindVoting) {
                // Blind Voting UI
                voteControls = `
                    <div class="vote-controls-blind">
                        <span class="blind-vote-badge" title="${i18n.t('card.votes_hidden')}">${i18n.t('card.votes_hidden')}</span>
                        ${!isFinished ? `
                            <button class="vote-btn ${userVoted ? 'voted' : ''}" data-action="vote" data-vote-type="like" data-card-id="${card.id}">
                                ${userVoted ? i18n.t('card.remove_vote') : '👍 ' + i18n.t('card.vote')}
                            </button>
                        ` : ''}
                    </div>
                `;
            } else {
                // Normal Voting UI
                voteControls = `
                    <div class="card-votes">
                         <span class="vote-count likes">👍 ${likes}</span>
                         <span class="vote-count dislikes">👎 ${dislikes}</span>
                    </div>
                    ${!isFinished ? `
                        <div class="card-actions-voting">
                            <button class="vote-btn ${userVoted ? 'voted' : ''}" data-action="vote" data-vote-type="like" data-card-id="${card.id}">👍</button>
                            <button class="vote-btn" data-action="vote" data-vote-type="dislike" data-card-id="${card.id}">👎</button>
                        </div>
                    ` : ''}
                `;
            }
        } else {
            // Not Voting Phase: Show counts
            voteControls = `
                <div class="card-votes">
                    <span class="vote-count likes">👍 ${likes}</span>
                    <span class="vote-count dislikes">👎 ${dislikes}</span>
                </div>
             `;
        }

        // Action Item Logic
        const isActionItem = card.is_action_item;
        let actionItemClasses = isActionItem ? 'action-item' : '';
        if (card.completed) actionItemClasses += ' completed';

        let actionItemBadge = '';
        let actionItemDetails = '';

        if (isActionItem) {
            actionItemBadge = `<div class="action-item-indicator">⚡ Action Item</div>`;
            const dueDate = card.due_date ? new Date(card.due_date).toLocaleDateString() : 'No Date';
            // Note: event delegation for checkbox change needed 'change' event listener in Controller
            actionItemDetails = `
                <div class="action-item-details">
                    <div class="action-owner">👤 ${escapeHtml(card.owner || '?')}</div>
                    <div class="action-due-date">📅 ${dueDate}</div>
                    <div class="action-status">
                        <label class="action-completed-label">
                            <input type="checkbox" class="action-completed-checkbox" 
                                ${card.completed ? 'checked' : ''} 
                                data-action="toggleActionItem" data-card-id="${card.id}">
                            ${i18n.t('action.status_done')}
                        </label>
                    </div>
                </div>
            `;
        }

        // Reactions Logic
        const reactions = card.reactions || [];
        const reactionCounts = {};
        reactions.forEach(r => reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1);

        const AVAILABLE_REACTIONS = { 'love': '❤️', 'celebrate': '🎉', 'idea': '💡', 'action': '🚀', 'question': '🤔' };

        let reactionsHtml = Object.entries(reactionCounts).map(([type, count]) => {
            const emoji = AVAILABLE_REACTIONS[type];
            // isActive logic requires checking if currentUser reacted.
            const isActive = reactions.some(r => r.reaction_type === type && r.user_name === currentUser) ? 'active' : '';
            return `
                <div class="reaction-tag ${isActive}" data-action="reactionToggle" data-card-id="${card.id}" data-reaction-type="${type}" title="${type}">
                    <span>${emoji}</span>
                    <span class="reaction-count">${count}</span>
                </div>
            `;
        }).join('');

        let addReactionHtml = !isFinished ? `
            <div class="add-reaction-btn" data-action="reactionPicker" data-card-id="${card.id}">
                +🙂
                <!-- Picker would be injected or handled via a popover/modal since delegation might be tricky for inline popup management without state -->
            </div>
        ` : '';

        // Merged Cards Logic
        let mergedHtml = '';
        if (card.merged_cards && card.merged_cards.length > 0) {
            mergedHtml = `
                <div class="merged-cards-container">
                    ${card.merged_cards.map(mc => `<div class="merged-card-preview">${escapeHtml(mc.content)}</div>`).join('')}
                </div>
                 <div class="merged-indicator">
                    🔗 ${card.merged_cards.length} merged
                    ${!isFinished ? `<button class="btn-link" data-action="unmerge" data-card-id="${card.id}">Unmerge</button>` : ''}
                </div>
            `;
        }

        // Selection / Merge Action Logic
        let mergeActionHtml = '';
        if (!isFinished) {
            // We need to know if a card is selected globally or passed in context
            // For now, let's assume BoardController passes `selectedCardId` in `board` object or as extra arg?
            // Or we read global `window.selectedCardId` as a temporary bridge until we move selection state to Controller fully.
            // Controller sets `window.selectedCardId` in `handleSelectCard` for now.
            const selectedId = window.selectedCardId;

            if (selectedId) {
                if (selectedId === card.id) {
                    mergeActionHtml = `<button class="btn btn-outline btn-small" data-action="cancelSelection">${i18n.t('btn.cancel')}</button>`;
                } else {
                    mergeActionHtml = `<button class="btn btn-primary btn-small" data-action="mergeCard" data-card-id="${card.id}">${i18n.t('btn.merge_here')}</button>`;
                }
            } else {
                mergeActionHtml = `<button class="btn btn-outline btn-small" data-action="selectCard" data-card-id="${card.id}">${i18n.t('btn.select')}</button>`;
            }
        }

        const isSelectedClass = window.selectedCardId === card.id ? 'selected' : '';

        return `
            <div class="card ${actionItemClasses} ${isSelectedClass}" draggable="true" data-card-id="${card.id}">
                <div class="card-content">
                    ${actionItemBadge}
                    ${escapeHtml(card.content)}
                    <div class="reactions-container">
                        ${reactionsHtml}
                        ${addReactionHtml}
                    </div>
                    ${actionItemDetails}
                </div>
                ${mergedHtml}
                <div class="card-footer">
                    <small>${escapeHtml(card.owner || '?')}</small>
                    ${voteControls}
                    <div class="card-actions">
                        ${mergeActionHtml}
                        ${!isFinished ? `<button class="action-btn" data-action="itemEdit" data-card-id="${card.id}">✏️</button>` : ''}
                        ${!isFinished ? `<button class="action-btn" data-action="itemDelete" data-card-id="${card.id}">🗑️</button>` : ''}
                         ${!isFinished ? `<button class="action-btn" data-action="openActionModal" data-card-id="${card.id}" title="Make Action Item">⚡</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}
