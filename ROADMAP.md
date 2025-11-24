# BenTro Roadmap 🗺️

## Immediate Priorities (v0.2.7)

### ✨ Feature Enhancements
- [ ] **Disable edit username button in board view** - Hide/disable edit username button when viewing a board (only show in dashboard) to prepare for future "active participants" feature
- [ ] **Help modal responsiveness** - Make help modal scrollable and responsive with `max-height` and `overflow-y: auto`

### 🧹 Repository Cleanup
- [ ] **Remove temporary deployment scripts** - Delete `deploy-fix-v0.2.5.sh`, `deploy-rollback-v0.2.3.sh`, `deploy-v0.2.4.sh`, `deploy-v0.2.5.sh`
- [ ] **Consolidate roadmap files** - Move or remove `FUTURE_FEATURES.md` (keep only `ROADMAP.md`)
- [ ] **Move setup script to docs** - Move `setup_wsl_env.sh` to `/docs` folder or remove if obsolete

### 🐛 Bug Fixes
- [x] **Version display showing "unknown"** - Fixed in v0.2.5/v0.2.6 ✅

### 📚 Documentation
- [ ] **GitHub documentation link** - Already exists in Help modal (verify)
- [ ] **README with usage examples** - Enhance with screenshots and better examples

## Completed ✅

### v0.2.6
- [x] **Disable timer buttons on finished retros** - Start/Stop Timer buttons now disabled when board is finished
- [x] **Disable phase switching on finished retros** - Phase switching button disabled when board is finished
- [x] **Improved read-only mode consistency** - All interactive controls properly disabled

### v0.2.5
- [x] **Version display in Help Modal** - Shows v0.2.5
- [x] **Help Modal improvements** - Added logo, removed customizing templates section
- [x] **README logo fix** - Corrected path to bentrologo.png
- [x] **CSS corruption fix** - Fixed critical UI breaking bug

### Infrastructure (v0.3.0-ready)
- [x] **Namespace migration** - Moved to `bentro` namespace
- [x] **App renaming** - Renamed to `bentro-app`
- [x] **Kubernetes Manifests** - Fully updated for new namespace/app name

### v0.2.3
- [x] JSON-based template configuration
- [x] Dynamic template loading
- [x] New 4-column template (What Went Well/Badly)
- [x] Ingress support for Kubernetes
- [x] Fixed template loading path issue

### v0.2.2
- [x] Template configuration system
- [x] Help modal with customization guide

### v0.2.1
- [x] Card merging functionality
- [x] Voting system
- [x] CSV export

### v0.2.0
- [x] Multiple boards support
- [x] Real-time WebSocket sync
- [x] Timer functionality
- [x] Drag and drop cards

## Priority Legend

🔴 **Critical** - Blocks users or causes major issues  
🟡 **High** - Important for user experience  
🟢 **Medium** - Nice to have, improves experience  
🔵 **Low** - Future enhancement

## Effort Estimation

- **Small** (S) - 1-2 hours
- **Medium** (M) - 3-8 hours  
- **Large** (L) - 1-3 days
- **Extra Large** (XL) - 1+ weeks

## Next Steps

**Recommended next task**: Disable edit username button in board view (Small effort, Medium priority)

1. Hide `editUserBtn` when entering a board
2. Show `editUserBtn` when returning to dashboard
3. Update `loadBoard()` and `showDashboard()` functions

**Estimated time**: 10-15 minutes

**Alternative**: Repository cleanup (Small effort, Low priority) - Quick wins to clean up the codebase

