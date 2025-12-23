// Admin Dashboard Management

async function loadAdminView() {
    // Check if we have a token
    const token = localStorage.getItem('adminToken');

    // Hide other views
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('boardContainer').style.display = 'none';
    document.getElementById('actionItemsView').style.display = 'none';

    const adminView = document.getElementById('adminView');
    if (!adminView) {
        console.error('Admin view container not found');
        return;
    }
    adminView.style.display = 'block';

    // Update Header
    document.getElementById('dashboardBtn').style.display = 'inline-block';
    document.getElementById('actionItemsBtn').style.display = 'inline-block';

    if (token) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
}

function showAdminLogin() {
    const container = document.getElementById('adminContent');
    container.innerHTML = `
        <div class="admin-login-card">
            <h3>Admin Access</h3>
            <p>Please enter the administrator password to continue.</p>
            <form id="adminLoginForm" onsubmit="handleAdminLogin(event)">
                <input type="password" id="adminPassword" placeholder="Password" class="form-input" required>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
        </div>
    `;
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('adminToken', data.token);
            showAdminDashboard();
        } else {
            alert('Invalid password');
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function showAdminDashboard() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-spinner">Loading admin data...</div>';

    // In a real app we would fetch data here. For now, we'll verify connection by listing boards (public endpoint) 
    // but in future we could have a protected /api/admin/boards endpoint.
    // We'll implemented a Board Settings editor for the active board if one was selected, or a generic list.

    container.innerHTML = `
        <div class="admin-dashboard">
            <div class="admin-header">
                <h3>Admin Dashboard</h3>
                <button onclick="logoutAdmin()" class="btn btn-outline btn-sm">Logout</button>
            </div>
            
            <div class="admin-section">
                <h4>Verified Access</h4>
                <p>You are logged in as Administrator.</p>
                <div class="alert alert-success">Connection Secure</div>
            </div>

            <div class="admin-section">
                <h4>Board Management (Beta)</h4>
                <p>To manage a board's settings (Vote Limits, Phases), navigate to the board as a user, then open the Admin Settings modal.</p>
                <!-- This is a placeholder for global settings -->
            </div>
        </div>
    `;
}

function logoutAdmin() {
    localStorage.removeItem('adminToken');
    showAdminLogin();
}

// Function to open board settings modal (admin only)
function openBoardSettings(boardId) {
    if (!localStorage.getItem('adminToken')) {
        alert('You must be logged in as admin to access these settings.');
        loadAdminView(); // Redirect to login
        return;
    }

    // In a real implementation this would open a modal to set Vote Limit and Phase
    // For MVP v0.5.0 we can just use prompts or a simple custom alert
    const newLimit = prompt("Set Vote Limit per User (0 for unlimited):", "0");
    if (newLimit !== null) {
        updateBoardSettings(boardId, { vote_limit: parseInt(newLimit) });
    }

    // Phase switching is already handled by the UI button, but maybe we want to force it?
}

async function updateBoardSettings(boardId, settings) {
    try {
        const response = await fetch(`/api/admin/boards/${boardId}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') // If we implemented JWT middleware
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            alert('Settings updated');
        } else {
            alert('Failed to update settings');
        }
    } catch (error) {
        console.error(error);
        alert('Error updating settings');
    }
}
