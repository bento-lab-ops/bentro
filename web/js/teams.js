// Team Management Logic
import { apiCall } from './api.js';
import { escapeHtml, showToast } from './utils.js';


let currentTeamId = null;

// Load Teams View
async function loadTeamsView() {
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

    // Fetch and render
    await fetchAndRenderTeams();
    await fetchAndRenderAvailableTeams();

    // Start Auto-Refresh
    if (window.teamsRefreshInterval) clearInterval(window.teamsRefreshInterval);
    window.teamsRefreshInterval = setInterval(() => {
        if (document.getElementById('teamsView').style.display !== 'none') {
            fetchAndRenderTeams();
            fetchAndRenderAvailableTeams();
        } else {
            clearInterval(window.teamsRefreshInterval);
        }
    }, 10000); // 10 seconds
}

function renderTeamsCreateButton() {
    // Handled in index.html, not needed here.
}

async function fetchAndRenderTeams() {
    const listContainer = document.getElementById('teamsList');
    listContainer.innerHTML = '<div class="text-center"><div class="loading-spinner"></div> Loading teams...</div>';

    try {
        const teams = await apiCall('/teams');
        renderTeams(teams);
    } catch (error) {
        console.error('Error loading teams:', error);
        listContainer.innerHTML = `<div class="text-center text-danger">Failed to load teams: ${error.message}</div>`;
    }
}

function switchTeamTab(tabName) {
    // Update Tab UI
    document.querySelectorAll('.team-nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName === 'myTeams' ? 'tabMyTeams' : 'tabExploreTeams').classList.add('active');

    // Show Content
    document.getElementById('myTeamsContent').style.display = tabName === 'myTeams' ? 'block' : 'none';
    document.getElementById('exploreTeamsContent').style.display = tabName === 'exploreTeams' ? 'block' : 'none';
}

function renderTeams(teams) {
    const list = document.getElementById('teamsList');
    list.innerHTML = '';

    if (teams.length === 0) {
        list.innerHTML = '<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">You are not a member of any team yet.</p>';
        return;
    }

    teams.forEach(team => {
        const div = document.createElement('div');
        div.className = 'team-card-premium';

        const currentUserId = window.currentUserState?.id;
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

async function fetchAndRenderAvailableTeams() {
    const container = document.getElementById('availableTeamsList');
    if (!container) return; // Must be added to HTML

    container.innerHTML = '<div class="loading-spinner"></div> Loading available teams...';

    try {
        const allTeams = await apiCall('/teams/all');
        const myTeams = await apiCall('/teams'); // Cache this? reused from prev call

        const myTeamIds = new Set(myTeams.map(t => t.id));
        const availableTeams = allTeams.filter(t => !myTeamIds.has(t.id));

        renderAvailableTeams(availableTeams);
    } catch (error) {
        console.error('Error loading available teams:', error);
        container.innerHTML = `<div class="text-danger">Failed to load teams: ${error.message}</div>`;
    }
}

function renderAvailableTeams(teams) {
    const listContainer = document.getElementById('availableTeamsList');
    listContainer.innerHTML = '';

    if (teams.length === 0) {
        listContainer.innerHTML = '<div class="text-muted text-center" style="padding: 2rem;">No other teams available to join right now.</div>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'teams-grid';

    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card card';
        card.style.borderColor = 'var(--border)';

        const joinButton = team.is_invite_only
            ? `<button class="btn btn-secondary btn-sm" disabled title="Invite Only"><i class="fas fa-lock"></i> Locked</button>`
            : `<button class="btn btn-primary btn-sm" onclick="joinTeam('${team.id}')">Join Team</button>`;

        card.innerHTML = `
            <h3>${escapeHtml(team.name)} ${team.is_invite_only ? '<i class="fas fa-lock" title="Invite Only" style="font-size: 0.8rem; color: var(--text-secondary);"></i>' : ''}</h3>
            <p>${escapeHtml(team.description || 'No description')}</p>
            <div class="team-meta">
                <span><i class="fas fa-calendar-alt"></i> ${new Date(team.created_at).toLocaleDateString()}</span>
                <span><i class="fas fa-user-friends"></i> ${team.members ? team.members.length : 0} members</span>
            </div>
            <div style="margin-top: 1rem; text-align: right;">
                ${joinButton}
            </div>
        `;
        grid.appendChild(card);
    });

    listContainer.appendChild(grid);
}

async function joinTeam(teamId) {
    if (!confirm('Join this team?')) return;

    // Optimistic UI: Find button and set loading state
    const btn = document.querySelector(`button[onclick="joinTeam('${teamId}')"]`);
    const originalText = btn ? btn.innerText : '';
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Joining...';
    }

    try {
        await apiCall(`/teams/${teamId}/join`, 'POST');
        showToast('Joined team successfully!');

        // Optimistic UI: Remove the card immediately
        const card = document.querySelector(`.team-card button[onclick="joinTeam('${teamId}')"]`)?.closest('.team-card');
        if (card) {
            card.remove();
        }

        // Reload views to ensure state consistency (in background or next navigation)
        // We do NOT reload the whole view immediately if we just removed the card, 
        // unless the list is empty, to prevent jarring refresh.
        // But for safety, we trigger a data refresh.
        // loadTeamsView(); 
    } catch (error) {
        alert('Failed to join team: ' + error.message);
        // Revert button state on error
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
        loadTeamsView(); // Refresh to ensure correct state (maybe already joined?)
    }
}

// ... Create modal functions ...

function openCreateTeamModal() {
    document.getElementById('createTeamModal').style.display = 'block';
    document.getElementById('createTeamName').value = '';
    document.getElementById('createTeamDesc').value = '';
    document.getElementById('createTeamName').focus();
    document.getElementById('createTeamInviteOnly').checked = false;
}

function closeCreateTeamModal() {
    document.getElementById('createTeamModal').style.display = 'none';
}

async function handleCreateTeam(e) {
    e.preventDefault();
    const name = document.getElementById('createTeamName').value;
    const desc = document.getElementById('createTeamDesc').value;
    const isInviteOnly = document.getElementById('createTeamInviteOnly').checked;

    try {
        await apiCall('/teams', 'POST', { name, description: desc, is_invite_only: isInviteOnly });

        closeCreateTeamModal();
        showToast('Team created successfully!');

        // Wait a bit to ensure backend consistency, then refresh
        setTimeout(() => {
            fetchAndRenderTeams();
        }, 500);
    } catch (error) {
        alert(error.message);
    }
}


// Team Details View
async function openTeamDetails(teamId) {
    currentTeamId = teamId;

    // Update Hash if not already
    if (window.location.hash !== `#team/${teamId}`) {
        window.location.hash = `#team/${teamId}`;
        return; // Router will call us back
    }

    // Hide Teams List, Show Details
    const teamsView = document.getElementById('teamsView');
    if (teamsView) teamsView.style.display = 'none';

    // Hide other main views just in case (redundant if router handles it but safe)
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('boardContainer').style.display = 'none';
    const actionItemsView = document.getElementById('actionItemsView');
    if (actionItemsView) actionItemsView.style.display = 'none';

    const detailsView = document.getElementById('teamDetailsView');
    detailsView.style.display = 'block';

    // Ensure Home Icon is visible
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'block';

    await loadTeamDetails(teamId);
}

window.openTeamDetails = openTeamDetails;

async function loadTeamDetails(teamId) {
    const container = document.getElementById('teamDetailsContent');
    container.innerHTML = '<div class="loading-spinner"></div> Loading details...';

    try {
        const team = await apiCall(`/teams/${teamId}`);
        renderTeamDetails(team);
    } catch (error) {
        container.innerHTML = `<div class="text-danger">Error: ${error.message}</div>`;
    }
}

function renderTeamDetails(team) {
    const currentUserId = window.currentUserId || (window.currentUser ? window.currentUser.id : null);
    const isOwner = team.members.some(m => m.user_id === currentUserId && m.role === 'owner');

    const container = document.getElementById('teamDetailsContent');
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
                        <button class="btn btn-primary btn-sm" onclick="openAddMemberModal()">+ Add Member</button>
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
                                ${team.members.map(m => `
                                    <tr style="border-bottom: 1px solid var(--border-light);">
                                        <td style="padding: 0.8rem; display: flex; align-items: center; gap: 0.8rem;">
                                            <div class="member-avatar-small" style="font-size: 1.2rem;">${m.user.avatar || '👤'}</div>
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
                                            ${(isOwner && m.role !== 'owner') || (m.user_id === currentUserId) ?
            `<button class="btn btn-danger btn-sm" onclick="removeTeamMember('${m.user_id}')" title="Remove Member">&times;</button>`
            : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                         </table>
                    </div>
                </div>

                <div class="team-settings-card card">
                    <h3>Team Settings</h3>
                    <p class="text-secondary" style="font-size: 0.9rem; margin-bottom: 1.5rem;">Manage team properties and danger zone.</p>
                    
                    <div class="danger-zone" style="border: 1px solid var(--danger); border-radius: 8px; padding: 1rem; background: rgba(255, 0, 0, 0.05);">
                        <h4 style="color: var(--danger); margin-top: 0;">Danger Zone</h4>
                        <p style="font-size: 0.9rem;">Once you delete a team, there is no going back. Please be certain.</p>
                        ${isOwner ? `
                            <button class="btn btn-danger" style="width: 100%;" onclick="deleteTeam('${team.id}')">Delete Team</button>
                        ` : '<button class="btn btn-disabled" style="width: 100%;" disabled>Delete Locked (Owner Only)</button>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Add Member with Search
function openAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'block';

    // Reset fields
    const searchInput = document.getElementById('addMemberSearch');
    searchInput.value = '';
    searchInput.focus();

    document.getElementById('selectedMemberEmail').value = '';
    document.getElementById('userSearchResults').style.display = 'none';
    document.getElementById('btnAddMemberSubmit').disabled = true;
}

function closeAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'none';
}

let searchTimeout;
function handleUserSearch(query) {
    if (searchTimeout) clearTimeout(searchTimeout);

    const resultsContainer = document.getElementById('userSearchResults');
    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const users = await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
            renderSearchResults(users);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, 300); // Debounce
}

function renderSearchResults(users) {
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
            <div style="font-weight: bold;">${escapeHtml(user.name || user.display_name)}</div>
            <div style="font-size: 0.8rem; color: #666;">${escapeHtml(user.email)}</div>
        `;
        item.onclick = () => selectUserForTeam(user);
        container.appendChild(item);
    });

    container.style.display = 'block';
}

function selectUserForTeam(user) {
    document.getElementById('addMemberSearch').value = user.name || user.display_name;
    document.getElementById('selectedMemberEmail').value = user.email;
    document.getElementById('userSearchResults').style.display = 'none';
    document.getElementById('btnAddMemberSubmit').disabled = false;
}

async function handleAddMember(e) {
    e.preventDefault();
    const email = document.getElementById('selectedMemberEmail').value;
    // Fallback if user typed exact email but didn't click
    const searchValue = document.getElementById('addMemberSearch').value;
    const finalEmail = email || (searchValue.includes('@') ? searchValue : null);

    if (!finalEmail) {
        alert('Please select a user or enter a valid email.');
        return;
    }

    try {
        await apiCall(`/teams/${currentTeamId}/members`, 'POST', { email: finalEmail });

        closeAddMemberModal();
        showToast('Member added successfully!');
        loadTeamDetails(currentTeamId);
    } catch (error) {
        alert(error.message);
    }
}

// Edit Team
function openEditTeamModal(id, name, desc, isInviteOnly) {
    document.getElementById('editTeamModal').style.display = 'block';
    document.getElementById('editTeamName').value = name;
    document.getElementById('editTeamDesc').value = desc;
    document.getElementById('editTeamInviteOnly').checked = !!isInviteOnly;
}

function closeEditTeamModal() {
    document.getElementById('editTeamModal').style.display = 'none';
}

async function handleEditTeam(e) {
    e.preventDefault();
    const name = document.getElementById('editTeamName').value;
    const desc = document.getElementById('editTeamDesc').value;
    const isInviteOnly = document.getElementById('editTeamInviteOnly').checked;

    try {
        await apiCall(`/teams/${currentTeamId}`, 'PUT', { name, description: desc, is_invite_only: isInviteOnly });
        closeEditTeamModal();
        showToast('Team updated successfully!');
        loadTeamDetails(currentTeamId);
    } catch (error) {
        alert(error.message);
    }
}

// Remove Member
async function removeTeamMember(userId) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
        await apiCall(`/teams/${currentTeamId}/members/${userId}`, 'DELETE');

        showToast('Member removed.');
        loadTeamDetails(currentTeamId);
    } catch (error) {
        alert(error.message);
    }
}

// Delete Team
async function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;

    try {
        await apiCall(`/teams/${teamId}`, 'DELETE');

        showToast('Team deleted.');
        loadTeamsView();
    } catch (error) {
        alert(error.message);
    }
}

// ... (functions)
export async function promoteMember(teamId, userId, userName) {
    if (confirm(`Are you sure you want to promote ${userName} to Owner? They will have full control over this team.`)) {
        try {
            await apiCall(`/teams/${teamId}/members/${userId}/role`, 'PUT', { role: 'owner' });
            showToast(`${userName} promoted to Owner`);
            loadTeamDetails(teamId); // Refresh details
        } catch (error) {
            console.error('Error promoting member:', error);
            showToast(error.message || 'Failed to promote member', 'error');
        }
    }
}

// Manage Teams Logic for Board (Moved from main.js)
export function openManageTeamsModal() {
    document.getElementById('manageTeamsModal').style.display = 'block';
    populateManageTeamsModal();
};

export function closeManageTeamsModal() {
    document.getElementById('manageTeamsModal').style.display = 'none';
};

export async function populateManageTeamsModal() {
    if (!window.currentBoard) return;

    const list = document.getElementById('manageTeamsList');
    const select = document.getElementById('manageTeamsSelect');

    list.innerHTML = '<div class="spinner"></div>';

    try {
        // Fetch User's Teams for Dropdown
        const userTeams = await apiCall('/teams');

        // Populate Dropdown
        select.innerHTML = `<option value="" disabled selected>${i18n.t('label.select_team') || 'Select a team...'}</option>`;
        userTeams.forEach(team => {
            // Check if team is already in board
            const isMember = window.currentBoard.teams && window.currentBoard.teams.some(t => t.id === team.id);
            if (!isMember) {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            }
        });

        // Render List
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

export async function addTeamToBoard() {
    const select = document.getElementById('manageTeamsSelect');
    const teamId = select.value;
    if (!teamId || !window.currentBoard) return;

    try {
        const currentTeamIds = window.currentBoard.teams ? window.currentBoard.teams.map(t => t.id) : [];
        if (!currentTeamIds.includes(teamId)) {
            const newTeamIds = [...currentTeamIds, teamId];

            const updatedBoard = await apiCall(`/boards/${window.currentBoard.id}/teams`, 'PUT', { team_ids: newTeamIds });
            window.currentBoard = updatedBoard;
            alert(i18n.t('msg.team_added') || 'Team added successfully');
            populateManageTeamsModal();
            // Assuming renderBoardHeader is in main.js or globally available?
            // Actually main.js had it inline, checking if function exists.
            if (window.renderBoardHeader) window.renderBoardHeader();
        }
    } catch (error) {
        console.error('Failed to add team:', error);
        alert(error.message || 'Failed to add team');
    }
};

export async function removeTeamFromBoard(teamId) {
    if (!window.currentBoard || !confirm(i18n.t('confirm.remove_team') || 'Are you sure you want to remove this team?')) return;

    try {
        const currentTeamIds = window.currentBoard.teams ? window.currentBoard.teams.map(t => t.id) : [];
        const newTeamIds = currentTeamIds.filter(id => id !== teamId);

        const updatedBoard = await apiCall(`/boards/${window.currentBoard.id}/teams`, 'PUT', { team_ids: newTeamIds });
        window.currentBoard = updatedBoard;
        alert(i18n.t('msg.team_removed') || 'Team removed successfully');
        populateManageTeamsModal();
        if (window.renderBoardHeader) window.renderBoardHeader();
    } catch (error) {
        console.error('Failed to remove team:', error);
        alert(error.message || 'Failed to remove team');
    }
};


// Exported functions need to be global for onclick events in HTML strings (which we are generating)
// AND for other files calling them via window (if any)
window.loadTeamsView = loadTeamsView;

window.joinTeam = joinTeam;
window.openCreateTeamModal = openCreateTeamModal;
window.closeCreateTeamModal = closeCreateTeamModal;
window.handleCreateTeam = handleCreateTeam;
window.openAddMemberModal = openAddMemberModal;
window.closeAddMemberModal = closeAddMemberModal;
window.handleAddMember = handleAddMember;
window.openEditTeamModal = openEditTeamModal;
window.closeEditTeamModal = closeEditTeamModal;
window.handleEditTeam = handleEditTeam;
window.removeTeamMember = removeTeamMember;
window.deleteTeam = deleteTeam;
window.promoteMember = promoteMember;
window.selectUserForTeam = selectUserForTeam;
window.handleUserSearch = handleUserSearch;
window.switchTeamTab = switchTeamTab; // Added
window.addTeamToBoard = addTeamToBoard;
window.removeTeamFromBoard = removeTeamFromBoard;
window.openManageTeamsModal = openManageTeamsModal;
window.closeManageTeamsModal = closeManageTeamsModal;

// Helper to populate teams in New Board modal
export async function populateBoardTeamSelect() {
    const select = document.getElementById('boardTeamSelect');
    if (!select) return;

    // Clear existing (keep first option)
    select.innerHTML = `<option value="" data-i18n="option.no_team">${i18n.t('option.no_team') || 'No Team (Personal)'}</option>`;

    try {
        const userTeams = await apiCall('/teams'); // Use cached or new call
        // Sort alphabetically
        userTeams.sort((a, b) => a.name.localeCompare(b.name));

        userTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            select.appendChild(option);
        });

        // If inside a team view, select it and disable
        // window.currentTeamId is set in teams.js logic
        if (window.location.hash.startsWith('#team/') && currentTeamId) {
            select.value = currentTeamId;
            select.disabled = true;
        } else {
            select.disabled = false;
        }

    } catch (error) {
        console.error('Failed to load teams for dropdown:', error);
    }
}

// Check imports
import { i18n } from './i18n.js';

// Exports
export {
    loadTeamsView,
    openTeamDetails,
    joinTeam,
    openCreateTeamModal,
    closeCreateTeamModal,
    handleCreateTeam,
    openAddMemberModal,
    closeAddMemberModal,
    handleAddMember,
    openEditTeamModal,
    closeEditTeamModal,
    handleEditTeam,
    removeTeamMember,
    deleteTeam,
    handleUserSearch,
    selectUserForTeam,
    switchTeamTab
};

// Add to window shim
window.populateBoardTeamSelect = populateBoardTeamSelect;

