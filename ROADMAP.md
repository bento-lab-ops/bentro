# BenTro Roadmap 🗺️

## Current Version: v0.10.38

---

## 🎯 Immediate Priorities

### v0.10.39 - Bug Fixes & Stability
**Effort:** S (1-2 days)
- [ ] **Dashboard Participant Count** - Fix erratic participant count display and random disappearance on Board Cards.
- [ ] **Team Member Count** - Fix incorrect member count display on Team Cards.

### v0.10.x - Team Management & Advanced Collaboration
**Effort:** M (1-2 weeks)
- [ ] **Team-filtered Dashboard** - Filter boards by team.
- [ ] **Advanced Action Items Filtering** - Filter by Period, Team/Board, or Owner.

### v1.0.0 - Integrations & Release Candidate
**Effort:** XL (1-2 weeks)
- [ ] **Jira Integration** - Create Jira tickets from action items.
- [ ] **Slack Notifications** - Send retro summaries to Slack channels.
- [ ] **Calendar Integration** - Schedule recurring retrospectives.

---

## ✅ Completed Features

### v0.10.0 - v0.10.38 (Teams & Participation)
- [x] **Board Participation Persistence** - Users can permanently join/leave boards, preserving history.
- [x] **Dashboard UI Overhaul** - Improved card layout with metadata (Participants, Team, Owner).
- [x] **Team Management** - Create teams, join teams (Invite Only), and assign boards to teams.
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
