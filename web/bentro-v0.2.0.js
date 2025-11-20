// BenTro v0.2.0 JavaScript Additions
// Add this to the end of app.js

// Returning User Modal Functions
function showReturningUserModal(username) {
    document.getElementById('returningUserName').textContent = username;
    document.getElementById('returningUserModal').style.display = 'block';
}

function confirmReturningUser() {
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    document.getElementById('editUserBtn').style.display = 'inline-block';
    showDashboard();
}

function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = currentUser;
    modal.style.display = 'block';
}

// CSV Export Function
async function exportBoardToCSV(boardId) {
    try {
        const board = await apiCall(`/boards/${boardId}`);
        
        const rows = [
            ['Column', 'Card Content', 'Likes', 'Dislikes', 'Merged Cards']
        ];

        board.columns.forEach(column => {
            const cards = column.cards.filter(c => !c.merged_with_id);
            
            cards.forEach(card => {
                const likes = card.votes?.filter(v => v.vote_type === 'like').length || 0;
                const dislikes = card.votes?.filter(v => v.vote_type === 'dislike').length || 0;
                const mergedCount = card.merged_cards?.length || 0;
                
                rows.push([
                    column.name,
                    card.content,
                    likes,
                    dislikes,
                    mergedCount
                ]);
            });
        });

        const csvContent = rows.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"` ).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${board.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export: ' + error.message);
    }
}

// Make new functions global
window.showReturningUserModal = showReturningUserModal;
window.confirmReturningUser = confirmReturningUser;
window.openEditUserModal = openEditUserModal;
window.exportBoardToCSV = exportBoardToCSV;
