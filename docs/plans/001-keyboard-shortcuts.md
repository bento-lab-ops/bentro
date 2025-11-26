# Implementation Plan - Keyboard Shortcuts

## Goal
Implement keyboard shortcuts to improve power user efficiency.

## Proposed Shortcuts
- `?` (Shift+/): Toggle Help Modal
- `Esc`: Close any open modal or cancel card selection
- `E` (Shift+E): Export Board to CSV
- `T` (Shift+T): Start/Stop Timer (if active)
- `V` (Shift+V): Switch Phase (Grouping <-> Voting)
- `N` (Shift+N): Open "New Card" modal for the first column

## Logic
- **Global Listener:** Add `keydown` event listener to `document`.
- **Input Guard:** Ignore shortcuts if the user is typing in an `input` or `textarea`.
- **Context Awareness:**
  - Shortcuts only active when a board is loaded (`window.currentBoard` is set).
  - `T` and `V` only work if the user has permission (not read-only/finished).
  - `Esc` works globally.

## Files to Modify
### [MODIFY] [main.js](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/web/js/main.js)
- Add `setupKeyboardShortcuts()` function.
- Call it in `initApp()`.

### [MODIFY] [board.js](file:///c:/Users/danbn/.gemini/antigravity/scratch/retro-app/web/js/board.js)
- Ensure `switchPhase` logic is accessible or replicate it safely.
- Ensure `toggleTimer` logic is accessible.

## Verification
- Test each shortcut in the browser.
- Verify shortcuts are ignored when typing in a text field.
