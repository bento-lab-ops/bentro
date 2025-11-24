# BenTro Roadmap 🗺️

## Current Version: v0.2.7

---

## 🎯 Immediate Priorities (v0.2.7)

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

#### 🔴 **PostgreSQL Data Persistence** (URGENT)
**Effort:** 30 minutes  
**Priority:** Critical - Data loss on reboot

- [ ] Update PersistentVolume path from `/tmp/postgres-data` to `/var/lib/postgres-data`
- [ ] Create directory with correct permissions on Raspberry Pi
- [ ] Recreate PV and restart PostgreSQL deployment
- [ ] Verify data persists after pod restart

> **Issue:** Current configuration uses `/tmp` which is cleared on system reboot, causing data loss after power outages.

---

### ✨ Feature Enhancements (Ordered by Difficulty)

#### 🟢 Small Effort (1-2 hours)
- [ ] **Disable edit username button in board view** - Hide/disable edit username button when viewing a board (only show in dashboard) to prepare for future "active participants" feature
- [ ] **Help modal responsiveness** - Make help modal scrollable and responsive with `max-height` and `overflow-y: auto`
- [ ] **Timer sound notifications** - Play sound when timer ends, with browser notification permission

#### 🟡 Medium Effort (3-8 hours)
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

- [ ] **Active participants display** - Show who is currently viewing/editing a board
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

### v0.2.7 (Latest)
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


