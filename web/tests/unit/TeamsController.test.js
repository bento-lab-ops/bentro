// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsController } from '../../js/controllers/TeamsController.js';
import { apiCall } from '../../js/api.js';

// Mocks
vi.mock('../../js/api.js');
vi.mock('../../js/utils.js', () => ({
    escapeHtml: (s) => s,
    showToast: vi.fn()
}));
vi.mock('../../js/i18n.js', () => ({
    i18n: { t: k => k }
}));

// Mock window globals
Object.assign(window, {
    currentUser: { id: 'u1', name: 'User 1' },
    currentUserId: 'u1',
    showAlert: vi.fn().mockResolvedValue(),
    showConfirm: vi.fn().mockResolvedValue(true),
    location: { hash: '' }
});

describe('TeamsController', () => {
    let controller;

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = `
            <div id="dashboardView"></div>
            <div id="boardContainer"></div>
            <div id="teamsView" style="display:none;"></div>
            <div id="teamsList"></div>
            <div id="availableTeamsList"></div>
            <div id="createTeamModal" style="display:none;">
                <input id="createTeamName" />
                <input id="createTeamDesc" />
                <input id="createTeamInviteOnly" type="checkbox" />
            </div>
             <div id="teamDetailsView" style="display:none;"></div>
             <div id="dashboardBtn"></div>
             <div id="newBoardBtn"></div>
             <!-- Tabs -->
             <div id="tabMyTeams"></div>
             <div id="tabExploreTeams"></div>
             <div id="myTeamsContent"></div>
             <div id="exploreTeamsContent"></div>
        `;
        controller = new TeamsController();
    });

    describe('fetchAndRenderTeams', () => {
        it('should fetch teams and render list', async () => {
            const mockTeams = [{ id: 't1', name: 'Team 1', member_count: 5 }];
            apiCall.mockResolvedValue(mockTeams);

            await controller.fetchAndRenderTeams();

            expect(apiCall).toHaveBeenCalledWith('/teams');
            const list = document.getElementById('teamsList');
            expect(list.innerHTML).toContain('Team 1');
            expect(list.innerHTML).toContain('5 members');
        });

        it('should show empty message if no teams', async () => {
            apiCall.mockResolvedValue([]);

            await controller.fetchAndRenderTeams();

            expect(document.getElementById('teamsList').textContent).toContain('not a member');
        });
    });

    describe('handleCreateTeam', () => {
        it('should call API and reload teams', async () => {
            // Setup DOM inputs
            document.getElementById('createTeamName').value = 'New Team';
            document.getElementById('createTeamDesc').value = 'Desc';
            document.getElementById('createTeamInviteOnly').checked = true;

            apiCall.mockResolvedValue({ id: 'new-id' });

            // Mock fetchAndRenderTeams to verify reload
            controller.fetchAndRenderTeams = vi.fn();

            // Mock Event
            const e = { preventDefault: vi.fn() };

            await controller.handleCreateTeam(e);

            expect(apiCall).toHaveBeenCalledWith('/teams', 'POST', {
                name: 'New Team',
                description: 'Desc',
                is_invite_only: true
            });
            expect(document.getElementById('createTeamModal').style.display).toBe('none');
            // Wait for timeout in controller
            await new Promise(r => setTimeout(r, 600));
            expect(controller.fetchAndRenderTeams).toHaveBeenCalled();
        });
    });

    describe('handleJoinTeam', () => {
        it('should call API, show alert, and open details', async () => {
            apiCall.mockResolvedValue({});
            controller.openTeamDetails = vi.fn();

            await controller.handleJoinTeam('t2', 'Awesome Team');

            expect(window.showConfirm).toHaveBeenCalled();
            expect(apiCall).toHaveBeenCalledWith('/teams/t2/join', 'POST');
            expect(window.showAlert).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('successfully'));
            expect(controller.openTeamDetails).toHaveBeenCalledWith('t2');
        });
    });
});
