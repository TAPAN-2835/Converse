import mongoose from "mongoose";
import { generateStreamToken, streamClient } from "../lib/stream.js";
import Message from "../models/Message.js";

export async function getStreamToken(req, res) {
  try {
    const token = generateStreamToken(req.user.id);
    res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUnseenMessagesCount(req, res) {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      isRead: false,
      isDeleted: false,
      deletedForUsers: { $ne: req.user.id }
    });
    res.status(200).json({ count });
  } catch (error) {
    console.log("Error in getUnseenMessagesCount controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUnseenMessagesPerUser(req, res) {
  try {
    const unseenMessages = await Message.aggregate([
      {
        $match: {
          receiverId: req.user.id.toString(), // String type to support unified types
          isRead: false,
          isDeleted: false,
          deletedForUsers: { $ne: new mongoose.Types.ObjectId(req.user.id) }
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const unseenCounts = {};
    unseenMessages.forEach(item => {
      unseenCounts[item._id.toString()] = item.count;
    });
    
    res.status(200).json(unseenCounts);
  } catch (error) {
    console.log("Error in getUnseenMessagesPerUser controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !message) {
      return res.status(400).json({ message: "Receiver ID and message are required" });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      message,
      isRead: false
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function markMessagesAsRead(req, res) {
  try {
    const { senderId } = req.params;
    const userId = req.user.id;

    // Group channels use a string channel ID (e.g. "group-xxxx"), not a MongoDB ObjectId.
    // For groups: mark all unread messages in the channel as read.
    // For DMs: mark messages FROM senderId TO current user as read.
    const isGroup = typeof senderId === "string" && senderId.startsWith("group-");

    if (isGroup) {
      // Mark all messages in this group channel as read for this user
      await Message.updateMany(
        { receiverId: senderId, isRead: false },
        { isRead: true }
      );
    } else {
      // Validate senderId is a valid ObjectId before querying
      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        return res.status(400).json({ message: "Invalid sender ID format" });
      }
      await Message.updateMany(
        { senderId, receiverId: userId.toString(), isRead: false },
        { isRead: true }
      );
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMessagesHistory(req, res) {
  try {
    const { targetUserId, cursor, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ message: "targetUserId is required" });
    }

    // Filter out messages that are soft-deleted or deleted specifically for the current user
    const query = {
      $or: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId }
      ],
      isDeleted: false,
      deletedForUsers: { $ne: userId }
    };

    // If it's a group, search directly by the receiverId matching the targetUserId group channel id
    const isGroup = targetUserId.startsWith("group-");
    if (isGroup) {
      delete query.$or;
      query.receiverId = targetUserId;
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("senderId", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic")
      .populate("parentMessageId"); // Populate parent for replies!

    const hasMore = messages.length === parseInt(limit);
    const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].createdAt : null;

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      nextCursor,
      hasMore
    });
  } catch (error) {
    console.error("Error in getMessagesHistory controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🚀 Distributed Synchronization: Upserts and synchronizes a Stream message event into Mongoose MongoDB
 */
export async function syncStreamMessage(req, res) {
  try {
    const {
      streamMessageId,
      senderId,
      receiverId,
      message,
      attachments = [],
      streamParentId = null,
      createdAt
    } = req.body;

    if (!streamMessageId || !senderId || !receiverId) {
      return res.status(400).json({ message: "Missing required sync properties" });
    }

    // Identify parent reference for reply context
    let parentMessageId = null;
    if (streamParentId) {
      const parentDoc = await Message.findOne({ streamMessageId: streamParentId });
      if (parentDoc) {
        parentMessageId = parentDoc._id;
      }
    }

    // Clean upsert with unique streamMessageId
    const syncedMessage = await Message.findOneAndUpdate(
      { streamMessageId },
      {
        senderId,
        receiverId,
        message: message || "",
        attachments,
        parentMessageId,
        streamParentId,
        isRead: true,
        createdAt: createdAt ? new Date(createdAt) : new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: syncedMessage
    });
  } catch (error) {
    console.error("Error in syncStreamMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🚀 Edits a message in both Mongoose and the GetStream server authority.
 */
export async function editStreamMessage(req, res) {
  try {
    const { streamMessageId } = req.params;
    const { newMessage } = req.body;
    const userId = req.user.id;

    if (!newMessage) {
      return res.status(400).json({ message: "New message content is required" });
    }

    const messageDoc = await Message.findOne({ streamMessageId });
    if (!messageDoc) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Security Check: Sender validation
    if (messageDoc.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the sender can edit this message" });
    }

    // 1. Authoritative Stream server update (propels websocket event to watchers)
    await streamClient.updateMessage({
      id: streamMessageId,
      text: newMessage,
      is_edited: true
    });

    // 2. Persist in local MongoDB
    messageDoc.message = newMessage;
    messageDoc.isEdited = true;
    await messageDoc.save();

    res.status(200).json({
      success: true,
      message: messageDoc
    });
  } catch (error) {
    console.error("Error in editStreamMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🚀 Deletes a message (soft deletion strategy for audit trails).
 */
export async function deleteStreamMessage(req, res) {
  try {
    const { streamMessageId } = req.params;
    const { deleteType = "everyone" } = req.body; // "everyone" | "me"
    const userId = req.user.id;

    const messageDoc = await Message.findOne({ streamMessageId });
    if (!messageDoc) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (deleteType === "everyone") {
      // Security Check: Only sender can delete for everyone
      if (messageDoc.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Only the sender can delete this message for everyone" });
      }

      // 1. Authoritative Stream server delete (triggers message.deleted event)
      await streamClient.deleteMessage(streamMessageId, { hard: false });

      // 2. Soft deletion update in Mongoose
      messageDoc.isDeleted = true;
      await messageDoc.save();
    } else {
      // Delete type: "me" (soft deletion only for current user)
      if (!messageDoc.deletedForUsers.includes(userId)) {
        messageDoc.deletedForUsers.push(userId);
        await messageDoc.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Message successfully deleted"
    });
  } catch (error) {
    console.error("Error in deleteStreamMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
