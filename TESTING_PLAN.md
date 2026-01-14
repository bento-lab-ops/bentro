# Unit Testing Plan & Roadmap (v1.0)

## Goal
Establish a robust unit testing culture by covering key components of the application with automated tests.
Each test suite runs inside a Docker container to ensure environment consistency.

## Strategy
**"Local First" Approach**: Ensure tests pass locally to avoid polluting the container registry with broken images.

1.  **Frontend (JavaScript)**: Use `Vitest` + `jsdom`. Run via `npm test`.
    *   Focus: Utility functions, Controllers (mocking dependencies), and API helpers.
2.  **Backend (Go)**: Use `testing` (stdlib) + `testify`. Run via `go test ./...`.
    *   Focus: Models, Utils, and Handlers (using `httptest`).

## Roadmap

### Phase 1: Foundation (Frontend) [COMPLETED]
- [x] Setup `Vitest` and `Dockerfile_unit_test` (Frontend).
- [x] Test `web/js/utils.js` (Simple DOM manipulation).
- [x] Test legacy controllers (`DashboardController`, `BoardController` recovered).
- [x] Fix bugs exposed by tests in `auth.js` and `DashboardController.js`.

### Phase 2: Foundation (Backend) [COMPLETED]
- [x] Setup `testify` dependencies.
- [x] Test `internal/models` (Struct validation & Hooks) - **100% Coverage**
- [x] Test `internal/database` (Connection & Migration) - **100% Coverage**


### Phase 3: Core Logic (Frontend)
- [ ] Test `web/js/services/BoardService.js` (Mocking fetch).
- [ ] Test `web/js/controllers/BoardController.js` (Complex state).

### Phase 4: Core Logic (Backend)
- [ ] Test `internal/handlers` (HTTP Endpoints)
    - [x] `auth_handler.go` & `init_admin.go` - **Covered**
    - [x] `board_handler.go` - **Covered**
    - [x] `column_handler.go` & `card_handler.go` - **Covered**
    - [x] `vote_handler.go` & `reaction_handler.go` - **Covered**

## Execution Log
- *Pending start*
