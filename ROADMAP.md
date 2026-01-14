# BenTro Roadmap 🗺️

## Current Version: **v0.15.1**

---

## 🎯 Immediate Priorities

### v0.16.0 - Feature Expansion (Planned)
**Focus:** New interactive features and integrations.
- [ ] **Real-time Cursors**: See other users' cursors on the board.
- [ ] **Sound Effects**: Optional sounds for timer, voting, and reactions.
- [ ] **Sorting & Filtering**: Advanced sorting options for cards.

### v0.15.1 - Regression Fixes (Completed)
**Focus:** Fix regressions introduced by Refactoring (v0.15.0).
- [x] **Modal Fixes**: Restored `loadModals()` call in `main.js`.
- [x] **Action Item Modal**: Restored missing "Due Date" and buttons layout.
- [x] **Board Controller**: Updated to use `ActionItemsController`.
- [x] **Admin UI**: Replaced native `alert`/`confirm` with Glassmorphic Modals.
- [x] **Accessibility**: Added `autocomplete` attributes and hidden username fields to fix console warnings.

### v0.15.0 - Architecture Refactoring (Completed)
**Focus:** Separation of concerns, code cleanup, and stability.
- [x] **Refactor to DashboardController**: Centralized template and filter logic.
- [x] **Refactor to NavController**: Centralized routing logic.
- [x] **Refactor to TeamsController**: Centralize teams management logic (removed `teams.js`).
- [x] **Refactor to UserController**: Centralize user/profile logic (removed remnants from `main.js`).
- [x] **Refactor to AdminController**: Centralize admin logic (removed `admin.js`).
- [x] **Refactor to ActionItemsController**: Centralize action items logic (removed `action_items.js`).
- [x] **i18n**: Fixed missing translations in Templates and Help Modal.

### v0.14.x - Polish, Fixes & Guest UX (Completed)
**Focus:** Guest experience, bug fixes, and CI/CD stability.
- [x] **v0.14.5 (Polish)**:
    - [x] Added missing `admin.stat_total_teams` translation.
- [x] **v0.14.4 (Bug Fixes)**:
    - [x] Fixed `i18n.translatePage` regression in `admin-users.js`.
    - [x] Fixed CI/CD SonarQube `projectKey` error.
- [x] **v0.14.3 (Guest UX)**:
    - [x] **Board Access**: Redirect unauthenticated users to Login, then back to Board.
    - [x] **Teams Access**: Show "Login Required" state instead of breaking.
- [x] **v0.14.2 (Visuals)**:
    - [x] Board Members Avatars display.
    - [x] Google Login button removal.

### v0.14.1 - Critical Bug Fixes (Completed)
**Focus:** Registration flow and Team permissions.
- [x] **Registration**: Split Name/Surname, Avatar Selection, Password Validation.
- [x] **Teams**: Allow Owners to add members.
- [x] **Search**: Fix Case-insensitive user search (SQLite/Postgres compatibility).

### v0.14.0 - Performance & Optimization (Completed)
**Focus:** Code cleanup, performance tuning, and removing technical debt.
- [x] **Code Cleanup**: Removed legacy comments and backup files.
- [x] **Performance**: Optimized Drag & Drop and Event Listeners.
- [x] **UI Fixes**: Modal scrollbars and layouts.
- [ ] **Architecture**:
    - [ ] Ensure `Nav`, `Dashboard`, and `Board` controllers have clear separation of concerns (Ongoing).

### v0.13.3 - Teams UX & Polish (Completed)
**Focus:** Fix regressions in Teams view and standardize modals.
- [x] **My Teams Tab**:
    - [x] Fix `ReferenceError: confirmLeaveTeam is not defined` (Local/Env mismatch?).
    - [x] Replace native `confirm()` in "Leave Team" (View Details) with glassmorphic modal.
    - [x] Fix "Leave Team" button triggering error.
- [x] **Explore Teams Tab**:
    - [x] Fix missing Team Card outline/style (CSS/Class issue).
    - [x] Replace native `confirm()` in "Join Team" with glassmorphic modal.
    - [x] Fix Team Participant Counter not working.

### v0.13.2 - UX Improvements & Modal Standardization (In Progress)
**Focus:** Replace native alerts with glassmorphic modals and fix UI bugs.
- [x] **Modal Standardization**:
    - [x] Implementation of Generic Confirmation Modal.
    - [x] Replace `confirm()` in "Finish Retro".
    - [x] Replace `confirm()` in "Leave Board" (Backend + UI Fixed).
    - [x] Replace `alert()` in "Vote Limit".
    - [x] Replace `confirm()` in "Delete Column".
    - [x] Replace `confirm()` in "Delete Card".
- [x] **Bug Fixes**:
    - [x] Fix "Manage Teams" modal close button visibility.

### v0.13.1 - User Experience Improvements (Completed)
**Focus:** Card Drag & Drop responsiveness and fluidity.
- [x] **Card Movement**:
    - [x] Improve Drag & Drop responsiveness (Mobile/Desktop).
    - [x] Refactor SortableJS implementation.

### v0.12.0 - Modular Architecture & Refactor (Completed)
**Focus:** Decoupling `board.js`, Fix Runtime Errors, and Stability.
- [x] **Refactor to Component/Module Pattern**: Split `board.js` into `BoardController`, `BoardView`, and `BoardService`.
- [x] **Runtime Stability**: Fixed `main.js` duplicate declarations and `ReferenceError`s.
- [x] **F5 Dashboard Bug**: Fixed Router initialization to handle page refreshes correctly.
- [x] **Deployment**: Verified successful build and rollout (v0.12.0-rc29).

### v0.12.x - Polish & Security (Next Steps)
**Focus:** User Experience gaps and Backend Security integrity.
- [x] **Guest UX**: Improve experience for unauthenticated/guest users accessing boards/teams.
- [x] **Voting Phase Verification**: Ensure Backend strictly rejects votes outside the 'voting' phase (Security/Integrity).
- [ ] **Cleanup**: Remove any remaining legacy comments or unused files.

### v0.11.x - Stability & Guardrails (Completed)
- [x] **UI Restoration**: Restored missing script tags (`main.js`, `teams.js`) and fixed initialization logic.
- [x] **Global Scope Fix**: Resolved `APP_VERSION` ReferenceError in `config.js`.
- [x] **Claim/Relinquish Host UI**: Glassmorphic buttons, improved logic, and tests.

### v0.10.58 - Claim/Relinquish UI Polish
- [x] **Finish Retro Fixed**: Backend 404 resolved and deployed.
- [x] **Build Restoration**: Docker ARM64 build pipeline stabilized.
- [x] **E2E Stabilization**: Fix flaky tests, modal handling, and template selection.
- [x] **Claim/Relinquish UI**: Glassmorphic buttons, improved logic, and tests.

### v0.11.0 - Modular Architecture (Phase 3)
- [x] **Modular Controllers** - Split monolithic logic into `DashboardController` and `NavController`.
- [x] **Router Implementation** - Hash-based client-side routing.
- [x] **Service Layer** - Decoupled API calls (`BoardService`).
- [x] **Stability Fixes** - Resolved cyclic dependencies and legacy global scope issues.

### v0.11.0 - Participant Metadata & Stability checks.
- [x] **Multiple Team Owners** - Support for multiple owners per team.
- [x] **Concurrent Participation Fixes** - Locking mechanisms to prevent race conditions on Join.

### v0.9.x (Admin & User Management)
- [x] **Admin Dashboard** - Premium Hero-style headers and clean layout.
- [x] **User Management** - List, manage roles, reset passwords, delete users.
- [x] **Unified Authentication** - Support for both JWT Admin Role and K8s Secret.
- [x] **Action Item Statuses** - Green (Open), Yellow (Overdue), Red (Closed).

### v0.9.0 (Authentication Base)
- [x] **Native Email/Password Authentication** - Secure login with bcrypt.
- [x] **User Registration** - Full registration flow.
- [x] **Persistent Sessions** - 15-day JWT tokens.

### v0.8.x (Board Controls)
- [x] **Vote Limiting & Blind Voting**
- [x] **Role-Based Access Control (RBAC)**
- [x] **Dual Manager Support**

### v0.7.x (Data Safety)
- [x] **Soft Delete for Action Items**
- [x] **Safe Delete Protection**

### v0.6.x (Internationalization)
- [x] **i18n Support** - Portuguese (pt-BR) and English.
- [x] **Dynamic Board Templates**

### v0.2.x - v0.5.x (Foundation)
- [x] **Real-time WebSockets** - Live updates for boards.
- [x] **Action Items** - Task tracking.
- [x] **Themes** - Dark/Light mode.

---

## 📊 Priority Legend

🔴 **Critical** - Blocks users or causes major issues  
🟡 **High** - Important for user experience  
🟢 **Medium** - Nice to have, improves experience  
🔵 **Low** - Future enhancement

---

## ⏱️ Effort Estimation

- **Small (S)** - 1-2 hours
- **Medium (M)** - 3-8 hours  
- **Large (L)** - 1-3 days
- **Extra Large (XL)** - 1+ weeks
