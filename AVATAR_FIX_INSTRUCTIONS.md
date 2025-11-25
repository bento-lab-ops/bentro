# Avatar Display Fix - Manual Instructions

## Problem
Emojis hardcoded in main.js are corrupted due to UTF-8 encoding issues.
The avatars from avatars.js work perfectly (e.g., 🐯).

## Solution
Replace hardcoded emojis with calls to `getUserAvatar()` function.

## Files to Edit

### 1. web/js/main.js

#### Change 1: Line ~35 - showReturningUserModal function
**Find:**
```javascript
function showReturningUserModal(username) {
    document.getElementById('returningUserName').textContent = username;
    document.getElementById('returningUserModal').style.display = 'block';
}
```

**Replace with:**
```javascript
function showReturningUserModal(username) {
    const avatar = getUserAvatar();
    document.getElementById('returningUserName').textContent = `${avatar} ${username}`;
    document.getElementById('returningUserModal').style.display = 'block';
}
```

#### Change 2: Line ~54 - updateUserDisplay function  
**Find:**
```javascript
function updateUserDisplay() {
    document.getElementById('userDisplay').textContent = `👤 ${window.currentUser}`;
    document.getElementById('editUserBtn').style.display = 'inline-block';
}
```

**Replace with:**
```javascript
function updateUserDisplay() {
    const avatar = window.currentUserAvatar || getUserAvatar();
    document.getElementById('userDisplay').textContent = `${avatar} ${window.currentUser}`;
    document.getElementById('editUserBtn').style.display = 'inline-block';
}
```

#### Change 3: Line ~47 - openEditUserModal function
**Find:**
```javascript
function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = window.currentUser || '';
    modal.style.display = 'block';
    document.getElementById('userNameInput').focus();
}
```

**Replace with:**
```javascript
function openEditUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userNameInput').value = window.currentUser || '';
    
    // Repopulate avatar selector with current selection
    populateAvatarSelector();
    
    modal.style.display = 'block';
    document.getElementById('userNameInput').focus();
}
```

#### Change 4: userForm submit handler (around line 130)
**Find:**
```javascript
document.getElementById('userForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('userNameInput').value.trim();
    if (name) {
        window.currentUser = name;
        localStorage.setItem('retroUser', name);
        document.getElementById('userModal').style.display = 'none';
        updateUserDisplay();
        showDashboard();
    }
});
```

**Replace with:**
```javascript
document.getElementById('userForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('userNameInput').value.trim();
    const avatar = document.getElementById('selectedAvatar').value;
    
    if (name) {
        window.currentUser = name;
        window.currentUserAvatar = avatar;
        localStorage.setItem('retroUser', name);
        localStorage.setItem('retroUserAvatar', avatar);
        document.getElementById('userModal').style.display = 'none';
        updateUserDisplay();
        showDashboard();
    }
});
```

#### Change 5: confirmReturningUser function (around line 40)
**Find:**
```javascript
function confirmReturningUser() {
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    document.getElementById('editUserBtn').style.display = 'inline-block';
    showDashboard();
}
```

**Replace with:**
```javascript
function confirmReturningUser() {
    // Ensure avatar is loaded from localStorage
    window.currentUserAvatar = getUserAvatar();
    
    document.getElementById('returningUserModal').style.display = 'none';
    updateUserDisplay();
    document.getElementById('editUserBtn').style.display = 'inline-block';
    showDashboard();
}
```

## After Making Changes

1. Save the file
2. Run: `git add -A && git commit -m "Fix avatar display in header and modals"`
3. Build: `nerdctl build -t dnlouko/bentro-app:v0.2.14 .`
4. Push: `nerdctl push dnlouko/bentro-app:v0.2.14`
5. Deploy: `kubectl set image deployment/bentro-app bentro-app=dnlouko/bentro-app:v0.2.14 -n bentro`
6. Wait: `kubectl rollout status deployment/bentro-app -n bentro`

## Expected Result
- ✅ Avatar appears in header (e.g., 🐯 Batmal)
- ✅ Avatar appears in welcome modal (e.g., 🐯 Batmal)
- ✅ Avatar selector repopulates when editing user
- ✅ No encoding errors in console
