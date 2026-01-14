import { apiCall } from '../api.js';
import { escapeHtml, showToast } from '../utils.js';
import { i18n } from '../i18n.js';

export class TeamsController {
    constructor() {
        this.currentTeamId = null;
        this.refreshInterval = null;
        // Bind methods for safe passing
        this.handleUserSearch = this.handleUserSearch.bind(this);
    }

    // --- View Logic ---

    async showView() {
        // Hide other views
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('boardContainer').style.display = 'none';
        const actionItemsView = document.getElementById('actionItemsView');
        if (actionItemsView) actionItemsView.style.display = 'none';
        const adminView = document.getElementById('adminView');
        if (adminView) adminView.style.display = 'none';
        document.getElementById('teamDetailsView').style.display = 'none';

        // Show Teams View
        const container = document.getElementById('teamsView');
        container.style.display = 'block';

        // Show Home Icon
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'block';

        // Hide New Board Button
        const newBoardBtn = document.getElementById('newBoardBtn');
        if (newBoardBtn) newBoardBtn.style.display = 'none';

        // Update URL hash
        if (window.location.hash !== '#teams') {
            window.location.hash = '#teams';
        }

        // Check Authentication
        if (!window.currentUserId) {
            this.renderLoginRequiredState();
            return;
        }

        // Fetch and render
        await this.fetchAndRenderTeams();
        await this.fetchAndRenderAvailableTeams();

        // Restore last tab
        const lastTab = localStorage.getItem('lastTeamsTab') || 'myTeams';
        this.switchTeamTab(lastTab);

        // Start Auto-Refresh
        this.startAutoRefresh();
    }

    renderLoginRequiredState() {
        document.getElementById('teamsList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔒</div>
                <h3>Authentication Required</h3>
                <p class="text-secondary mb-3">You need to login to access Teams features.</p>
                <button class="btn btn-primary" onclick="openLoginModal()">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
            </div>
        `;
        document.getElementById('availableTeamsList').innerHTML = '';
        document.getElementById('exploreTeamsContent').style.display = 'none';
        document.getElementById('myTeamsContent').style.display = 'block';
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => {
            if (document.getElementById('teamsView').style.display !== 'none') {
                this.fetchAndRenderTeams();
                this.fetchAndRenderAvailableTeams();
            } else {
                clearInterval(this.refreshInterval);
            }
        }, 10000); // 10 seconds
    }

    switchTeamTab(tabName) {
        localStorage.setItem('lastTeamsTab', tabName);
        document.querySelectorAll('.team-nav-tab').forEach(t => t.classList.remove('active'));
        const tabId = tabName === 'myTeams' ? 'tabMyTeams' : 'tabExploreTeams'; // Fixed ID reference
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.classList.add('active');

        document.getElementById('myTeamsContent').style.display = tabName === 'myTeams' ? 'block' : 'none';
        document.getElementById('exploreTeamsContent').style.display = tabName === 'exploreTeams' ? 'block' : 'none';
    }

    // --- Data Fetching & Rendering ---

    async fetchAndRenderTeams() {
        const listContainer = document.getElementById('teamsList');
        if (!listContainer) return;

        // Only show spinner if empty to avoid flicker on refresh
        if (!listContainer.hasChildNodes() || listContainer.innerHTML.includes('Loading')) {
            listContainer.innerHTML = '<div class="text-center"><div class="loading-spinner"></div> Loading teams...</div>';
        }

        try {
            const teams = await apiCall('/teams');
            this.renderTeams(teams);
        } catch (error) {
            console.error('Error loading teams:', error);
            listContainer.innerHTML = `<div class="text-center text-danger">Failed to load teams: ${error.message}</div>`;
        }
    }

    renderTeams(teams) {
        const list = document.getElementById('teamsList');
        list.innerHTML = '';

        if (teams.length === 0) {
            list.innerHTML = '<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">You are not a member of any team yet.</p>';
            return;
        }

        // Teams Grid Container (Ensure grid layout)
        // Note: The parent #teamsList already has .teams-grid class in HTML?
        // Let's verify: In previous fix, we removed nested divs.
        // We append cards directly to #teamsList (which should be a grid container).

        teams.forEach(team => {
            const div = document.createElement('div');
            div.className = 'team-card-premium';

            const currentUserId = window.currentUserState?.id || window.currentUserId; // Fallback
            const isOwner = currentUserId && (team.owner_id === currentUserId);
            const isAdmin = !!localStorage.getItem('adminToken');

            div.innerHTML = `
                <div class="team-card-header">
                    <div>
                         <h3 class="team-card-title">${escapeHtml(team.name)}</h3>
                         ${team.is_invite_only ? '<span class="team-card-badge">🔒 Invite Only</span>' : ''}
                    </div>
                    ${isAdmin ? '<span class="team-card-badge">Admin View</span>' : ''}
                </div>
                
                <div class="team-card-desc">
                    ${escapeHtml(team.description || 'No description provided.')}
                </div>
                
                <div class="team-card-footer">
                     <div class="member-count">
                        <i class="fas fa-users"></i> ${team.member_count || 0} members
                     </div>
                     <div class="team-card-actions">
                         ${isOwner
                    ? `<button class="btn btn-outline btn-sm action-btn" onclick="openEditTeamModal('${team.id}', '${escapeHtml(team.name)}', '${escapeHtml(team.description || '')}', ${team.is_invite_only})">Edit</button>`
                    : `<button class="btn btn-outline btn-sm action-btn" onclick="confirmLeaveTeam('${team.id}', '${escapeHtml(team.name)}')">Leave</button>`
                }
                         <button class="btn btn-primary btn-sm action-btn" onclick="openTeamDetails('${team.id}')">View Details</button>
                     </div>
                </div>
            `;
            list.appendChild(div);
        });
    }

    async fetchAndRenderAvailableTeams() {
        const container = document.getElementById('availableTeamsList');
        if (!container) return;

        // Spinner only if empty
        if (!container.hasChildNodes()) {
            container.innerHTML = '<div class="loading-spinner"></div> Loading available teams...';
        }

        try {
            const allTeams = await apiCall('/teams/all');
            const myTeams = await apiCall('/teams');

            const myTeamIds = new Set(myTeams.map(t => t.id));
            const availableTeams = allTeams.filter(t => !myTeamIds.has(t.id));

            this.renderAvailableTeams(availableTeams);
        } catch (error) {
            console.error('Error loading available teams:', error);
            container.innerHTML = `<div class="text-danger">Failed to load teams: ${error.message}</div>`;
        }
    }

    renderAvailableTeams(teams) {
        const listContainer = document.getElementById('availableTeamsList');
        listContainer.innerHTML = '';

        if (teams.length === 0) {
            listContainer.innerHTML = '<div class="text-muted text-center" style="padding: 2rem; grid-column: 1/-1;">No other teams available to join right now.</div>';
            return;
        }

        teams.forEach(team => {
            const card = document.createElement('div');
            card.className = 'team-card-premium';
            card.style.border = '1px solid var(--glass-border)';

            const joinButton = team.is_invite_only
                ? `<button class="btn btn-secondary btn-sm" disabled title="Invite Only"><i class="fas fa-lock"></i> Locked</button>`
                : `<button class="btn btn-primary btn-sm" onclick="joinTeam('${team.id}', '${escapeHtml(team.name)}')">Join Team</button>`;

            const memberCount = (team.member_count !== undefined) ? team.member_count : (team.members ? team.members.length : 0);

            card.innerHTML = `
                <div class="team-card-header">
                    <h3 class="team-card-title">${escapeHtml(team.name)} ${team.is_invite_only ? '<i class="fas fa-lock" title="Invite Only" style="font-size: 0.8rem; color: var(--text-secondary);"></i>' : ''}</h3>
                </div>
                <div class="team-card-desc">
                    ${escapeHtml(team.description || 'No description provided')}
                </div>
                <div class="team-card-footer">
                    <div class="team-meta">
                        <span><i class="fas fa-user-friends"></i> ${memberCount} members</span>
                    </div>
                    <div>
                        ${joinButton}
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    // --- Actions ---

    async handleLeaveTeam(teamId, teamName) {
        if (!await window.showConfirm(
            i18n.t('modal.confirm_leave_team') || 'Leave Team?',
            `Are you sure you want to leave the team <strong>${escapeHtml(teamName)}</strong>?`,
            { isDanger: true, confirmText: 'Leave Team' }
        )) return;

        try {
            const currentUserId = window.currentUserId || (window.currentUserState ? window.currentUserState.id : null);
            await apiCall(`/teams/${teamId}/members/${currentUserId}`, 'DELETE');

            await window.showAlert(i18n.t('msg.success'), i18n.t('msg.left_team') || 'You have left the team.');
            this.showView(); // Refresh list
        } catch (error) {
            console.error('Failed to leave team:', error);
            await window.showAlert(i18n.t('msg.error'), 'Failed to leave team: ' + error.message);
        }
    }

    async handleJoinTeam(teamId, teamName) {
        if (!await window.showConfirm(
            i18n.t('btn.join') + ' Team?',
            `Join the team <strong>${teamName}</strong>?`
        )) return;

        // UI Optimistic update handling would be good here but slightly complex without React
        // We can find button by onclick selector
        const btn = document.querySelector(`button[onclick="joinTeam('${teamId}', '${teamName}')"]`);
        const originalText = btn ? btn.innerText : '';
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Joining...';
        }

        try {
            await apiCall(`/teams/${teamId}/join`, 'POST');
            await window.showAlert(i18n.t('msg.success'), 'Joined team successfully!');
            this.openTeamDetails(teamId);
        } catch (error) {
            await window.showAlert(i18n.t('msg.error'), 'Failed to join team: ' + error.message);
            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }
            this.showView(); // Refresh
        }
    }

    // --- Modals: Create Team ---

    openCreateTeamModal() {
        document.getElementById('createTeamModal').style.display = 'block';
        document.getElementById('createTeamName').value = '';
        document.getElementById('createTeamDesc').value = '';
        document.getElementById('createTeamName').focus();
        document.getElementById('createTeamInviteOnly').checked = false;
    }

    closeCreateTeamModal() {
        document.getElementById('createTeamModal').style.display = 'none';
    }

    async handleCreateTeam(e) {
        e.preventDefault();
        const name = document.getElementById('createTeamName').value;
        const desc = document.getElementById('createTeamDesc').value;
        const isInviteOnly = document.getElementById('createTeamInviteOnly').checked;

        try {
            await apiCall('/teams', 'POST', { name, description: desc, is_invite_only: isInviteOnly });

            this.closeCreateTeamModal();
            await window.showAlert(i18n.t('msg.success'), 'Team created successfully!');

            // Small delay to allow DB propagation if needed
            setTimeout(() => {
                this.fetchAndRenderTeams();
            }, 500);
        } catch (error) {
            await window.showAlert(i18n.t('msg.error'), error.message);
        }
    }

    // --- Team Details ---

    async openTeamDetails(teamId) {
        this.currentTeamId = teamId;

        // Ensure Router knows about this change
        if (window.location.hash !== `#team/${teamId}`) {
            window.location.hash = `#team/${teamId}`;
            return; // Let router re-call us if needed, or proceed if called BY router? 
            // If called by Router, hash is already set.
            // If called by click, we set hash and Router calls us back.
            // But if we are already here, we proceed.
        }

        // Hide Teams List, Show Details
        const teamsView = document.getElementById('teamsView');
        if (teamsView) teamsView.style.display = 'none';

        // Hide others (standard cleanup)
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('boardContainer').style.display = 'none';
        document.getElementById('teamDetailsView').style.display = 'block';

        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'block';

        await this.loadTeamDetails(teamId);
    }

    async loadTeamDetails(teamId) {
        this.currentTeamId = teamId; // Ensure set
        const container = document.getElementById('teamDetailsContent');
        container.innerHTML = '<div class="loading-spinner"></div> Loading details...';

        try {
            const team = await apiCall(`/teams/${teamId}`);
            this.renderTeamDetails(team);
        } catch (error) {
            container.innerHTML = `<div class="text-danger">Error: ${error.message}</div>`;
        }
    }

    renderTeamDetails(team) {
        const currentUserId = window.currentUserId || (window.currentUser ? window.currentUser.id : null);
        const isOwner = team.members.some(m => m.user_id === currentUserId && m.role === 'owner');

        const container = document.getElementById('teamDetailsContent');

        // Helper to render member row
        const renderMemberRow = (m) => `
            <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.8rem; display: flex; align-items: center; gap: 0.8rem;">
                    <div class="member-avatar-small" style="font-size: 1.2rem;">${m.user.avatar_url || '👤'}</div>
                    <div>
                        <div style="font-weight: 500;">${escapeHtml(m.user.name || 'Unknown')}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(m.user.email || '')}</div>
                    </div>
                </td>
                <td style="padding: 0.8rem;">
                    <span class="role-badge ${m.role === 'owner' ? 'role-owner' : 'role-member'}" 
                          style="padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; background: ${m.role === 'owner' ? 'var(--primary-light)' : 'var(--bg-secondary)'}; color: ${m.role === 'owner' ? 'var(--primary)' : 'var(--text-primary)'};">
                        ${m.role.toUpperCase()}
                    </span>
                </td>
                <td style="padding: 0.8rem; text-align: right;">
                    ${isOwner && m.role !== 'owner' ?
                `<button class="btn btn-outline btn-sm" onclick="promoteMember('${team.id}', '${m.user_id}', '${escapeHtml(m.user.name || 'User')}')" title="Promote to Owner" style="margin-right: 0.5rem;"><i class="fas fa-crown"></i></button>`
                : ''}
                    ${(isOwner && m.role !== 'owner') ?
                `<button class="btn btn-danger btn-sm" onclick="removeTeamMember('${m.user_id}')" title="Remove Member">&times;</button>`
                : ''}
                </td>
            </tr>
        `;

        container.innerHTML = `
            <div class="page-container">
                <div class="page-controls">
                    <button class="btn btn-outline" onclick="loadTeamsView()">&larr; Back to Teams</button>
                </div>
                
                <div class="page-hero">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h1 class="page-title">${escapeHtml(team.name)} ${team.is_invite_only ? '<i class="fas fa-lock" title="Invite Only" style="font-size: 1rem; color: var(--text-secondary);"></i>' : ''}</h1>
                            <p class="page-subtitle">${escapeHtml(team.description || 'Manage your team members and settings')}</p>
                        </div>
                        ${isOwner ? `<button class="btn btn-secondary btn-sm" onclick="openEditTeamModal('${team.id}', '${escapeHtml(team.name)}', '${escapeHtml(team.description || '')}', ${team.is_invite_only})">Edit Team</button>` : ''}
                    </div>
                </div>

                <div class="team-details-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
                    <div class="team-members-card card">
                        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3>Team Members <span class="badge">${team.members.length}</span></h3>
                            ${isOwner ? `<button class="btn btn-primary btn-sm" onclick="openAddMemberModal()">+ Add Member</button>` : ''}
                        </div>
                        
                        <div class="members-list-table">
                             <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <th style="text-align: left; padding: 0.8rem;">User</th>
                                        <th style="text-align: left; padding: 0.8rem;">Role</th>
                                        <th style="text-align: right; padding: 0.8rem;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${team.members.map(renderMemberRow).join('')}
                                </tbody>
                             </table>
                        </div>
                    </div>

                    <div class="team-settings-card card">
                        <h3>Team Settings</h3>
                        <p class="text-secondary" style="font-size: 0.9rem; margin-bottom: 1.5rem;">Manage team properties.</p>
                        
                        ${isOwner ? `
                        <div class="danger-zone" style="border: 1px solid var(--danger); border-radius: 8px; padding: 1rem; background: rgba(255, 0, 0, 0.05);">
                            <h4 style="color: var(--danger); margin-top: 0;">Danger Zone</h4>
                            <p style="font-size: 0.9rem;">Once you delete a team, there is no going back. Please be certain.</p>
                                <button class="btn btn-danger" style="width: 100%;" onclick="deleteTeam('${team.id}')">Delete Team</button>
                        </div>
                        ` : `
                        <div class="info-zone" style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem;">
                            <p style="font-size: 0.9rem;">You are a member of this team.</p>
                            <button class="btn btn-outline btn-danger" style="width: 100%;" onclick="confirmLeaveTeam('${team.id}', '${escapeHtml(team.name)}')">Leave Team</button>
                        </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // --- Modals: Add Member ---

    openAddMemberModal() {
        document.getElementById('addMemberModal').style.display = 'block';

        const searchInput = document.getElementById('addMemberSearch');
        searchInput.value = '';
        searchInput.focus();

        document.getElementById('selectedMemberEmail').value = '';
        document.getElementById('userSearchResults').style.display = 'none';
        document.getElementById('btnAddMemberSubmit').disabled = true;
    }

    closeAddMemberModal() {
        document.getElementById('addMemberModal').style.display = 'none';
    }

    // Debounced Search
    handleUserSearch(query) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        const resultsContainer = document.getElementById('userSearchResults');
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        this.searchTimeout = setTimeout(async () => {
            try {
                const users = await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
                this.renderSearchResults(users);
            } catch (error) {
                console.error('Search failed:', error);
            }
        }, 300);
    }

    renderSearchResults(users) {
        const container = document.getElementById('userSearchResults');
        container.innerHTML = '';

        if (users.length === 0) {
            container.innerHTML = '<div class="search-result-item">No users found</div>';
            container.style.display = 'block';
            return;
        }

        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div style="font-size: 1.5rem; margin-right: 10px;">${user.avatar_url || '👤'}</div>
                <div>
                    <div style="font-weight: bold;">${escapeHtml(user.name || user.display_name)}</div>
                    <div style="font-size: 0.8rem; color: #666;">${escapeHtml(user.email)}</div>
                </div>
            `;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            // We use global helper or bind onclick. 
            // For now, let's use global shim 'selectUserForTeam' or make this render logic use a bound event listener.
            // Using ID on item is hard.
            // Best approach: Add onclick listener to element.
            item.addEventListener('click', () => this.selectUserForTeam(user));
            container.appendChild(item);
        });

        container.style.display = 'block';
    }

    selectUserForTeam(user) {
        document.getElementById('addMemberSearch').value = user.name || user.display_name;
        document.getElementById('selectedMemberEmail').value = user.email;
        document.getElementById('userSearchResults').style.display = 'none';
        document.getElementById('btnAddMemberSubmit').disabled = false;
    }

    async handleAddMember(e) {
        e.preventDefault();
        const email = document.getElementById('selectedMemberEmail').value;
        const searchValue = document.getElementById('addMemberSearch').value;
        const finalEmail = email || (searchValue.includes('@') ? searchValue : null);

        if (!finalEmail) {
            await window.showAlert(i18n.t('msg.warning'), 'Please select a user or enter a valid email.');
            return;
        }

        try {
            await apiCall(`/teams/${this.currentTeamId}/members`, 'POST', { email: finalEmail });

            this.closeAddMemberModal();
            showToast('Member added successfully!');
            this.loadTeamDetails(this.currentTeamId);
        } catch (error) {
            await window.showAlert(i18n.t('msg.error'), error.message);
        }
    }

    // --- Modals: Edit Team ---

    openEditTeamModal(id, name, desc, isInviteOnly) {
        document.getElementById('editTeamModal').style.display = 'block';
        document.getElementById('editTeamName').value = name;
        document.getElementById('editTeamDesc').value = desc;
        document.getElementById('editTeamInviteOnly').checked = !!isInviteOnly;
    }

    closeEditTeamModal() {
        document.getElementById('editTeamModal').style.display = 'none';
    }

    async handleEditTeam(e) {
        e.preventDefault();
        const name = document.getElementById('editTeamName').value;
        const desc = document.getElementById('editTeamDesc').value;
        const isInviteOnly = document.getElementById('editTeamInviteOnly').checked;

        try {
            await apiCall(`/teams/${this.currentTeamId}`, 'PUT', { name, description: desc, is_invite_only: isInviteOnly });
            this.closeEditTeamModal();
            showToast('Team updated successfully!');
            this.loadTeamDetails(this.currentTeamId);
        } catch (error) {
            await window.showAlert(i18n.t('msg.error'), error.message);
        }
    }

    // --- Admin Actions ---

    async removeTeamMember(userId) {
        if (!await window.showConfirm(i18n.t('modal.confirm'), 'Are you sure you want to remove this member?', { isDanger: true })) return;

        try {
            await apiCall(`/teams/${this.currentTeamId}/members/${userId}`, 'DELETE');
            showToast('Member removed.');
            this.loadTeamDetails(this.currentTeamId);
        } catch (error) {
            await window.showAlert(i18n.t('msg.error'), error.message);
        }
    }

    async deleteTeam(teamId) {
        if (!await window.showConfirm('Delete Team',
            'Are you sure you want to delete this team? This action cannot be undone.',
            { isDanger: true, confirmText: 'Delete Forever' }
        )) return;

        try {
            await apiCall(`/teams/${teamId}`, 'DELETE');
            showToast('Team deleted.');
            this.showView();
        } catch (error) {
            await window.showAlert(i18n.t('msg.error'), error.message);
        }
    }

    async promoteMember(teamId, userId, userName) {
        if (await window.showConfirm('Promote Member',
            `Are you sure you want to promote ${userName} to Owner? They will have full control over this team.`
        )) {
            try {
                await apiCall(`/teams/${teamId}/members/${userId}/role`, 'PUT', { role: 'owner' });
                showToast(`${userName} promoted to Owner`);
                this.loadTeamDetails(teamId);
            } catch (error) {
                console.error('Error promoting member:', error);
                showToast(error.message || 'Failed to promote member', 'error');
            }
        }
    }

    // --- Board Board Management (Manage Teams in a Board) ---
    // Kept here for encapsulation, but could be in BoardController

    openManageTeamsModal() {
        document.getElementById('manageTeamsModal').style.display = 'block';
        this.populateManageTeamsModal();
    }

    closeManageTeamsModal() {
        document.getElementById('manageTeamsModal').style.display = 'none';
    }

    async populateManageTeamsModal() {
        if (!window.currentBoard) return;

        const list = document.getElementById('manageTeamsList');
        const select = document.getElementById('manageTeamsSelect');

        list.innerHTML = '<div class="spinner"></div>';

        try {
            const userTeams = await apiCall('/teams');

            select.innerHTML = `<option value="" disabled selected>${i18n.t('label.select_team') || 'Select a team...'}</option>`;
            userTeams.forEach(team => {
                const isMember = window.currentBoard.teams && window.currentBoard.teams.some(t => t.id === team.id);
                if (!isMember) {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    select.appendChild(option);
                }
            });

            list.innerHTML = '';
            if (window.currentBoard.teams && window.currentBoard.teams.length > 0) {
                window.currentBoard.teams.forEach(team => {
                    const div = document.createElement('div');
                    div.className = 'team-item';
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';
                    div.style.alignItems = 'center';
                    div.style.padding = '8px';
                    div.style.borderBottom = '1px solid var(--border-color)';

                    // Use global shim for onclick or add listener?
                    // Legacy HTML structure often easier with onclick shim
                    div.innerHTML = `
                        <span>${team.name}</span>
                        <button class="btn btn-outline btn-small btn-danger" onclick="removeTeamFromBoard('${team.id}')">Remove</button>
                    `;
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 10px;">${i18n.t('msg.no_teams') || 'No teams added yet.'}</div>`;
            }

        } catch (error) {
            console.error('Failed to populate manage teams:', error);
            list.innerHTML = `<div class="error">Failed to load teams</div>`;
        }
    }

    async addTeamToBoard() {
        const select = document.getElementById('manageTeamsSelect');
        const teamId = select.value;
        if (!teamId || !window.currentBoard) return;

        try {
            const currentTeamIds = window.currentBoard.teams ? window.currentBoard.teams.map(t => t.id) : [];
            if (!currentTeamIds.includes(teamId)) {
                const newTeamIds = [...currentTeamIds, teamId];

                const updatedBoard = await apiCall(`/boards/${window.currentBoard.id}/teams`, 'PUT', { team_ids: newTeamIds });
                window.currentBoard = updatedBoard;
                this.populateManageTeamsModal();
                if (window.renderBoardHeader) window.renderBoardHeader();
            }
        } catch (error) {
            console.error('Failed to add team:', error);
            await window.showAlert('Error', error.message || 'Failed to add team');
        }
    }

    async removeTeamFromBoard(teamId) {
        if (!window.currentBoard || !await window.showConfirm(i18n.t('confirm.remove_team'), 'Are you sure you want to remove this team from the board?', { isDanger: true })) return;

        try {
            const currentTeamIds = window.currentBoard.teams ? window.currentBoard.teams.map(t => t.id) : [];
            const newTeamIds = currentTeamIds.filter(id => id !== teamId);

            const updatedBoard = await apiCall(`/boards/${window.currentBoard.id}/teams`, 'PUT', { team_ids: newTeamIds });
            window.currentBoard = updatedBoard;
            this.populateManageTeamsModal();
            if (window.renderBoardHeader) window.renderBoardHeader();
        } catch (error) {
            console.error('Failed to remove team:', error);
            await window.showAlert('Error', error.message || 'Failed to remove team');
        }
    }

    // Helper: Populate Board Team Select (New Board Modal)
    async populateBoardTeamSelect() {
        const select = document.getElementById('boardTeamSelect');
        if (!select) return;

        select.innerHTML = `<option value="" data-i18n="option.no_team">${i18n.t('option.no_team') || 'No Team (Personal)'}</option>`;

        try {
            const userTeams = await apiCall('/teams');
            userTeams.sort((a, b) => a.name.localeCompare(b.name));

            userTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            });

            if (window.location.hash.startsWith('#team/') && this.currentTeamId) {
                select.value = this.currentTeamId;
                select.disabled = true;
            } else {
                select.disabled = false;
            }
        } catch (error) {
            console.error('Failed to load teams for dropdown:', error);
        }
    }
}

export const teamsController = new TeamsController();

// Expose methods for legacy HTML onclicks
window.loadTeamsView = () => teamsController.showView();
window.openTeamDetails = (id) => teamsController.openTeamDetails(id);
window.joinTeam = (id, name) => teamsController.handleJoinTeam(id, name);
window.confirmLeaveTeam = (id, name) => teamsController.handleLeaveTeam(id, name);
window.switchTeamTab = (tab) => teamsController.switchTeamTab(tab);

window.openCreateTeamModal = () => teamsController.openCreateTeamModal();
window.closeCreateTeamModal = () => teamsController.closeCreateTeamModal();
window.handleCreateTeam = (e) => teamsController.handleCreateTeam(e);

window.openAddMemberModal = () => teamsController.openAddMemberModal();
window.closeAddMemberModal = () => teamsController.closeAddMemberModal();
window.handleAddMember = (e) => teamsController.handleAddMember(e);
window.selectUserForTeam = (u) => teamsController.selectUserForTeam(u);
window.handleUserSearch = (q) => teamsController.handleUserSearch(q);

window.openEditTeamModal = (id, n, d, i) => teamsController.openEditTeamModal(id, n, d, i);
window.closeEditTeamModal = () => teamsController.closeEditTeamModal();
window.handleEditTeam = (e) => teamsController.handleEditTeam(e);

window.removeTeamMember = (id) => teamsController.removeTeamMember(id);
window.deleteTeam = (id) => teamsController.deleteTeam(id);
window.promoteMember = (tid, uid, name) => teamsController.promoteMember(tid, uid, name);

window.openManageTeamsModal = () => teamsController.openManageTeamsModal();
window.closeManageTeamsModal = () => teamsController.closeManageTeamsModal();
window.addTeamToBoard = () => teamsController.addTeamToBoard();
window.removeTeamFromBoard = (id) => teamsController.removeTeamFromBoard(id);
