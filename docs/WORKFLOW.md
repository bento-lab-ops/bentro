# BenTro Development Workflow 🛠️

This document outlines the standard development process, branching strategy, and release procedures for the BenTro project.

## Branching Strategy

We follow a strict branching model to ensure stability and traceability.

### 1. `main` Branch
- **Purpose**: The source of truth for production-ready code.
- **Rules**:
    - NEVER push directly to `main`.
    - All changes must come via Pull Requests (PRs) or merges from feature/fix branches.
    - Must always be in a deployable state.

### 2. Feature Branches (`feature/<name>`)
- **Purpose**: Development of new features or enhancements.
- **Naming Convention**: `feature/short-description` (e.g., `feature/granular-updates`, `feature/teams-page`).
- **Workflow**:
    1. Create from `main`: `git checkout -b feature/new-thing`
    2. Develop and Test locally.
    3. Merge back to `main` upon completion.

### 3. Fix Branches (`fix/<name>`)
- **Purpose**: Bug fixes and patches.
- **Naming Convention**: `fix/issue-description` (e.g., `fix/vote-flicker`, `fix/login-error`).
- **Workflow**: Same as feature branches.

### 4. Chore Branches (`chore/<name>`)
- **Purpose**: Maintenance, refactoring, dependencies, documentation (no functional changes).
- **Naming Convention**: `chore/description` (e.g., `chore/bump-deps`, `chore/cleanup-docs`).

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) to streamline history and release notes.

**Format**: `<type>: <description>`

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semi-colons, etc. (no code change)
- `refactor`: Refactoring production code
- `chore`: Build process, auxiliary tools, dependencies

**Examples**:
- `feat: add granular vote updates`
- `fix: resolve css loading error in production`
- `docs: update deployment guide`

## Release Process

1. **Versioning**: We follow [Semantic Versioning](https://semver.org/) (`vX.Y.Z`).
    - `X` (Major): Breaking changes.
    - `Y` (Minor): New features (backward compatible).
    - `Z` (Patch): Bug fixes.
2. **Tagging**:
    - Once `main` is stable and ready for release.
    - Create a tag: `git tag v0.16.0`
    - Push tag: `git push origin v0.16.0`
3. **Docker Images**:
    - The CI/CD pipeline (or manual process) builds images based on these tags.
    - Image format: `dnlouko/bentro-app:vX.Y.Z`
