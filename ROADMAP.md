# BenTro Roadmap 🗺️

## Current Version: v0.9.14

---

## 🎯 Immediate Priorities

### v0.9.2 - v0.9.3 Admin User Management & Improvements (COMPLETED)
**Effort:** M (1-2 days)
- [x] **Admin Users Management Modal** - Frontend interface to list, manage roles, reset passwords, and delete users.
- [x] **User Role Toggle** - UI to change user roles between 'user' and 'admin'.
- [x] **Password Reset UI** - Button to reset user passwords to default "bentro".
- [x] **Delete User UI** - Ability to delete users with incorrect emails.
- [x] **Unified Authentication** - Support for both JWT Admin Role and K8s Secret.
- [x] **Admin Auto-Creation** - Automatic creation of default admin user.

### v0.10.39 - Bug Fixes & Stability
**Effort:** S (1-2 days)
- [ ] **Dashboard Participant Count** - Fix erratic participant count display and random disappearance on Board Cards.
- [ ] **Team Member Count** - Fix incorrect member count display on Team Cards.

### v0.10.0 - Team Management & Advanced Features
**Effort:** XL (2-3 weeks)
- [ ] **Team/Squad Management** - Allow multiple teams to use the app simultaneously.
- [ ] **Team-filtered Dashboard** - Filter boards by team.
- [ ] **Advanced Action Items Filtering** - Filter by Period, Team/Board, or Owner.

### v1.0.0 - Integrations & Release Candidate
**Effort:** XL (1-2 weeks)
- [ ] **Jira Integration** - Create Jira tickets from action items.
- [ ] **Slack Notifications** - Send retro summaries to Slack channels.
- [ ] **Calendar Integration** - Schedule recurring retrospectives.

---

### Phase 2: Advanced Collaboration (v1.1.0+)
**Effort:** L (3-5 days)
- [ ] **Real-time Cursor Tracking** - See where other users are clicking/typing.
- [ ] **Card Comments** - Add threaded comments to cards for discussion.
- [ ] **Retrospective Analytics** - Track trends across multiple retros.

---

## ✅ Completed Features

### v0.9.1 - v0.9.14 (Admin & UI Polish)
- [x] **Admin Visual Upgrade** - Premium Hero-style headers and clean layout for Admin Dashboard.
- [x] **Universal Visuals** - Consistent Hero styling across Main Dashboard (`.page-controls`) and Action Items.
- [x] **Action Item Statuses** - Green (Open), Yellow (Overdue), Red (Closed) indicators.
- [x] **Navigation Fixes** - Fixed Z-index overlap between Admin and Action Items views.
- [x] **Admin Action Edit** - Added Link and Description fields for manual item completion in Admin.
- [x] **i18n Polish** - Fixed missing translation keys for page titles and subtitles.

### v0.9.1 (Stable Base)
- [x] **User Profile Modal** - View profile with Display Name, Full Name, Email (read-only), and logout option.
- [x] **Change Password** - Secure password change functionality.
- [x] **Forced Password Change** - Users with default password "bentro" must change it on login (except admins).
- [x] **Admin User Management Backend** - Complete API for managing users (list, change roles, reset passwords, delete).
- [x] **15-Day Session Persistence** - JWT tokens now last 15 days for better UX.
- [x] **Seamless Authentication** - No "Welcome Back" modal, direct to dashboard when authenticated.

### v0.9.0
- [x] **Native Email/Password Authentication** - Secure login with bcrypt password hashing.
- [x] **User Registration** - New user registration with First Name, Last Name, Display Name, Email, and Password.
- [x] **Persistent Sessions** - JWT-based authentication with secure httpOnly cookies.
- [x] **User Traceability** - All actions linked to authenticated user records.

### v0.8.0 - v0.8.9
- [x] **Admin Dashboard** - Secure page with system statistics and board management.
- [x] **Vote Limiting** - Configurable limit on votes per user per board.
- [x] **Blind Voting** - Hide votes until voting phase ends.
- [x] **Role-Based Access Control (RBAC)** - Board managers control timer, phases, and finish.
- [x] **Dual Manager Support** - Two managers (Owner + Co-Host) per board.
- [x] **Manager Badges** - Visual indicators (👑/🛡️) for board managers.

### v0.7.0
- [x] **Soft Delete for Action Items** - Backend and Frontend support to preserve items from deleted boards.
- [x] **Safe Delete** - Prevent deleting active boards to avoid accidental data loss.

### v0.6.17
- [x] **Fix** - Fixed navigation to Dashboard and Action Items not updating URL hash.
- [x] **Fix** - Page refresh on Action Items/Admin view now persists correctly.

### v0.6.10 - v0.6.15
- [x] **Internationalization (i18n)** - Added complete Portuguese (pt-BR) support.
- [x] **New Retro Modal** - Translated and polished UI.
- [x] **Board Templates** - Templates and columns now dynamically translated.

### v0.3.1 - v0.6.9
- [x] **Action Items** - Track tasks with owners and due dates.
- [x] **HTTPS Support** - Fixed Username Prompt disappearing on HTTPS (wss://).
- [x] **Data Persistence** - PostgreSQL fixes for local-path-provisioner.
- [x] **Card Reactions** - Emoji reactions on cards.
- [x] **Keyboard Shortcuts** - Global shortcuts added.
- [x] **Dark/Light Theme** - Theme toggle implemented.

### v0.2.x Series
- [x] **Active Participants Display** - Real-time list of users.
- [x] **Avatar Selection** - Emoji avatars for users.
- [x] **Read-Only Mode** - For finished boards.
- [x] **Timer Sound** - Audio notifications.
- [x] **Leaving Boards** - Ability to leave a retrospective.

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
