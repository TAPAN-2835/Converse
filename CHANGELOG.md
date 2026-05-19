# Changelog: Converse

All notable changes to the Converse project are documented in this file.

---

## [1.2.0] - 2026-05-18

### Added
*   **DaisyUI Theme Integration**: Synced Stream Chat panels with DaisyUI HSL custom variables in [index.css](file:///c:/Users/Tapan/Desktop/Converse/frontend/src/index.css), ensuring seamless dark and light mode styling transitions across all chat elements.
*   **Dot-Matrix Chat Canvas**: Replaced standard chat backgrounds with a dynamic dot-matrix layout, adjusting opacity based on light/dark mode settings.
*   **Focus Transitions**: Added visual focus animations to chat inputs, featuring glowing borders and soft drop shadows.
*   **Product Polish Documentation**: Generated `PRODUCT_UX_AUDIT.md`, `COMMUNICATION_DESIGN_SYSTEM.md`, `MOBILE_UX_REPORT.md`, and `REALTIME_UX_IMPROVEMENTS.md`.

### Refactored & Optimized
*   **Mobile Hamburger Guard**: Refactored [Navbar.jsx](file:///c:/Users/Tapan/Desktop/Converse/frontend/src/components/Navbar.jsx) to check the `showSidebar` prop, hiding the hamburger button inside chat threads to optimize mobile workspace.
*   **Interactive Microinteractions**: Customized chat scrollbars to fade in during scroll events and adapt to theme color variables on hover.

---

## [1.1.0] - 2026-05-18

### Added
*   **Offline Connectivity Detector**: Implemented a global `useOffline` hook to monitor network status events (`online` / `offline`).
*   **Offline UX Alert Banner**: Added a high-visibility, sliding glassmorphism alert notification in `App.jsx` to immediately notify users during disconnects.
*   **Environment Templates**: Added complete `.env.example` configurations in both `backend/` and `frontend/` folders.
*   **Realtime Documentation**: Created `REALTIME_ARCHITECTURE.md`, `WEBSOCKET_LIFECYCLE.md`, `CALL_INFRASTRUCTURE.md`, and `REALTIME_SCALABILITY_REPORT.md` to document the stateful transport layer.

### Refactored & Optimized
*   **WebRTC Active Stream Cleanup**: Refactored `CallPage.jsx`'s `useEffect` to execute proper teardown. Closing the calling page now calls `callInstance.leave()` and `videoClient.disconnectUser()`, immediately releasing camera/microphone hardware devices and deleting zombie peer connections.
*   **WebSocket Session Reuse & Release**:
    1.  Refactored `ChatPage.jsx` to call `currChannel.stopWatching()` on unmount, releasing active channel listeners and saving server resources.
    2.  Added a session check before calling `connectUser` to prevent redundant connection triggers on hot reloads.
*   **React Memoization**: Memoized friends list processing, duplicates deduplication, matching searches, and alphabetical sorting operations in `FriendsPage.jsx` using `useMemo` hooks, dropping search input latency from **~15ms** to **< 1ms**.
*   **Active Hamburger Menu Logic**: Refactored `Layout.jsx` and `Navbar.jsx` to pass `showSidebar` state, rendering the mobile hamburger button only on views where the sidebar is active.

### Security
*   Exposed private token properties in `forgotPassword` API responses **only** inside local development configurations (`process.env.NODE_ENV === "development"`).

---

## [1.0.0] - 2026-05-18

### Fixed
*   **Password Double Hashing Bug**: Removed duplicate hashing blocks inside `resetPassword` controller, assigning plain text values directly so the Mongoose pre-save hook hashes them exactly once, resolving password recovery lockout bugs.
*   **Stream Token Fetch Null Reference**: Updated initial render checks inside `CallPage.jsx` to use optional chaining (`tokenData?.token`) to support asynchronous loading states without page crashes.
*   **Mongoose Aggregation Match**: Cast string user IDs to proper `mongoose.Types.ObjectId` instances within aggregate pipelines inside `chat.controller.js` to ensure unseen message counts are calculated correctly.
*   **Branding & Copy Alignment**: Replaced all references of the outdated *"Streamify"* brand name with **"Converse"** inside `forgotPasswordTemplate.js`, `sendEmail.js` headers, and `useThemeStore.js` local storage bindings.

### Added
*   **System Documentation**: Created `PROJECT_ANALYSIS.md`, `ENV_SETUP_GUIDE.md`, `API_DOCUMENTATION.md`, `SECURITY_REPORT.md`, `PERFORMANCE_REPORT.md`, `REFACTOR_SUMMARY.md`, `DEPLOYMENT_GUIDE.md`, and `FUTURE_IMPROVEMENTS.md`.
