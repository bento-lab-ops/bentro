import sys
import re

# Read the file
with open('web/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Change 1: showReturningUserModal
content = re.sub(
    r'function showReturningUserModal\(username\) \{\s*document\.getElementById\(\'returningUserName\'\)\.textContent = username;\s*document\.getElementById\(\'returningUserModal\'\)\.style\.display = \'block\';\s*\}',
    '''function showReturningUserModal(username) {
    const avatar = getUserAvatar();
    document.getElementById('returningUserName').textContent = `${avatar} ${username}`;
    document.getElementById('returningUserModal').style.display = 'block';
}''',
    content,
    flags=re.DOTALL
)

# Change 2: updateUserDisplay  
content = re.sub(
    r'function updateUserDisplay\(\) \{\s*document\.getElementById\(\'userDisplay\'\)\.textContent = `[^`]+\$\{window\.currentUser\}`;\s*document\.getElementById\(\'editUserBtn\'\)\.style\.display = \'inline-block\';\s*\}',
    '''function updateUserDisplay() {
    const avatar = window.currentUserAvatar || getUserAvatar();
    document.getElementById('userDisplay').textContent = `${avatar} ${window.currentUser}`;
    document.getElementById('editUserBtn').style.display = 'inline-block';
}''',
    content,
    flags=re.DOTALL
)

# Change 3: openEditUserModal
content = re.sub(
    r'function openEditUserModal\(\) \{\s*const modal = document\.getElementById\(\'userModal\'\);\s*document\.getElementById\(\'userNameInput\'\)\.value = window\.currentUser \|\| \'\';\s*modal\.style\.display = \'block\';\s*document\.getElementById\(\'userNameInput\'\)\.focus\(\);\s*\}',
    '''function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = window.currentUser || '';
    
    // Repopulate avatar selector with current selection
    populateAvatarSelector();
    
    modal.style.display = 'block';
    document.getElementById('userNameInput').focus();
}''',
    content,
    flags=re.DOTALL
)

# Change 4: confirmReturningUser
content = re.sub(
    r'function confirmReturningUser\(\) \{\s*document\.getElementById\(\'returningUserModal\'\)\.style\.display = \'none\';\s*updateUserDisplay\(\);\s*document\.getElementById\(\'editUserBtn\'\)\.style\.display = \'inline-block\';\s*showDashboard\(\);\s*\}',
    '''function confirmReturningUser() {
    // Ensure avatar is loaded from localStorage
    window.currentUserAvatar = getUserAvatar();
    
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    document.getElementById('editUserBtn').style.display = 'inline-block';
    showDashboard();
}''',
    content,
    flags=re.DOTALL
)

# Change 5: userForm submit handler
content = re.sub(
    r"document\.getElementById\('userForm'\)\?\.addEventListener\('submit', \(e\) => \{\s*e\.preventDefault\(\);\s*const name = document\.getElementById\('userNameInput'\)\.value\.trim\(\);\s*if \(name\) \{\s*window\.currentUser = name;\s*localStorage\.setItem\('retroUser', name\);\s*(?:\/\/ closeModals\(\); \/\/ Modals are managed by display property now\s*)?document\.getElementById\('userModal'\)\.style\.display = 'none';\s*updateUserDisplay\(\);\s*showDashboard\(\);\s*\}\s*\}\);",
    '''document.getElementById('userForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userNameInput').value.trim();
        const avatar = document.getElementById('selectedAvatar').value;
        
        if (name) {
            window.currentUser = name;
            window.currentUserAvatar = avatar;
            localStorage.setItem('retroUser', name);
            localStorage.setItem('retroUserAvatar', avatar);
            // closeModals(); // Modals are managed by display property now
            document.getElementById('userModal').style.display = 'none';
            updateUserDisplay();
            showDashboard();
        }
    });''',
    content,
    flags=re.DOTALL
)

# Write the file
with open('web/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Avatar fixes applied successfully!")
