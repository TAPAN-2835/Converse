import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["friend_request", "friend_accept", "group_invite", "new_message", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },
    groupChannelId: {
      type: String,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// High-performance compound indexes for history pagination and unread counts
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
