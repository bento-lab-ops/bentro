# BenTro Roadmap 🗺️

## Current Version: v0.2.19

---

## 🎯 Immediate Priorities (v0.2.19)

### 🔴 Critical Infrastructure Fixes

#### ✅ **Username Prompt Missing with HTTPS** (COMPLETED)
**Effort:** 2-4 hours (investigation + fix)  
**Priority:** Critical - Blocks user login with HTTPS

- [x] Investigate browser console errors with HTTPS
- [x] Test localStorage access with self-signed certificate
- [x] Implement fix (localStorage fallback, error handling, or CSP headers)
- [x] Verify username prompt works with HTTPS certificate

> **Issue:** After configuring Ingress for HTTPS with TLS certificate, the username prompt and edit button completely disappeared, preventing users from logging in.
> 
> **Resolution:** Fixed in v0.2.7 by implementing auto-detection of WebSocket protocol (ws:// vs wss://)

---

#### ✅ **PostgreSQL Data Persistence** (COMPLETED)
**Effort:** 30 minutes  
**Priority:** Critical - Data loss on reboot

- [x] Update PersistentVolume path from `/tmp/postgres-data` to `/var/lib/postgres-data`
- [x] Create directory with correct permissions on Raspberry Pi
- [x] Recreate PV and restart PostgreSQL deployment
- [x] Verify data persists after pod restart

> **Issue:** Current configuration uses `/tmp` which is cleared on system reboot, causing data loss after power outages.
> 
> **Resolution:** Fixed by adopting `rancher-local-path-provisioner` for automatic persistent volume provisioning.

---

### ✨ Feature Enhancements (Ordered by Difficulty)

#### 🟢 Small Effort (1-2 hours)
- [x] **Disable edit username button in board view** - Hide/disable edit username button when viewing a board (only show in dashboard) ✅ Completed in v0.2.12
- [x] **Auto-stop timer on finish board** - Automatically stop and reset timer when finishing a retrospective ✅ Completed in v0.2.12
- [x] **Help modal responsiveness** - Make help modal scrollable and responsive with `max-height` and `overflow-y: auto` ✅ Completed in v0.2.13
- [x] **Timer sound notifications** - Play sound when timer ends, with browser notification permission ✅ Completed in v0.2.13
- [x] **Complete read-only mode for finished boards** - Disable all interactive features (merge/unmerge/select/delete/vote/add) except CSV export ✅ Completed in v0.2.13
- [x] **Avatar Selection** - Choose emoji avatar for user profile ✅ Completed in v0.2.15

#### 🟡 Medium Effort (3-8 hours)
- [x] **Active Participants Display** - Show who is currently viewing the board with real-time updates ✅ Completed in v0.2.16
- [ ] **Anonymous mode toggle** - Board-level setting to hide usernames on cards for honest feedback
- [ ] **Keyboard shortcuts** - Add shortcuts (N=new card, V=voting, T=timer, E=export, Esc=close, ?=help)
- [ ] **Dark/Light theme toggle** - Add light theme option with theme switcher in header

#### 🔴 Large Effort (1-3 days)
- [ ] **Action items tracking** - Mark cards as action items, assign owners, set due dates, track completion
- [ ] **Card reactions** - Add emoji reactions beyond votes (❤️ Love, 🎉 Celebrate, 💡 Idea, 🚀 Action, 🤔 Question)
- [ ] **Portuguese (pt-BR) support** - Lightweight client-side i18n with language selector

---

## 🧹 Repository Cleanup ✅ COMPLETED
- [x] **Remove temporary deployment scripts** - Deleted all temporary deploy-*.sh files ✅
- [x] **Consolidate roadmap files** - Removed `FUTURE_FEATURES.md` ✅
- [x] **Remove retro-app.exe** - Removed 20MB binary from repository ✅
- [x] **Move setup script to docs** - Moved `setup_wsl_env.sh` to `/docs` ✅

---

## 🐛 Bug Fixes
- [x] **Version display showing "unknown"** - Fixed in v0.2.5/v0.2.6 ✅
- [x] **Avatar display encoding issues** - Fixed in v0.2.15 ✅

---

## 📚 Documentation
- [ ] **README enhancements** - Add screenshots, better usage examples, and quick start guide
- [ ] **API documentation** - Document REST endpoints and WebSocket events
- [ ] **Deployment guide** - Comprehensive guide for Docker and Kubernetes deployment

---

## 🚀 Future Features (v0.3.0+)

### Phase 1: Multi-Team Support (v0.3.0)
**Effort:** XL (1-2 weeks)

- [ ] **Team/Squad management** - Allow multiple teams to use the app simultaneously
- [ ] **Team-filtered dashboard** - Filter boards by team
- [ ] **User roles** - Admin, facilitator, participant roles with different permissions

### Phase 2: Advanced Collaboration (v0.4.0)
**Effort:** L (3-5 days)

- [ ] **Real-time cursor tracking** - See where other users are clicking/typing
- [ ] **Card comments** - Add threaded comments to cards for discussion

### Phase 3: Analytics & Insights (v0.5.0)
**Effort:** L (3-5 days)

- [ ] **Retrospective analytics** - Track trends across multiple retros (sentiment, participation, action item completion)
- [ ] **Export to PDF** - Generate formatted PDF reports of retrospectives
- [ ] **Board templates marketplace** - Share and import custom board templates

### Phase 4: Integrations (v0.6.0)
**Effort:** XL (1-2 weeks)

- [ ] **Jira integration** - Create Jira tickets from action items
- [ ] **Slack notifications** - Send retro summaries to Slack channels
- [ ] **Calendar integration** - Schedule recurring retrospectives

---

## ✅ Completed Features

### v0.2.19 (Latest)
- [x] **Bug Fix** - Fixed corrupted HTML file causing frontend loading issues

### v0.2.18
- [x] **Bug Fix** - Resolved crash loop caused by duplicate route registration

### v0.2.17
- [x] **Participant Polling** - Automatic 5-second refresh for participant list reliability

### v0.2.16
- [x] **Active Participants Display** - Real-time list of users currently viewing the board
- [x] **Participant History** - Saves list of participants when board is finished
- [x] **Board Header** - Added board title and participant list to board view

### v0.2.15
- [x] **Avatar Selection** - Users can choose from 30+ emoji avatars for their profile
- [x] **Avatar Persistence** - Selected avatar is saved to localStorage and persists across sessions
- [x] **Avatar Display** - Avatar shown in header, welcome modal, and edit user modal
- [x] **Encoding Fixes** - Resolved UTF-8 encoding issues for emojis

### v0.2.13
- [x] **Complete Read-Only Mode for Finished Boards** - All interactive features (merge/unmerge/select/delete/vote/add card/column) are disabled when a board is finished, except CSV export
- [x] **Timer Sound Notifications** - Plays beep sound when timer reaches zero, with optional browser notification
- [x] **Help Modal Responsiveness** - Help modal is now scrollable and mobile-friendly with max-height and responsive media queries

### v0.2.12
- [x] **Username Edit Button Control** - Hide username edit button in board view, show only in dashboard
- [x] **Auto-Stop Timer on Finish** - Timer automatically stops and resets when finishing a retrospective

### v0.2.11
- [x] **Merge Conflict Resolution** - Fixed critical syntax errors in `board.js` caused by merge conflicts
- [x] **Restored Missing Functions** - Restored `initializeDragAndDrop`, `voteCard`, `createCard` and other functions that were accidentally removed
- [x] **Git Repository Cleanup** - Synchronized `main` branch and removed obsolete `migration/bentro-namespace` branch
- [x] **Frontend Stability** - Verified board creation and card interaction functionality

### v0.2.7
- [x] **WebSocket HTTPS support** - Fixed Mixed Content error by auto-detecting protocol (ws:// for HTTP, wss:// for HTTPS)
- [x] **Username prompt restored** - Fixed critical bug where username prompt disappeared with HTTPS
- [x] **Centralized version management** - Version now managed from single source in config.js
- [x] **Deployment.yaml restored** - Fixed corrupted Kubernetes deployment configuration

### v0.2.6
- [x] **Disable timer buttons on finished retros** - Start/Stop Timer buttons now disabled when board is finished
- [x] **Disable phase switching on finished retros** - Phase switching button disabled when board is finished
- [x] **Improved read-only mode consistency** - All interactive controls properly disabled

### v0.2.5
- [x] **Version display in Help Modal** - Shows current version
- [x] **Help Modal improvements** - Added logo, removed customizing templates section
- [x] **README logo fix** - Corrected path to bentrologo.png
- [x] **CSS corruption fix** - Fixed critical UI breaking bug

### v0.2.4
- [x] **HTML modularization** - Separated modals into modals.html
- [x] **Help modal fixes** - Improved content and styling

### v0.2.3
- [x] **JSON-based template configuration** - Dynamic board templates
- [x] **New 4-column template** - What Went Well/Badly template
- [x] **Ingress support** - Kubernetes ingress configuration

### v0.2.2
- [x] **Template configuration system** - Customizable board templates
- [x] **Help modal** - About and quick start guide

### v0.2.1
- [x] **Card merging** - Combine similar ideas
- [x] **Voting system** - Like/dislike cards
- [x] **CSV export** - Export retrospective data

### v0.2.0
- [x] **Multiple boards** - Create and manage multiple retrospectives
- [x] **Real-time WebSocket sync** - Live collaboration
- [x] **Timer functionality** - Timebox retrospective phases
- [x] **Drag and drop** - Reorder cards within columns

### Infrastructure
- [x] **Namespace migration** - Moved to `bentro` namespace
- [x] **App renaming** - Renamed to `bentro-app`
- [x] **Kubernetes manifests** - Full K8s deployment support

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

---

## 🎯 Recommended Next Steps

**Option 1: Quick Win** - Disable edit username button in board view  
**Estimated time:** 10-15 minutes  
**Impact:** Prepares for future "active participants" feature

**Option 2: UX Improvement** - Help modal responsiveness  
**Estimated time:** 30-45 minutes  
**Impact:** Better mobile experience

**Option 3: User Delight** - Timer sound notifications  
**Estimated time:** 1-2 hours  
**Impact:** Better time management during retros


