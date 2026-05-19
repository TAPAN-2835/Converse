import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  markNotificationsAsRead,
  registerFcmToken,
  updatePreferences,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.put("/read", protectRoute, markNotificationsAsRead);
router.post("/fcm-token", protectRoute, registerFcmToken);
router.put("/preferences", protectRoute, updatePreferences);

export default router;
