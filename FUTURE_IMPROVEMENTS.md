# Future Improvements & Roadmap: Converse

This document outlines the planned future features, architectural refactoring, performance enhancements, and security upgrades for the Converse platform.

---

## 1. Feature Additions

### A. Progressive Web App (PWA) Compliance
Convert the React SPA into a Progressive Web App to enable desktop install shortcuts, mobile home screen shortcuts, and offline-capable service workers.

*   **Implementation Steps**:
    1.  Add a `manifest.json` file in `/frontend/public` defining brand icons, theme colors, and the startup URL.
    2.  Register a service worker (`sw.js`) to cache core static JS/CSS assets for instant load times under weak network connections.
    3.  Integrate the `vite-plugin-pwa` plugin into `vite.config.js` to handle service worker compilations automatically.

### B. Mobile App Scaffold (React Native / Expo)
Extend Converse into native Android and iOS applications utilizing Expo. Since GetStream.io offers rich React Native libraries, much of our existing component logic can be directly reused.

*   **Implementation Steps**:
    1.  Initialize a `/mobile` Expo workspace utilizing Expo CLI.
    2.  Integrate Stream React Native Chat and Video SDKs.
    3.  Create shared business hook adapters (e.g. sharing Zustand token stores and React Query key definitions) across the React Native and React Web codebases.

### C. Push Notifications Integration
Implement native web and mobile push notifications to alert users of new incoming messages and call invitations when the app is running in the background.

*   **Implementation Steps**:
    1.  Incorporate Google Firebase Cloud Messaging (FCM) or Web Push protocols.
    2.  Securely capture and store user subscription tokens inside a `User.notificationTokens` array.
    3.  Add post-save database triggers (or GetStream webhook listeners) on the backend to transmit notification payloads immediately when messages are sent.

---

## 2. Architectural Refactoring

### A. Move from Controller to Service Layer (SOLID)
Refactor the large controller files (such as `auth.controller.js`) into a dedicated **Service Layer** to isolate pure business logic from the HTTP request-response cycle.

*   **Refactored Design Pattern**:
    *   `controllers/auth.controller.js` -> Validates incoming request structures, passes sanitized parameters to the service layer, and returns the appropriate HTTP status code.
    *   `services/auth.service.js` -> Contains database operations (User updates), Resend mail requests, and encryption commands. This makes unit testing auth logic with Jest incredibly simple.

### B. Centralized API Validation (Express Validator)
Remove manual input checks (e.g. `if (!email || !newPassword)`) inside controllers, replacing them with a centralized declarative validation middleware.

*   **Example**:
    ```javascript
    import { body, validationResult } from "express-validator";

    export const validateSignup = [
      body("email").isEmail().withMessage("Enter a valid email address"),
      body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
      body("fullName").notEmpty().withMessage("Name is required"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        next();
      }
    ];
    ```

---

## 3. Performance Enhancements

### A. Redis Caching for Recommendation Lists
Querying discoverable users runs an intensive search query across Mongoose:
```javascript
const users = await User.find({
  _id: { $ne: loggedInUserId },
  friends: { $nin: [loggedInUserId] },
  isOnboarded: true
});
```
At scale, executing this on every dashboard render will slow down the database. We can cache recommendations in Redis.

*   **Caching Strategy**:
    *   Store recommended user IDs inside Redis keys using a 10-minute TTL.
    *   Invalidate the Redis cache immediately when a friend request is accepted or sent, ensuring real-time consistency.

### B. Code-Splitting and Lazy Route Loading
Implement route-based lazy loading to split massive GetStream JS bundles into page-specific chunks.

*   **Implementation**:
    Use React's `lazy` and `Suspense` API in `App.jsx` to load components like `ChatPage` and `CallPage` only when they are navigated to, improving initial page load speeds by up to **90%**.
