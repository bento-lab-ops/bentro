# BenTro Roadmap 🗺️

## Current Version: **v0.15.4**


---

> [!TIP]
> **Development Workflow**: Please refer to [docs/WORKFLOW.md](docs/WORKFLOW.md) for our branching strategy and release process.

---


## 🚀 Future Plans (Backlog)

### v0.16.x - Performance & Stability
- [ ] **Granular State Updates**: Optimize WebSocket events to update only changed data instead of re-fetching the entire board ("Chatty App" fix). `feature/granular-updates`
- [ ] **Frontend Testing**: Implement Unit (Vitest) and E2E (Playwright) tests for critical flows. `feature/frontend-testing`
- [ ] **Toast Notifications**: Replace silent console errors with user-friendly toast messages. `feature/toast-notifications`

### v0.17.x - Real-time Collaboration II
- [ ] **Real-time Cursors**: See other users' mouse positions on the board.
- [ ] **Real-time Online Presence**: Visual indicators (e.g., green avatar outline) for users currently active.
- [ ] **Typing Indicators**: "User is typing..." notifications.

### v0.17.x - Enhanced Facilitation
- [ ] **Sound Effects**: Optional sounds for timer end, new cards, and votes.
- [ ] **Sorting & Filtering**: Sort cards by votes, date, or reactions.
- [ ] **Export Options**: PDF and Image export alongside CSV.

### Long Term
- [ ] **SSO Integration**: OAuth2 / Google / GitHub Login support.
- [ ] **Persistent Teams**: Enhanced team roles and cross-board analytics.
- [ ] **Plugin System**: API for custom column types and widgets.

---

## 📜 History (Implemented Features)

### v0.15.0 - Architecture & Infrastructure
- **Multi-Architecture Support**: Native support for ARM64 (Raspberry Pi/Apple Silicon) and AMD64.
- **Modular Frontend**: Complete refactor to MVC pattern for better maintainability.
- **Glassmorphic UI**: Standardized modal system replacing native browser alerts.

### v0.14.0 - Guest Experience & Performance
- **Guest Access**: Seamless flow for unauthenticated users (redirect to login -> return to board).
- **Performance**: Optimized Drag & Drop (SortableJS) and reduced event listener overhead.
- **Visual Polish**: Avatars for board members and cleaner layout.

### v0.13.0 - Teams & UX
- **Team Management**: "Invite Only" teams, specialized roles (Owner/Member).
- **Standardized Modals**: Consistent UI for all confirmations and interactions.
- **Mobile Responsiveness**: Improved touch targets and layout for phones/tablets.

### v0.12.0 - Stability
- **Hash-based Routing**: Client-side routing for faster navigation.
- **Service Layer**: Decoupled API logic for robust error handling.

### v0.11.0 - Core Logic
- **Claims System**: Host claiming/relinquishing for unmanaged boards.
- **Race Condition Protection**: Backend locking for concurrent board joins.

### v0.9.0 - Authentication & Admin
- **User System**: Full registration, login, and profile management.
- **Admin Dashboard**: System-wide statistics and user management.
- **Action Item Tracking**: Global view of action items with status (Open/Done).

### v0.8.0 - Facilitation Tools
- **Voting Controls**: Vote limits and Blind Voting (hide votes until reveal).
- **Role-Based Access**: Granular permissions for Board Owners vs. Participants.

### v0.6.0 - Internationalization
- **i18n Support**: Full translation support (English & Portuguese).
- **Dynamic Templates**: Customizable columns (Start/Stop/Continue, etc.).

### v0.2.0 - Foundation
- **Real-time WebSockets**: Instant updates for all connected clients.
- **Dark/Light Theme**: Built-in theme switcher.
- **Responsive Design**: Mobile-first approach.
