import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * 🚀 Distributed Real-time Notification Dispatcher
 * Integrates horizontally scalable Socket.io, user preferences, and FCM pushes.
 */
class NotificationService {
  /**
   * Persists, processes preferences, and dispatches a notification across all cluster nodes
   */
  async createAndSendNotification({
    recipientId,
    senderId,
    type,
    title,
    body,
    groupChannelId = null,
    payload = {}
  }) {
    try {
      // 1. Fetch recipient and validate their mute preferences
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        throw new Error("Recipient user record not found");
      }

      const prefs = recipient.notificationPreferences || { dms: true, groups: true, mentions: true };
      
      // Enforce custom mute validations
      if (groupChannelId && !prefs.groups) {
        console.log(`Skipping notification: Group alerts are muted by user ${recipientId}`);
        return null;
      }
      if (!groupChannelId && !prefs.dms) {
        console.log(`Skipping notification: DM alerts are muted by user ${recipientId}`);
        return null;
      }

      // 2. Persist notification in local MongoDB
      const notificationDoc = new Notification({
        recipientId,
        senderId,
        type,
        title,
        body,
        groupChannelId,
        payload,
        status: "unread"
      });
      await notificationDoc.save();

      // Populate sender info for frontend visuals
      const populatedDoc = await Notification.findById(notificationDoc._id)
        .populate("senderId", "fullName profilePic");

      // 3. Horizontal socket broadcast via Redis/Socket.io room
      if (global.io) {
        console.log(`🚀 Broadcasting real-time socket notification to room user:${recipientId}`);
        global.io.to(`user:${recipientId}`).emit("notification.new", populatedDoc);
      }

      // 4. Background Web Push Simulation (to FCM device tokens)
      if (recipient.fcmTokens && recipient.fcmTokens.length > 0) {
        this.dispatchFcmPush(recipient.fcmTokens, {
          title,
          body,
          notificationId: notificationDoc._id.toString(),
          type,
          ...payload
        });
      }

      return populatedDoc;
    } catch (error) {
      console.error("Error in createAndSendNotification service:", error.message);
      throw error;
    }
  }

  /**
   * Simulated Firebase Cloud Messaging token-based push dispatches
   */
  async dispatchFcmPush(tokens, payload) {
    console.log(`[FCM Push Delivery] Preparing to dispatch background pushes to ${tokens.length} registered device tokens...`);
    tokens.forEach((token) => {
      console.log(`[FCM Client Push] Delivering to token: ${token.substring(0, 12)}... Payload:`, payload);
      // In production, this maps to:
      // admin.messaging().send({ token, notification: { title, body }, data: payload })
    });
  }
}

export const notificationService = new NotificationService();
