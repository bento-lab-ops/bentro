# BenTro Roadmap 🗺️

## Current Version: **v0.16.29**


---

> [!TIP]
> **Development Workflow**: Please refer to [docs/WORKFLOW.md](docs/WORKFLOW.md) for our branching strategy and release process.

---


## 🚀 Future Plans (Backlog)



### v0.17.x - Improved UX & Teams (Next)
- [x] **Sorting**: Sort cards by votes, date, or reactions.
- [x] **Card Merging**: Group similar cards and sum their votes.
- [ ] **Persistent Teams**: Enhanced team roles and cross-board analytics. (Moved from Long Term)

### Long Term
- [ ] **SSO Integration**: OAuth2 / Google / GitHub Login support.
- [ ] **Export Options**: PDF and Image export alongside CSV. (De-prioritized)
- [ ] **Plugin System**: API for custom column types and widgets.

---

## 📜 History (Implemented Features)

### v0.16.29 - Infrastructure & UI Polish
- **Helm Chart**: Official Helm chart created with "Happy Path" defaults (Postgres/Redis included).
- **Agnostic SSL**: `cert-manager` configured globally, enabling plug-and-play HTTPS for all apps.
- **OCI Distribution**: Chart published to DockerHub (`oci://registry-1.docker.io/dnlouko/bentro-app`).
- **Board UI Redesign**: Standardized button styles, glassmorphic dropdowns, and text labels for better accessibility.
- **Granular State Updates**: Optimized WebSocket events to update only changed data.
- **Frontend Testing**: Added Unit and E2E tests foundation.

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
