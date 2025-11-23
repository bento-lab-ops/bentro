# BenTro Roadmap 🗺️

## Immediate Priorities (v0.2.4 - Re-attempt)

### 🐛 Bug Fixes
- [ ] **Version display showing "unknown"** - Needs fix (reverted)
- [ ] **Help modal responsiveness** - Make help modal scrollable and responsive
- [ ] **Simplify help modal content** - Remove detailed examples

### 📚 Documentation
- [ ] **GitHub repository setup** - Create public repository for BenTro
- [ ] **GitHub documentation link** - Add link in help modal
- [ ] **README with usage examples** - Comprehensive guide

## Completed ✅

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

**Recommended next task**: Fix help modal responsiveness (Small effort, High priority)

1. Add `max-height` and `overflow-y: auto` to modal content
2. Test on mobile devices
3. Simplify help content (remove code examples)
4. Add GitHub link placeholder

**Estimated time**: 30-60 minutes
