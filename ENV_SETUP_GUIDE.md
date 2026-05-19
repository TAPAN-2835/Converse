# Environment & Configuration Setup Guide: Converse

This guide outlines all the configuration settings, environmental variables, and service credentials required to run the Converse application in both development and production environments.

---

## 1. Required Environment Variables

### Backend Configuration (`/backend/.env`)

The backend is built on Node.js and requires configuration for database connectivity, security, and third-party integrations (GetStream.io and Resend).

| Key | Description | Source / Service | Example / Format |
| :--- | :--- | :--- | :--- |
| `PORT` | Local server port (optional, defaults to `5001`) | Self-configured | `5001` |
| `MONGODB_URI` | Connection URI for the MongoDB database | MongoDB Atlas / Local | `mongodb+srv://...` or `mongodb://localhost:27017/converse` |
| `JWT_SECRET_KEY` | High-entropy key used to sign session cookies | Self-generated | `64-character hex string` (see generation guide) |
| `STREAM_API_KEY` | Public key for real-time chat and video calling | GetStream.io Console | `z9xqyutp5b8w` |
| `STREAM_API_SECRET` | Private secret key used to generate Stream JWT tokens | GetStream.io Console | `p3m5skd...` (keep highly secure) |
| `RESEND_API` | API key to send password reset OTP transactional emails | Resend.com Console | `re_9yKsWf...` |
| `NODE_ENV` | Running environment mode (`development` or `production`) | Self-configured | `development` |

### Frontend Configuration (`/frontend/.env`)

Vite requires prefixing client-exposed variables with `VITE_`.

| Key | Description | Source / Service | Example / Format |
| :--- | :--- | :--- | :--- |
| `VITE_STREAM_API_KEY` | Public API Key (Must match `STREAM_API_KEY` exactly) | GetStream.io Console | `z9xqyutp5b8w` |

---

## 2. Service Credentials Generation Guide

### A. MongoDB Atlas (Cloud Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and log in or create a free account.
2. Create a new cluster (Shared Tier is free and perfect for development).
3. Under **Security -> Database Access**, create a user with "Read and Write to any database" privileges. Record the password.
4. Under **Security -> Network Access**, click "Add IP Address" and select **Allow Access from Anywhere** (`0.0.0.0/0`) or whitelist your current developer/server IP.
5. In the cluster dashboard, click **Connect -> Connect your application**.
6. Copy the connection string (format: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`).
7. Replace `<username>` and `<password>` with your database user credentials.

### B. GetStream.io (Chat & Video calling SDKs)
1. Navigate to [GetStream.io](https://getstream.io/) and register for a developer account (they have a generous free Maker trial).
2. Go to the **Stream Dashboard** and click **Create App**.
3. Name your app (e.g., `Converse`) and select your region.
4. Once created, select your app from the list.
5. In the **App Credentials** card on your dashboard, locate and copy the **API Key** and **Secret**.
6. Set `STREAM_API_KEY` (backend), `VITE_STREAM_API_KEY` (frontend) to your API Key, and `STREAM_API_SECRET` (backend) to your Secret.

### C. Resend.com (Email delivery)
1. Navigate to [Resend.com](https://resend.com/) and register.
2. In the sidebar, click **API Keys -> Create API Key**.
3. Set the key description (e.g. `converse-dev`) and give it Full Access.
4. Copy the API Key (starting with `re_`) immediately (it is only shown once).
5. Set `RESEND_API` (backend) to this value.
6. *Note*: In development, Resend restricts you to sending emails to your registration address only. For production, you will need to add and verify a domain under **Domains**.

### D. Generating a High-Entropy JWT Secret Key
To generate a secure, production-ready 256-bit random hex secret key for your session cookies, open a terminal and run the following command:

**Using Node.js CLI:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the printed 64-character string and assign it to `JWT_SECRET_KEY` in `/backend/.env`.

---

## 3. Example Configuration Files

### `/backend/.env`
```ini
PORT=5001
MONGODB_URI=mongodb+srv://admin:securePassword123@cluster0.abcde.mongodb.net/converse?retryWrites=true&w=majority
JWT_SECRET_KEY=e8f967a1b80c54157d60920b6910da12e4f0163359d57fb4a92c4cd8fbcde490
STREAM_API_KEY=z9xqyutp5b8w
STREAM_API_SECRET=e7q45r9sz7598cgd8346zsn3t4zvn34tzzq8437tzqf4vzn3q8tzq3vzn3q9t
RESEND_API=re_9yKsWf67_jHsYt83Rkd94HgKdL47sWqPz
NODE_ENV=development
```

### `/frontend/.env`
```ini
VITE_STREAM_API_KEY=z9xqyutp5b8w
```

---

## 4. Development vs. Production Configurations

### Development Setup
*   `NODE_ENV` is set to `development`.
*   Cookies do not require HTTPS: `res.cookie("jwt", token, { secure: false })` (handled dynamically based on `NODE_ENV`).
*   Password recovery OTP is returned directly in the `/api/auth/forgot-password` JSON response body as a backup.
*   CORS origin is explicitly set to `http://localhost:5173` (Vite's default port).

### Production Setup
*   `NODE_ENV` is set to `production`.
*   Cookies enforce secure TLS transmission: `res.cookie("jwt", token, { secure: true })` (preventing man-in-the-middle session hijacking).
*   Password reset OTP is NEVER returned in the API response, enforcing 100% dependency on verified Resend email transmission.
*   The Express server serves optimized static React files directly from `../frontend/dist`.
*   CORS is strictly configured or restricted to prevent third-party cross-site request forgery.

---

## 5. Security Warnings & Safe Usage Practices

> [!WARNING]
> **Hardcoded Secret Detection & Git Leaks**: Never hardcode API keys, database credentials, or secret keys directly inside code (e.g., using a plain string in `server.js` or `db.js`). Ensure `.env` is added to the `.gitignore` file in both frontend and backend directories before pushing to Git repositories.

> [!CAUTION]
> **Exposed Frontend Secrets**: Never prefix sensitive private keys (like `STREAM_API_SECRET` or `RESEND_API`) with `VITE_` in the frontend directory. Vite automatically embeds variables matching the `VITE_` prefix into the compiled client-side JavaScript bundle, making them readable by *any* user visiting your application via the browser inspector. Keep these variables strictly on the backend!

---

## 6. Common Setup Errors & Troubleshooting

### 1. `Stream API key or Secret is missing` Console Error
*   **Root Cause**: Backend or frontend could not read the Stream variables.
*   **Fix**: Verify that you created `.env` inside `/backend` and `/frontend` directories, and that you restarted your dev servers after creating/modifying these files.

### 2. Mongoose: `URI must be a string` or MongoNetworkError
*   **Root Cause**: The MONGODB_URI environment variable is missing, undefined, or formatted incorrectly.
*   **Fix**: Check `/backend/.env` for correct spelling, make sure the string is not enclosed in double quotes unless necessary, and make sure it has no trailing spaces.

### 3. OTP Email not received
*   **Root Cause**: The Resend API key is incorrect, or you are trying to send an email to a non-registered account on a free trial tier.
*   **Fix**: Verify the `RESEND_API` key in `.env`. Ensure the recipient email in the recovery flow matches your Resend login address, or upgrade your account to verify your business domain.
