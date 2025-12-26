# BenTro Roadmap 🗺️

## Current Version: v0.7.0

---

## 🎯 Immediate Priorities (v0.8.0)

### 🛡️ Admin, Security & Improved Tracking
**Effort:** M (3-4 days)
- [ ] **Admin Dashboard** - Secure page to manage app settings and view global data.
- [ ] **Vote Limiting** - Configurable limit on votes per user.
- [ ] **Blind Voting** - Hide votes until voting phase ends.
- [ ] **K8s Secret Auth** - Admin access secured by Kubernetes Secret.
- [ ] **Role-Based Controls (RBAC)** - Restrict Start/Stop Timer, Phase Switching, and Finish Retro to Board Managers only.
- [ ] **Export Restrictions** - Restrict "Export CSV" to only be available for Finished boards.

### v0.9.0 - Multi-Team Support Phase 1
**Effort:** XL (1-2 weeks)
- [ ] **Advanced Action Items Filtering** - Filter by Period, Team/Board, or Owner.
- [ ] **Team/Squad management** - Allow multiple teams to use the app simultaneously.
- [ ] **Team-filtered dashboard** - Filter boards by team.
- [ ] **User roles** - Admin, facilitator, participant roles.

### v1.0.0 - Integrations & Release Candidate
**Effort:** XL (1-2 weeks)
- [ ] **Jira integration** - Create Jira tickets from action items.
- [ ] **Slack notifications** - Send retro summaries to Slack channels.
- [ ] **Calendar integration** - Schedule recurring retrospectives.

---

### Phase 2: Advanced Collaboration (v1.1.0+)
**Effort:** L (3-5 days)
- [ ] **Real-time cursor tracking** - See where other users are clicking/typing.
- [ ] **Card comments** - Add threaded comments to cards for discussion.
- [ ] **Retrospective analytics** - Track trends across multiple retros.

---

## ✅ Completed Features

### v0.7.0 (Latest)
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
