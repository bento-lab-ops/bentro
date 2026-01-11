# BenTro Roadmap 🗺️

## Current Version: **v0.12.0-rc43**

---

## 🎯 Immediate Priorities

### v0.11.x - Stability & Guardrails (Current Focus)
**Focus:** Reliability, Automated Testing, and DevEx.
- [x] **UI Polish: Claim/Relinquish Host Button** (Completed v0.10.64)
    - [x] **Style**: Apply Glassmorphic design (`.btn-glass`).
    - [x] **Layout**: Relocate to Control Bar (alongside other actions).
    - [x] **Testing**: Add E2E tests for Claim/Relinquish flow & button visibility.
    - [x] **Fix**: Verify/Add `confirm.unclaim_board` translation key.
- [ ] **Code Architecture Improvements** (from Critical Analysis v0.10.64):
    - [x] **Refactor to Component/Module Pattern**: Break `main.js` into feature modules (`DashboardController`, `NavController`, `Router`, `BoardService`) to reduce coupling
    - [ ] **Visual Regression Testing**: Add assertions for key element visibility (`#newBoardBtn`, `#dashboardGrid`) in E2E tests
- [ ] **CI/CD Guardrails**:
    - [ ] **Docker Lint**: Implement `docker build --check` or `hadolint` to catch Dockerfile errors.
    - [ ] **Frontend Lint/Test**: Add `eslint` and smoke tests to build process.
    - [ ] **Backend Lint**: Add `golangci-lint` to catch Go errors before compile.
    - [ ] **Pre-commit Hooks**: Implement hooks for syntax validation, linting, and preventing bad commits
    - [ ] **E2E Test Selector Validation**: Add CSS selector validation to CI/CD pipeline
- [ ] **Documentation**:
    - [ ] **ES Module Migration Guide**: Document learnings from v0.10.65-v0.10.77 migration
    - [ ] **E2E Test Maintenance**: Document CSS selectors in test comments for maintainability
- [ ] **Dockerfile Security Hardening** (Production):
    - [ ] Add non-root user for runtime security
    - [ ] Implement build cache mounts (`--mount=type=cache`) for faster builds
    - [ ] Add security scanning (e.g., `trivy` or `grype`)
    - [ ] Minimize final image size (multi-stage optimization)
- [ ] **Feature Flags**: Decouple "Hide Vote" and other experimental features.
- [ ] **Automated Audit**: Browser-based regression testing checklist.
    - [x] Initial Playwright Setup (`tests/e2e`).
    - [x] Run Playwright Audit Locally (via `run_tests.ps1` in Docker).
    - [x] **Finish Retro Validation**: Automated check for board completion flow.
- [ ] **Automated E2E Tests**: Run Playwright tests in CI.

### v0.10.x - Field Testing & Refinement
**Focus:** Stability, UX Polish, and Real-world usage.
- [ ] **Peek Mode**: Allow users to view a board as read-only before joining ("Peek" button).
- [ ] **Data Export**: Export board data to CSV/PDF (Backend implementation).
- [x] Team-filtered Dashboard (Backend)
- [x] Team-filtered Dashboard (Frontend)
- [x] Fix: Board Participants List (Persistent)
### 🚨 Recovery Phase (Current Focus)
**Context:** Reverted to `v0.11.0` after failed `v0.12.5` deployment (Reference: `POST_MORTEM_v0.12.5.md`).
**Goal:** Establish safety nets before re-attempting major refactors.

- [ ] **Guardrails Implementation**:
    - [ ] **Local Smoke Test Script**: Create `scripts/verify_local.sh` to check build, lint, and basic runtime BEFORE push.
    - [ ] **Pre-commit Hook**: Enforce linting and smoke test on commit.
    - [ ] **Strict Mode**: Enable strict JSON validation tests for Auth payloads.
- [ ] **Re-Verify v0.11.0**:
    - [ ] Ensure current `v0.11.0` deployment is stable.

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
