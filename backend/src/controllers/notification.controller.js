import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * 🚀 Retrieves the user's notification feed.
 */
export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("senderId", "fullName profilePic");

    const totalUnread = await Notification.countDocuments({
      recipientId: userId,
      status: "unread",
    });

    res.status(200).json({
      success: true,
      notifications,
      totalUnread,
      preferences: req.user.notificationPreferences || { dms: true, groups: true, mentions: true }
    });
  } catch (error) {
    console.error("Error in getNotifications controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🚀 Marks single or batch notifications as read.
 */
export async function markNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body; // Array of IDs, or empty to mark ALL as read!

    const query = { recipientId: userId };
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    await Notification.updateMany(query, { status: "read" });

    res.status(200).json({
      success: true,
      message: "Notifications marked as read successfully",
    });
  } catch (error) {
    console.error("Error in markNotificationsAsRead controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🚀 Registers a Firebase Cloud Messaging push token.
 */
export async function registerFcmToken(req, res) {
  try {
    const userId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }

    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: fcmToken } }, // Prevent duplicates dynamically!
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "FCM Token registered successfully",
    });
  } catch (error) {
    console.error("Error in registerFcmToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🚀 Updates the user's notification preferences (mute controls).
 */
export async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const { dms, groups, mentions } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        notificationPreferences: { dms, groups, mentions },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      preferences: updatedUser.notificationPreferences,
    });
  } catch (error) {
    console.error("Error in updatePreferences controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
