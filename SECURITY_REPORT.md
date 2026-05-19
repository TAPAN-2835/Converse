# Security Audit & Mitigation Report: Converse

This report documents the security audit, found vulnerabilities, applied architectural fixes, WebSocket and WebRTC security considerations, and long-term security recommendations for the Converse application.

---

## 1. Executive Summary

A comprehensive security audit of both stateless HTTP and stateful realtime (WebSocket/WebRTC) layers was performed. 

The application utilizes strong out-of-the-box configurations, such as HTTP-Only JWT session cookies to prevent client-side XSS tokens extraction. However, multiple high-severity security vectors in password resets and connection leaks have been identified and successfully patched during this audit.

---

## 2. Identified Vulnerabilities & Technical Patches

### A. Critical Severity: Account Takeover via Password Reset OTP Leaking in API Response
*   **Vulnerability**: In the `/api/auth/forgot-password` endpoint, the generated 6-digit OTP code was returned in the plain JSON response body sent to the client.
*   **Impact**: A malicious actor could request a password reset for *any* user (providing only their email), read the OTP from the network response, verify it using `/verify-reset-otp`, and reset the target user's password. This bypasses email verification completely, leading to immediate account takeover.
*   **Mitigation**: The controller was refactored. The OTP code is now appended to the API JSON response *only* when the server is explicitly running in local development mode (`process.env.NODE_ENV === "development"`). In production, the OTP is strictly kept server-side and sent solely via Resend email transmission.

### B. High Severity: Password Double Hashing Bug (Auth Denial of Service)
*   **Vulnerability**: The User model utilizes a Mongoose pre-save hook to hash passwords using bcrypt. However, the password reset endpoint (`/api/auth/reset-password`) was *also* explicitly hashing the new password before calling `await user.save()`.
*   **Impact**: When `user.save()` was triggered, the pre-save hook detected that `user.password` was modified, hashing the *already hashed* password. The database stored a double-hashed password, locking the user out of their account permanently since login checks perform only a single hash comparison.
*   **Mitigation**: Removed the manual hashing block inside `resetPassword` controller. We now assign the plain text password directly: `user.password = newPassword`. Mongoose's pre-save middleware intercepts this, hashes it exactly once, and stores it securely.

---

## 3. Stateful Realtime Security Hardening (WebSockets & WebRTC)

### A. Token Exposure Prevention & VITE_ Prefix Guard
*   **Audit**: Private API keys (like `STREAM_API_SECRET` or `RESEND_API`) must never be prefixed with `VITE_` in the frontend directory. Vite automatically embeds variables matching the `VITE_` prefix into the compiled client-side JavaScript bundle, making them readable by *any* user visiting your application via the browser inspector.
*   **Hardening**: Strict separation is maintained. Only the public `VITE_STREAM_API_KEY` is exposed to the frontend. The secret keys are held on the backend inside environment files and used server-side to generate signed user tokens.

### B. WebSocket Authorization Validation
*   **Audit**: Clients connect to the Stream WebSocket using user profile IDs. If authorization tokens are not verified, a malicious client could spoof any user ID and intercept their messaging streams.
*   **Hardening**: Stream WebSocket handshakes require a signed JWT token generated using the HS256 algorithm with the shared `STREAM_API_SECRET`. The edge WebSocket server verifies the signature, preventing client-side ID spoofing or connection hijacking.

### C. Media Stream Encryption (WebRTC DTLS/SRTP)
All audio and video media streams coordinated through the GetStream SFU are dynamically encrypted at the transport layer using:
1.  **DTLS (Datagram Transport Layer Security)**: Secures keys exchange between the client and SFU.
2.  **SRTP (Secure Real-time Transport Protocol)**: Encrypts the audio and video packet payloads, preventing wiretapping or eavesdropping.

---

## 4. Suggested Long-Term Security Hardening (Technical Roadmap)

To elevate Converse to enterprise-grade compliance, the following dependencies and configurations are recommended:

### A. Implement Express Helmet (HTTP Headers Hardening)
Install and configure `helmet` to secure Express apps by setting various HTTP headers (XSS Filter, HSTS, Content Security Policy, Clickjacking protection):
```bash
npm install helmet --prefix backend
```
Usage in `server.js`:
```javascript
import helmet from "helmet";
app.use(helmet());
```

### B. Rate Limiting (Brute-Force & DDoS Mitigation)
Protect auth routes (especially login and forgot-password) from automated brute-force attacks by rate-limiting requests:
```bash
npm install express-rate-limit --prefix backend
```
Usage in `server.js` (apply strictly to authentication routes):
```javascript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 password-reset/login requests per windowMs
  message: { message: "Too many requests from this IP, please try again after 15 minutes." }
});

app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/login", authLimiter);
```
