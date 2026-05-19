import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: String, // Handles both peer user ID and group streamChannelId!
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    streamMessageId: {
      type: String,
      sparse: true,
      index: true,
    },
    attachments: [
      {
        type: String,
      },
    ],
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },
    streamParentId: {
      type: String,
      default: null,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedForUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ message: "text" }); // 🚀 Scalable MongoDB Text Search Indexing

const Message = mongoose.model("Message", messageSchema);
export default Message;