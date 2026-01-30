import { apiCall } from '../api.js';
import { escapeHtml } from '../utils.js';

export class TeamAnalyticsController {
    constructor() {
        this.currentTeamId = null;
    }

    async showAnalytics(teamId) {
        this.currentTeamId = teamId;

        // Hide other views
        document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');
        document.getElementById('boardContainer').style.display = 'none';

        // Show Analytics View
        const container = document.getElementById('teamAnalyticsView');
        container.style.display = 'block';

        // Update URL hash (optional, maybe #team/:id/analytics)
        // window.location.hash = `#team/${teamId}/analytics`;

        await this.loadAnalytics(teamId);
    }

    async loadAnalytics(teamId) {
        const container = document.getElementById('teamAnalyticsContent');
        container.innerHTML = '<div class="loading-spinner"></div> Loading analytics...';

        try {
            // Fetch Team Details and Stats in parallel
            const [team, stats] = await Promise.all([
                apiCall(`/teams/${teamId}`),
                apiCall(`/teams/${teamId}/analytics`)
            ]);

            this.renderAnalytics(team, stats);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            container.innerHTML = `<div class="text-danger">Failed to load analytics: ${error.message}</div>`;
        }
    }

    renderAnalytics(team, stats) {
        const container = document.getElementById('teamAnalyticsContent');

        container.innerHTML = `
            <div class="page-container">
                <div class="page-controls">
                    <button class="btn btn-outline" onclick="openTeamDetails('${team.id}')">&larr; Back to Team</button>
                </div>

                <div class="page-hero">
                    <h1 class="page-title">${escapeHtml(team.name)} Analytics</h1>
                    <p class="page-subtitle">Cross-board insights and statistics</p>
                </div>

                <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- Total Boards -->
                    <div class="card stat-card" style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; font-weight: bold; color: var(--primary);">${stats.total_boards}</div>
                        <div style="font-size: 1rem; color: var(--text-secondary);">Total Boards</div>
                    </div>

                    <!-- Active Boards -->
                    <div class="card stat-card" style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; font-weight: bold; color: var(--success);">${stats.active_boards}</div>
                        <div style="font-size: 1rem; color: var(--text-secondary);">Active Boards</div>
                    </div>

                    <!-- Total Participants -->
                    <div class="card stat-card" style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; font-weight: bold; color: var(--info);">${stats.total_participants}</div>
                        <div style="font-size: 1rem; color: var(--text-secondary);">Total Participants</div>
                    </div>

                    <!-- Action Items -->
                    <div class="card stat-card" style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; font-weight: bold; color: var(--warning);">${stats.total_action_items}</div>
                        <div style="font-size: 1rem; color: var(--text-secondary);">Action Items Created</div>
                    </div>
                </div>

                <!-- Charts Placeholders -->
                <div class="card">
                    <h3>Activity Over Time (Coming Soon)</h3>
                    <div style="height: 200px; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-top: 1rem;">
                        <span class="text-secondary">Chart visualization will appear here in future updates.</span>
                    </div>
                </div>
            </div>
        `;
    }
}

export const teamAnalyticsController = new TeamAnalyticsController();

// Global binding
window.openTeamAnalytics = (id) => teamAnalyticsController.showAnalytics(id);
