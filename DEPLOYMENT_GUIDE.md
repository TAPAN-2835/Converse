# Deployment Guide: Converse Full-Stack Monorepo

This guide provides step-by-step instructions to compile, build, and deploy the Converse full-stack monorepo application to production-grade hosting services such as **Render.com**, **Heroku**, or **DigitalOcean**.

---

## 1. Monorepo Build Architecture

Converse utilizes a monorepo setup where both frontend and backend are housed in a single git repository. In production, the backend Node.js Express server acts as both the **REST API** and the **Static File Server** hosting the React Vite SPA.

### Root `package.json` Commands
The application is pre-configured with root scripts to allow hosting platforms to build and start both the client and server seamlessly:

*   **Build Command**:
    ```bash
    npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
    ```
    This script installs all backend dependencies, installs all frontend dependencies, and runs the Vite compiler to bundle the React app into optimized static files (`/frontend/dist`).
*   **Start Command**:
    ```bash
    npm run start --prefix backend
    ```
    This script boots the production Node.js Express API. In `server.js`, Express is configured to serve the compiled frontend folder (`/frontend/dist`) statically:
    ```javascript
    if (process.env.NODE_ENV === "production") {
        app.use(express.static(path.join(__dirname, "../../frontend/dist")));
        app.get("*", (req, res) => {
            res.sendFile(path.join(__dirname, "../../frontend/dist", "index.html"));
        });
    }
    ```

---

## 2. Deploying to Render.com (Recommended for Monorepos)

Render is a modern cloud provider offering excellent native support for Node.js monorepos.

### Step 1: Create a Render Web Service
1. Log in to [Render](https://render.com/).
2. Click **New +** in the dashboard and select **Web Service**.
3. Connect your Git repository (GitHub or GitLab).

### Step 2: Configure Service Settings
Specify the following parameters during creation:

*   **Name**: `converse-app` (or any custom identifier)
*   **Region**: Select the region closest to your primary user base.
*   **Language**: `Node`
*   **Branch**: `main` (or your primary release branch)
*   **Build Command**: `npm run build`
*   **Start Command**: `npm run start`

### Step 3: Add Production Environment Variables
Click on the **Environment** tab in Render and add the following keys:

| Key | Value |
| :--- | :--- |
| `NODE_ENV` | `production` (Crucial: sets secure cookies and hosts static React bundle) |
| `PORT` | `10000` (Render's default port, or leave blank; Render handles port binding dynamically) |
| `MONGODB_URI` | `mongodb+srv://admin:<password>@cluster.mongodb.net/converse?retryWrites=true&w=majority` |
| `JWT_SECRET_KEY` | `[Paste your secure 64-char generated hex secret here]` |
| `STREAM_API_KEY` | `[Your Stream API Key]` |
| `STREAM_API_SECRET`| `[Your Stream API Secret]` |
| `RESEND_API` | `[Your Resend API Key]` |

Click **Save Changes**. Render will automatically trigger a build, install dependencies, compile the Vite React bundle, and launch the Node.js Express server.

---

## 3. Troubleshooting Common Deployment Errors

### A. NPM Peer Dependency Conflicts (EROSOLVE)
*   **Issue**: During `npm install`, the build fails due to conflicting peer dependency requirements (e.g. Stream SDK requires React 18, but the project uses React 19).
*   **Fix**: Update the Root `package.json` build command to bypass peer checks using `--legacy-peer-deps`:
    ```json
    "build": "npm install --prefix backend && npm install --prefix frontend --legacy-peer-deps && npm run build --prefix frontend"
    ```

### B. Client-side Routing Returns 404 on Refresh
*   **Issue**: Refreshing the browser on a client-side route like `/chat/123` returns a `404 Not Found` error.
*   **Fix**: Ensure `NODE_ENV` is set to `production` in your server environment variables. This forces the Express server to redirect all unmatched requests (`*`) back to `/frontend/dist/index.html` where React Router handles the route rendering dynamically.

### C. Cookies Fail to Save in Browser
*   **Issue**: Users can log in successfully, but refreshes log them out because the JWT session cookie is not saved.
*   **Fix**: In production, the session cookie uses the `secure: true` flag, which requires the connection to use HTTPS. Make sure your server is running behind a secure SSL/TLS connection (automatically provided by cloud hosts like Render).
