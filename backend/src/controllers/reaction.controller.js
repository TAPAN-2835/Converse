import Message from "../models/Message.js";
import { streamClient } from "../lib/stream.js";

/**
 * Persists an emoji reaction added by a user in MongoDB.
 * Uses atomic updates to prevent race conditions.
 * After DB persistence, triggers the authoritative Stream server-side API to sync watchers.
 */
export async function addReaction(req, res) {
  try {
    const { streamMessageId, messageText, senderId, receiverId, emoji } = req.body;
    const userId = req.user.id;

    if (!streamMessageId || !emoji) {
      return res.status(400).json({ message: "streamMessageId and emoji are required" });
    }

    // Find message or create one (Upsert Strategy)
    let messageDoc = await Message.findOne({ streamMessageId });

    if (!messageDoc) {
      console.log(`Message doc not found for streamMessageId ${streamMessageId}. Creating fallback record...`);
      messageDoc = new Message({
        senderId: senderId || userId,
        receiverId: receiverId || userId, // Fallback if direct not specified
        message: messageText || "Stream Message",
        streamMessageId,
        isRead: true,
        reactions: []
      });
      await messageDoc.save();
    }

    // Prevent duplicate reactions by checking local list
    const hasAlreadyReacted = messageDoc.reactions.some(
      (r) => r.userId.toString() === userId && r.emoji === emoji
    );

    if (hasAlreadyReacted) {
      return res.status(400).json({ message: "You have already reacted to this message with this emoji" });
    }

    // Atomic $push
    await Message.updateOne(
      { streamMessageId },
      {
        $push: {
          reactions: {
            userId,
            emoji,
            createdAt: new Date()
          }
        }
      }
    );

    // Fetch the updated reactions list
    const updatedMsg = await Message.findOne({ streamMessageId }).populate("reactions.userId", "fullName profilePic");

    // Authoritative Server-Side Stream Sync
    const channelId = [messageDoc.senderId.toString(), messageDoc.receiverId.toString()].sort().join("-");
    console.log(`Syncing reaction add on GetStream server for channel: ${channelId}`);
    
    const channel = streamClient.channel("messaging", channelId);
    await channel.sendReaction(streamMessageId, { type: emoji }, { user_id: userId });

    res.status(200).json({
      success: true,
      reactions: updatedMsg.reactions
    });
  } catch (error) {
    console.error("Error in addReaction controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Removes an emoji reaction from MongoDB.
 * After local MongoDB update, deletes it from GetStream server.
 */
export async function removeReaction(req, res) {
  try {
    const { streamMessageId, emoji } = req.body;
    const userId = req.user.id;

    if (!streamMessageId || !emoji) {
      return res.status(400).json({ message: "streamMessageId and emoji are required" });
    }

    const messageDoc = await Message.findOne({ streamMessageId });

    if (!messageDoc) {
      return res.status(404).json({ message: "Message not found in backend fallback" });
    }

    // Atomic $pull
    await Message.updateOne(
      { streamMessageId },
      {
        $pull: {
          reactions: {
            userId,
            emoji
          }
        }
      }
    );

    const updatedMsg = await Message.findOne({ streamMessageId }).populate("reactions.userId", "fullName profilePic");

    // Authoritative Server-Side Stream Sync for deletion
    const channelId = [messageDoc.senderId.toString(), messageDoc.receiverId.toString()].sort().join("-");
    console.log(`Syncing reaction remove on GetStream server for channel: ${channelId}`);
    
    const channel = streamClient.channel("messaging", channelId);
    await channel.deleteReaction(streamMessageId, emoji, userId);

    res.status(200).json({
      success: true,
      reactions: updatedMsg ? updatedMsg.reactions : []
    });
  } catch (error) {
    console.error("Error in removeReaction controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
