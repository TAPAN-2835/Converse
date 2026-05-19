import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { presenceManager } from "./presence.js";

/**
 * 🚀 High-performance Socket.io Server Setup
 * Implements token auth, Redis Pub/Sub sync compatibility, and presence lifecycles.
 */
export function initSocketServer(server) {
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
  const io = new Server(server, {
    cors: {
      origin: [FRONTEND_URL, "http://localhost:5173"],
      credentials: true
    }
  });

  // Share IO namespace globally for notification/event dispatches across router files
  global.io = io;

  // Connection Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = null;

      // 1. Try cookie parsing
      const handshakeCookie = socket.handshake.headers.cookie;
      if (handshakeCookie) {
        const parsedCookies = cookie.parse(handshakeCookie);
        token = parsedCookies.jwt;
      }

      // 2. Fallback to handshake query parameter (critical for mobile or token overrides)
      if (!token && socket.handshake.query) {
        token = socket.handshake.query.token;
      }

      if (!token) {
        return next(new Error("Authentication failed - No token provided"));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      if (!decoded || !decoded.userId) {
        return next(new Error("Authentication failed - Invalid token"));
      }

      socket.userId = decoded.userId.toString();
      next();
    } catch (err) {
      console.error("Socket authorization failed:", err.message);
      next(new Error("Unauthorized connection attempt"));
    }
  });

  // Client Session Lifecycle Hooks
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`[Socket Session] User ${userId} successfully established connection.`);

    // Join secure multi-device room
    socket.join(`user:${userId}`);

    // Update global presence state to Online
    presenceManager.setPresence(userId, {
      status: "online",
      socketId: socket.id
    });

    // Listen for custom room/channel shifts (for advanced notifications routing)
    socket.on("room.join", (roomId) => {
      socket.currentRoom = roomId;
      presenceManager.setPresence(userId, {
        status: "online",
        currentRoom: roomId,
        socketId: socket.id
      });
      console.log(`User ${userId} active in room ${roomId}`);
    });

    // Socket Disconnect Cleanup
    socket.on("disconnect", () => {
      console.log(`[Socket Session] User ${userId} disconnected.`);
      
      // Update global presence to Offline with exact lastSeen coordinates
      presenceManager.setPresence(userId, {
        status: "offline",
        lastSeen: new Date().toISOString()
      }, 86400); // Persist offline logs for 24 hours
    });
  });

  return io;
}
