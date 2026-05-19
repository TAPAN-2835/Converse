import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import http from "http";
import helmet from "helmet";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import groupRoutes from "./routes/group.route.js";
import notificationRoutes from "./routes/notification.route.js";
import searchRoutes from "./routes/search.route.js";

import { connectDB } from "./lib/db.js";
import { initSocketServer } from "./lib/socket.js";

const app = express();
const PORT = process.env.PORT || 5001;

const __dirname = path.resolve();

// 🚀 Add Helmet security headers with permissive CSP to allow CDNs & WebRTC streams
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// 🚀 Dynamic Production CORS Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173"],
    credentials: true, // allow cookies to traverse cross-origins
  })
);

// Increase payload limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Catch-all: send index.html for any other route (for React Router)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
});

// Wrap express server in high-performance HTTP wrapper to support WebSockets
const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
