import { generateStreamToken } from "../lib/stream.js";
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
    // Count messages sent to the current user that are not read
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      isRead: false
    });
    
    res.status(200).json({ count });
  } catch (error) {
    console.log("Error in getUnseenMessagesCount controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUnseenMessagesPerUser(req, res) {
  try {
    // Get count of unseen messages per sender for the current user
    const unseenMessages = await Message.aggregate([
      {
        $match: {
          receiverId: req.user.id,
          isRead: false
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert to object with senderId as key
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
      message
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
    const receiverId = req.user.id;

    await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { isRead: true }
    );
    
    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
