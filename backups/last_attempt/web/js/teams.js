// Team Management Logic

let currentTeamId = null;

// Load Teams View
async function loadTeamsView() {
    // Hide other views
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('boardContainer').style.display = 'none';
    document.getElementById('actionItemsView').style.display = 'none';
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

function renderTeams(teams) {
    const listContainer = document.getElementById('teamsList');
    listContainer.innerHTML = '';

    if (teams.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No Teams Yet</h3>
                <p>Create a team to collaborate on boards together.</p>
                <!-- Button removed as per request, use top button -->
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'teams-grid';

    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card card'; // Added 'card' class for better styling if exists
        card.innerHTML = `
            <h3>${escapeHtml(team.name)}</h3>
            <p>${escapeHtml(team.description || 'No description')}</p>
            <div class="team-meta">
                <span><i class="fas fa-calendar-alt"></i> ${new Date(team.created_at).toLocaleDateString()}</span>
                <span><i class="fas fa-user-friends"></i> ${team.members ? team.members.length : 0} members</span>
            </div>
            <div style="margin-top: 1rem; text-align: right;">
                <button class="btn btn-secondary btn-sm" onclick="openTeamDetails('${team.id}')">Manage Team</button>
            </div>
        `;
        grid.appendChild(card);
    });

    listContainer.appendChild(grid);
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
    try {
        await apiCall(`/teams/${teamId}/join`, 'POST');
        showToast('Joined team successfully!');
        loadTeamsView(); // Refresh lists
    } catch (error) {
        alert('Failed to join team: ' + error.message);
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

    // Hide Teams List, Show Details
    document.getElementById('teamsView').style.display = 'none';
    const detailsView = document.getElementById('teamDetailsView');
    detailsView.style.display = 'block';

    // Ensure Home Icon is visible
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'block';

    await loadTeamDetails(teamId);
}

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
                                            ${(isOwner && m.role !== 'owner') || (m.user_id === currentUserId && m.role !== 'owner') ?
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
