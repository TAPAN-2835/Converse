import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getStreamToken,
  getUnseenMessagesCount,
  getUnseenMessagesPerUser,
  sendMessage,
  markMessagesAsRead,
  getMessagesHistory,
  syncStreamMessage,
  editStreamMessage,
  deleteStreamMessage,
} from "../controllers/chat.controller.js";
import { addReaction, removeReaction } from "../controllers/reaction.controller.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";
import { uploadMedia } from "../controllers/upload.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.get("/unseen-count", protectRoute, getUnseenMessagesCount);
router.get("/unseen-per-user", protectRoute, getUnseenMessagesPerUser);
router.post("/send", protectRoute, sendMessage);
router.put("/mark-read/:senderId", protectRoute, markMessagesAsRead);
router.get("/history", protectRoute, getMessagesHistory);

// Reply + Edit + Delete Sync Endpoints
router.post("/message/sync", protectRoute, syncStreamMessage);
router.put("/message/:streamMessageId", protectRoute, editStreamMessage);
router.post("/message/:streamMessageId/delete", protectRoute, deleteStreamMessage);

// Reaction Sync Endpoints
router.post("/reactions", protectRoute, addReaction);
router.post("/reactions/remove", protectRoute, removeReaction); // Express POST fallback for simple client support

// Secure Media Upload Endpoint
router.post("/upload", protectRoute, uploadMiddleware, uploadMedia);

export default router;
