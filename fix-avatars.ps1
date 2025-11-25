# Fix Avatar Display - PowerShell Script
# This script safely applies avatar fixes to main.js

$file = "web/js/main.js"
$content = Get-Content $file -Raw -Encoding UTF8

Write-Host "Applying avatar fixes to main.js..." -ForegroundColor Cyan

# Fix 1: showReturningUserModal - Add avatar
$content = $content -replace `
    'function showReturningUserModal\(username\) \{\r?\n\s+document\.getElementById\(''returningUserName''\)\.textContent = username;\r?\n\s+document\.getElementById\(''returningUserModal''\)\.style\.display = ''block'';\r?\n\}', `
    "function showReturningUserModal(username) {`r`n    const avatar = getUserAvatar();`r`n    document.getElementById('returningUserName').textContent = ``${avatar} ${username}``;`r`n    document.getElementById('returningUserModal').style.display = 'block';`r`n}"

# Fix 2: updateUserDisplay - Use avatar from localStorage
$content = $content -replace `
    'function updateUserDisplay\(\) \{\r?\n\s+document\.getElementById\(''userDisplay''\)\.textContent = `[^`]+\$\{window\.currentUser\}`;?\r?\n\s+document\.getElementById\(''editUserBtn''\)\.style\.display = ''inline-block'';\r?\n\}', `
    "function updateUserDisplay() {`r`n    const avatar = window.currentUserAvatar || getUserAvatar();`r`n    document.getElementById('userDisplay').textContent = ``${avatar} ${window.currentUser}``;`r`n    document.getElementById('editUserBtn').style.display = 'inline-block';`r`n}"

# Fix 3: openEditUserModal - Repopulate avatar selector
$content = $content -replace `
    'function openEditUserModal\(\) \{\r?\n\s+const modal = document\.getElementById\(''userModal''\);\r?\n\s+document\.getElementById\(''userNameInput''\)\.value = window\.currentUser \|\| '''';\r?\n\s+modal\.style\.display = ''block'';\r?\n\s+document\.getElementById\(''userNameInput''\)\.focus\(\);\r?\n\}', `
    "function openEditUserModal() {`r`n    const modal = document.getElementById('userModal');`r`n    document.getElementById('userNameInput').value = window.currentUser || '';`r`n    `r`n    // Repopulate avatar selector with current selection`r`n    populateAvatarSelector();`r`n    `r`n    modal.style.display = 'block';`r`n    document.getElementById('userNameInput').focus();`r`n}"

# Fix 4: confirmReturningUser - Load avatar from localStorage
$content = $content -replace `
    'function confirmReturningUser\(\) \{\r?\n\s+document\.getElementById\(''returningUserModal''\)\.style\.display = ''none'';\r?\n\s+updateUserDisplay\(\);\r?\n\s+document\.getElementById\(''editUserBtn''\)\.style\.display = ''inline-block'';\r?\n\s+showDashboard\(\);\r?\n\}', `
    "function confirmReturningUser() {`r`n    // Ensure avatar is loaded from localStorage`r`n    window.currentUserAvatar = getUserAvatar();`r`n    `r`n    document.getElementById('returningUserModal').style.display = 'none';`r`n    updateUserDisplay();`r`n    document.getElementById('editUserBtn').style.display = 'inline-block';`r`n    showDashboard();`r`n}"

# Save the file
$content | Set-Content $file -Encoding UTF8 -NoNewline

Write-Host "✅ Avatar fixes applied successfully!" -ForegroundColor Green
Write-Host "Please review web/js/main.js to verify changes." -ForegroundColor Yellow
