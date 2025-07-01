import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStreamToken, getUnseenMessagesCount, getUnseenMessagesPerUser, sendMessage, markMessagesAsRead } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.get("/unseen-count", protectRoute, getUnseenMessagesCount);
router.get("/unseen-per-user", protectRoute, getUnseenMessagesPerUser);
router.post("/send", protectRoute, sendMessage);
router.put("/mark-read/:senderId", protectRoute, markMessagesAsRead);

export default router;
