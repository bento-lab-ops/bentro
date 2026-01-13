# BenTro Roadmap 🗺️

## Current Version: **v0.13.0-rc9**

---

## 🎯 Immediate Priorities

### v0.14.0 - Visual Overhaul (Design System)
**Focus:** Aesthetics, Glassmorphism everywhere, and Premium feel.
- [ ] **Header Redesign**:
    - [ ] Make Main Header Glassmorphic.
    - [ ] Update Header Buttons (New Board, Dashboard, Menu) to Glassmorphic style.
    - [ ] Update User Avatar and Language Selector to match.
- [ ] **Navigation Redesign**:
    - [ ] Hamburger Menu Transparency & Blur.
    - [ ] Menu Items hover effects.
- [ ] **Dashboard Polish**:
    - [ ] Check "My Retrospectives" title contrast (Fixed in v0.13.0).
    - [ ] Verify Board Status Badges (Fixed in v0.13.0).

### v0.13.4 - UI Polish & UX Enhancements (Current)
- **Glassmorphism**: Standardized header buttons, language dropdown, and sidebar menu.
- **Date Picker**: Integrated Flatpickr for a modern, themed date selection experience.
- **Micro-interactions**: Improved various button alignments and hover states.
- **Cleanup**: Removed deprecated admin password input from settings.

### v0.14.0 - Performance & Optimization (Planned)
& Light Theme (Completed)
**Focus:** Fixing Regressions, recovering from crashes, and basic Light Theme readability.
- [x] **Light Theme Fixes**:
    - [x] "My Retrospectives" Title Visibility (Gradient fixed).
    - [x] Dashboard Badges Contrast (Solid Colors).
- [x] **Critical Crash Fix**:
    - [x] Restored corrupted `index.html` (v0.13.0-rc9).
    - [x] Fixed `BoardController` event binding memory leak/loop (v0.13.0-rc5).
- [x] **Functional Regressions**:
    - [x] Restored missing `init`, `bindWebSocketEvents` methods.
    - [x] Fixed Drag and Drop selectors (`.retro-card`).
    - [x] **Hamburger Menu & Overlay**: Fixed unresponsive menu, auto-close, and overlay click (v0.13.0-rc21).
- [x] **Deployment**:
    - [x] Version Bump to `v0.13.0`.

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
- [ ] **Guest UX**: Improve experience for unauthenticated/guest users accessing boards/teams.
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
