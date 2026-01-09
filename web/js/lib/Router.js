export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.bgGreen = "background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;";

        // Bind navigation event
        window.addEventListener('hashchange', this.handleRoute.bind(this));
        window.addEventListener('load', this.handleRoute.bind(this));
    }

    /**
     * Register a route handler
     * @param {string} route - Route path (e.g., 'dashboard', 'board/:id')
     * @param {Function} handler - Callback function
     */
    on(route, handler) {
        this.routes[route] = handler;
    }

    /**
     * Navigate to a route programmatically
     * @param {string} path - Hash path (e.g., 'dashboard')
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Handle routing logic
     */
    async handleRoute() {
        let hash = window.location.hash.slice(1) || 'dashboard';

        // Remove query parameters from hash matching
        if (hash.includes('?')) {
            hash = hash.split('?')[0];
        }

        console.log(`%c🛣️ Route: #${hash}`, this.bgGreen);

        // Simple exact match first
        if (this.routes[hash]) {
            this.currentRoute = hash;
            await this.routes[hash]();
            return;
        }

        // Pattern matching (e.g., board/:id)
        for (const [pattern, handler] of Object.entries(this.routes)) {
            if (pattern.includes(':')) {
                const regex = new RegExp('^' + pattern.replace(/:[^\s/]+/, '([^/]+)') + '$');
                const match = hash.match(regex);
                if (match) {
                    this.currentRoute = pattern;
                    const param = match[1]; // Captured ID
                    await handler(param);
                    return;
                }
            }
        }

        // Default to dashboard if no match
        if (hash !== 'dashboard' && this.routes['dashboard']) {
            console.warn(`Route #${hash} not found, redirecting to dashboard.`);
            this.navigate('dashboard');
        }
    }
}

// Export singleton
export const router = new Router();
