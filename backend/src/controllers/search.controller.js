import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Group from "../models/Group.js";

/**
 * 🚀 Horizontally Scalable Unified Multi-Domain Search Engine
 * Implements strict security policies, text index scoring, and pagination.
 */
export async function unifiedSearch(req, res) {
  try {
    const userId = req.user.id;
    const { q, type = "all", limit = 20, page = 1 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search query 'q' is required" });
    }

    const searchQuery = q.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const results = {};

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Resolve User groups list to secure Group-Message boundaries
    const myGroups = await Group.find({
      members: {
        $elemMatch: {
          userId: userObjectId,
          status: "active"
        }
      }
    }).select("_id");
    const myGroupIds = myGroups.map((g) => `group-${g._id.toString()}`);

    // ----- A. USER SEARCH DOMAIN -----
    if (type === "all" || type === "users") {
      results.users = await User.find({
        fullName: { $regex: searchQuery, $options: "i" },
        _id: { $ne: userObjectId } // Exclude self
      })
        .select("fullName profilePic bio location")
        .limit(parseInt(limit));
    }

    // ----- B. GROUP SEARCH DOMAIN -----
    if (type === "all" || type === "groups") {
      results.groups = await Group.find({
        name: { $regex: searchQuery, $options: "i" },
        "bannedUsers.userId": { $ne: userObjectId }
      })
        .select("name description avatar members creatorId invitations joinRequests streamChannelId")
        .limit(parseInt(limit));
    }

    // ----- C. MESSAGE SEARCH DOMAIN -----
    if (type === "all" || type === "messages") {
      // Find messages using Mongo Text Search Index with strict security checks
      results.messages = await Message.find({
        $text: { $search: searchQuery },
        isDeleted: false,
        deletedForUsers: { $ne: userId },
        $or: [
          { senderId: userId },
          { receiverId: userId },
          { receiverId: { $in: myGroupIds } } // Security check: Only show group messages if member!
        ]
      })
        .populate("senderId", "fullName profilePic")
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    res.status(200).json({
      success: true,
      query: searchQuery,
      results
    });
  } catch (error) {
    console.error("Error in unifiedSearch controller:", error.message);
    res.status(500).json({ message: "Search operation failed: " + error.message });
  }
}
