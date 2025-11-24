# Version Management Guide

## Current Version System

The application version is managed through a **single source of truth** in [`web/js/config.js`](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/web/js/config.js):

```javascript
const APP_VERSION = 'v0.2.7';
```

This version is automatically used in:
- Console log on app initialization
- Help modal display
- All user-facing version indicators

## How to Update Version

When releasing a new version, update **only these files**:

### 1. Primary Version (Required)
- **[`web/js/config.js`](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/web/js/config.js)** - Line 2: `const APP_VERSION = 'vX.Y.Z';`

### 2. Secondary Versions (For consistency)
- **[`web/js/version.js`](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/web/js/version.js)** - Line 2: `window.BENTRO_VERSION = 'vX.Y.Z';`
- **[`ROADMAP.md`](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/ROADMAP.md)** - Line 3: `## Current Version: vX.Y.Z`
- **[`k8s/deployment.yaml`](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/k8s/deployment.yaml)** - Line 20: `image: dnlouko/bentro-app:vX.Y.Z`

### 3. Git Tag
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z: Description"
git push origin vX.Y.Z
```

## Version Numbering

We follow **Semantic Versioning** (SemVer): `vMAJOR.MINOR.PATCH`

- **MAJOR** (v1.0.0): Breaking changes, major rewrites
- **MINOR** (v0.3.0): New features, non-breaking changes
- **PATCH** (v0.2.7): Bug fixes, small improvements

### Examples:
- `v0.2.7` → `v0.2.8`: Bug fix (WebSocket HTTPS)
- `v0.2.7` → `v0.3.0`: New feature (Dark mode, Portuguese support)
- `v0.2.7` → `v1.0.0`: Major release (Multi-team support, breaking changes)

## Release Checklist

When preparing a new release:

- [ ] Update `APP_VERSION` in `web/js/config.js`
- [ ] Update `BENTRO_VERSION` in `web/js/version.js`
- [ ] Update `Current Version` in `ROADMAP.md`
- [ ] Update completed features section in `ROADMAP.md`
- [ ] Update Docker image tag in `k8s/deployment.yaml`
- [ ] Build new Docker image: `nerdctl build -t dnlouko/bentro-app:vX.Y.Z .`
- [ ] Push to DockerHub: `nerdctl push dnlouko/bentro-app:vX.Y.Z`
- [ ] Create Git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z: Description"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Deploy to Kubernetes: `kubectl apply -f k8s/deployment.yaml`
- [ ] Verify version in Help modal

## Automation Ideas (Future)

To prevent version inconsistencies, consider:

1. **Build-time version injection**: Use environment variables or build scripts
2. **Git hooks**: Pre-commit hook to verify version consistency
3. **CI/CD pipeline**: Automated version bumping and tagging
4. **Version script**: Shell/Python script to update all files at once

Example script concept:
```bash
#!/bin/bash
# bump-version.sh
NEW_VERSION=$1
sed -i "s/APP_VERSION = '.*'/APP_VERSION = '$NEW_VERSION'/" web/js/config.js
sed -i "s/BENTRO_VERSION = '.*'/BENTRO_VERSION = '$NEW_VERSION'/" web/js/version.js
# ... update other files
git commit -am "Bump version to $NEW_VERSION"
git tag -a $NEW_VERSION -m "Release $NEW_VERSION"
```

## Current Files Using Version

| File | Line | Usage |
|------|------|-------|
| `web/js/config.js` | 2 | **Primary source** - `APP_VERSION` constant |
| `web/js/main.js` | 3 | Console log (uses `APP_VERSION`) |
| `web/js/main.js` | 22 | Help modal (uses `APP_VERSION`) |
| `web/js/version.js` | 2 | Legacy `BENTRO_VERSION` |
| `ROADMAP.md` | 3 | Documentation |
| `k8s/deployment.yaml` | 20 | Docker image tag |

---

**Note:** After centralizing to `APP_VERSION` in config.js, the version is now automatically consistent across console and help modal. Only manual updates needed are in config.js, version.js, ROADMAP.md, and deployment.yaml.
