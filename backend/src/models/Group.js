import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    streamChannelId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    avatar: {
      type: String,
      default: ""
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member"
        },
        status: {
          type: String,
          enum: ["active", "left", "banned"],
          default: "active"
        },
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    invitations: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        invitedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    joinRequests: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        requestedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    bannedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        bannedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        bannedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    pinnedMessages: [
      {
        messageId: {
          type: String,
          required: true
        },
        pinnedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        pinnedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

// High-efficiency compound indexes to fetch user group lists instantly
groupSchema.index({ "members.userId": 1 });

const Group = mongoose.model("Group", groupSchema);
export default Group;
