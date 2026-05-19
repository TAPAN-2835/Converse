import crypto from "crypto";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import { streamClient } from "../lib/stream.js";
import User from "../models/User.js";
import { notificationService } from "../lib/notification.js";

/**
 * Helper to generate a Mongoose polymorphic query that checks both ObjectId and streamChannelId.
 */
export function getGroupQuery(groupId) {
  return mongoose.Types.ObjectId.isValid(groupId)
    ? { _id: groupId }
    : { streamChannelId: groupId };
}

/**
 * Real-time socket broadcaster to keep all active group members perfectly in sync.
 */
export function broadcastToGroupMembers(group, eventName, payload) {
  if (global.io && group && group.members) {
    group.members.forEach((m) => {
      // Emit to all active members to update their UI instantly
      if (m.status === "active") {
        const userIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
        console.log(`Broadcasting real-time event '${eventName}' to active member user:${userIdStr}`);
        global.io.to(`user:${userIdStr}`).emit(eventName, payload);
      }
    });
  }
}

/**
 * Helper to authoritatively synchronize MongoDB group membership with the Stream Chat channel state.
 */
export async function syncStreamGroupState(group) {
  try {
    const activeUserIds = group.members
      .filter((m) => m.status === "active")
      .map((m) => m.userId?._id ? m.userId._id.toString() : m.userId.toString());

    // Fallback: creator is always active member in Stream channel
    const creatorIdStr = group.creatorId?._id ? group.creatorId._id.toString() : group.creatorId.toString();
    if (!activeUserIds.includes(creatorIdStr)) {
      activeUserIds.push(creatorIdStr);
    }

    const channel = streamClient.channel("messaging", group.streamChannelId);
    const queryResponse = await channel.query();
    const currentStreamUserIds = Object.keys(queryResponse.members || {});

    const toAdd = activeUserIds.filter((id) => !currentStreamUserIds.includes(id));
    const toRemove = currentStreamUserIds.filter((id) => !activeUserIds.includes(id));

    if (toAdd.length > 0) {
      await channel.addMembers(toAdd);
    }
    if (toRemove.length > 0) {
      await channel.removeMembers(toRemove);
    }
    console.log(`Stream sync for group ${group.name} (${group.streamChannelId}) completed. Added: ${toAdd.length}, Removed: ${toRemove.length}`);
  } catch (error) {
    console.error("Failed to synchronize Stream channel state with MongoDB:", error.message);
  }
}

/**
 * Creates a brand new secure, roles-enforced group chat.
 */
export async function createGroup(req, res) {
  try {
    const { name, description, avatar, memberIds = [] } = req.body;
    const creatorId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Initial members are immediately active (to solve visibility bugs)
    const membersList = [
      { userId: creatorId, role: "admin", status: "active" },
      ...memberIds.map((id) => ({ userId: id, role: "member", status: "active" })),
    ];

    const groupAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    // 1. Persist initial Group inside MongoDB to secure the unique primary key ID
    const newGroup = new Group({
      streamChannelId: "temp-placeholder",
      name,
      description: description || "",
      avatar: groupAvatar,
      creatorId,
      members: membersList,
      invitations: [],
      joinRequests: [],
      bannedUsers: [],
      pinnedMessages: [],
    });
    await newGroup.save();

    // 2. Set authoritative, standard streamChannelId based on MongoDB _id
    const streamChannelId = `group-${newGroup._id.toString()}`;
    newGroup.streamChannelId = streamChannelId;
    await newGroup.save();

    // 3. Create GetStream channel containing all initial members
    const allStreamUserIds = [creatorId, ...memberIds].map((id) => id.toString());
    const channel = streamClient.channel("messaging", streamChannelId, {
      name,
      image: groupAvatar,
      created_by_id: creatorId.toString(),
      members: allStreamUserIds,
    });
    await channel.create();

    // Populate members for frontend payload
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    // Real-time broadcast to all added active users
    broadcastToGroupMembers(populatedGroup, "group.created", populatedGroup);
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(201).json({
      success: true,
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in createGroup:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Retrieves all groups where the authenticated user is an active member.
 */
export async function getUserGroups(req, res) {
  try {
    const userId = req.user.id;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const groups = await Group.find({
      $or: [
        {
          members: {
            $elemMatch: {
              userId: userObjectId,
              status: "active"
            }
          }
        },
        {
          invitations: {
            $elemMatch: {
              userId: userObjectId
            }
          }
        }
      ]
    })
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic")
      .populate("invitations.userId", "fullName profilePic")
      .populate("joinRequests.userId", "fullName profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("Error in getUserGroups:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Retrieves a single group's full metadata, including pending invites and requests.
 */
export async function getGroupById(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId))
      .populate("members.userId", "fullName profilePic bio location")
      .populate("invitations.userId", "fullName profilePic")
      .populate("joinRequests.userId", "fullName profilePic")
      .populate("bannedUsers.userId", "fullName profilePic")
      .populate("creatorId", "fullName profilePic");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify if caller is an active member, invited, or the creator
    const isActiveMember = group.members.some((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId?.toString();
      return memberId === userId.toString() && m.status === "active";
    });
    const isInvited = group.invitations.some((i) => {
      const inviteId = i.userId?._id ? i.userId._id.toString() : i.userId?.toString();
      return inviteId === userId.toString();
    });
    const isCreator = (group.creatorId?._id ? group.creatorId._id.toString() : group.creatorId.toString()) === userId.toString();

    if (!isActiveMember && !isInvited && !isCreator) {
      return res.status(403).json({ message: "Access Denied: You are not a member of this group" });
    }

    res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("Error in getGroupById:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Invites a user to a group (Admin Restricted). Stored in the pending invitations array.
 */
export async function inviteMember(req, res) {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // 1. Roles Check: Must be admin
    const callerMember = group.members.find((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberId === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only group administrators can invite new members" });
    }

    // 2. Already active member check
    const isAlreadyMember = group.members.some((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberId === userId.toString() && m.status === "active";
    });
    if (isAlreadyMember) {
      return res.status(400).json({ message: "User is already an active member of this group" });
    }

    // 3. User Banned check
    const isBanned = group.bannedUsers.some((u) => {
      const bannedId = u.userId?._id ? u.userId._id.toString() : u.userId.toString();
      return bannedId === userId.toString();
    });
    if (isBanned) {
      return res.status(400).json({ message: "This user is currently banned from this group" });
    }

    // 4. Duplicate invitation check
    const isAlreadyInvited = group.invitations.some((i) => {
      const inviteeId = i.userId?._id ? i.userId._id.toString() : i.userId.toString();
      return inviteeId === userId.toString();
    });
    if (isAlreadyInvited) {
      return res.status(400).json({ message: "An invitation has already been sent to this user" });
    }

    group.invitations.push({
      userId,
      invitedBy: callerId,
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("invitations.userId", "fullName profilePic")
      .populate("joinRequests.userId", "fullName profilePic")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    // Create and dispatch real-time/database notification
    await notificationService.createAndSendNotification({
      recipientId: userId,
      senderId: callerId,
      type: "group_invite",
      title: "Group Invitation",
      body: `You have been invited to join the group "${group.name}".`,
      groupChannelId: group.streamChannelId,
      payload: {
        groupId: group._id.toString(),
        groupName: group.name,
      },
    }).catch((err) => console.error("Realtime group invitation notification dispatch failed:", err));

    // Socket alert to specific invited user so their notifications page syncs instantly
    if (global.io) {
      global.io.to(`user:${userId}`).emit("group.invite_received", populatedGroup);
    }

    res.status(200).json({
      success: true,
      message: "Invitation sent successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in inviteMember:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Accepts a pending group invitation. User joins the group, status is set to active.
 */
export async function acceptInvite(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const inviteIndex = group.invitations.findIndex((i) => {
      const inviteeId = i.userId?._id ? i.userId._id.toString() : i.userId.toString();
      return inviteeId === userId.toString();
    });
    if (inviteIndex === -1) {
      return res.status(400).json({ message: "No pending invitation found for this group" });
    }

    group.invitations.splice(inviteIndex, 1);

    const existingMemberIndex = group.members.findIndex((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberId === userId.toString();
    });
    if (existingMemberIndex !== -1) {
      group.members[existingMemberIndex].status = "active";
      group.members[existingMemberIndex].role = "member";
      group.members[existingMemberIndex].joinedAt = new Date();
    } else {
      group.members.push({
        userId,
        role: "member",
        status: "active",
      });
    }

    await group.save();
    await syncStreamGroupState(group);

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.memberAdded", populatedGroup);
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in acceptInvite:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Rejects a pending group invitation. Invitation is removed.
 */
export async function rejectInvite(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const inviteIndex = group.invitations.findIndex((i) => {
      const inviteeId = i.userId?._id ? i.userId._id.toString() : i.userId.toString();
      return inviteeId === userId.toString();
    });
    if (inviteIndex === -1) {
      return res.status(400).json({ message: "No pending invitation found for this group" });
    }

    group.invitations.splice(inviteIndex, 1);
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Invitation rejected successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in rejectInvite:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Request to join a public/restricted group. Stored in joinRequests array.
 */
export async function requestJoin(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isBanned = group.bannedUsers.some((u) => {
      const bannedId = u.userId?._id ? u.userId._id.toString() : u.userId.toString();
      return bannedId === userId.toString();
    });
    if (isBanned) {
      return res.status(403).json({ message: "Access Denied: You are banned from joining this group" });
    }

    const isAlreadyMember = group.members.some((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberId === userId.toString() && m.status === "active";
    });
    if (isAlreadyMember) {
      return res.status(400).json({ message: "You are already a member of this group" });
    }

    const isAlreadyRequested = group.joinRequests.some((r) => {
      const requesterId = r.userId?._id ? r.userId._id.toString() : r.userId.toString();
      return requesterId === userId.toString();
    });
    if (isAlreadyRequested) {
      return res.status(400).json({ message: "Join request is already pending approval" });
    }

    group.joinRequests.push({ userId });
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("joinRequests.userId", "fullName profilePic")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Join request submitted successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in requestJoin:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Approves a pending join request (Admin Restricted). User becomes an active member.
 */
export async function approveRequest(req, res) {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberId === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can approve join requests" });
    }

    const requestIndex = group.joinRequests.findIndex((r) => {
      const requesterId = r.userId?._id ? r.userId._id.toString() : r.userId.toString();
      return requesterId === userId.toString();
    });
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No pending join request found for this user" });
    }

    group.joinRequests.splice(requestIndex, 1);

    const existingMemberIndex = group.members.findIndex((m) => {
      const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberId === userId.toString();
    });
    if (existingMemberIndex !== -1) {
      group.members[existingMemberIndex].status = "active";
      group.members[existingMemberIndex].role = "member";
      group.members[existingMemberIndex].joinedAt = new Date();
    } else {
      group.members.push({
        userId,
        role: "member",
        status: "active",
      });
    }

    await group.save();
    await syncStreamGroupState(group);

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.memberAdded", populatedGroup);
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Join request approved successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in approveRequest:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Directly adds a new member (Admin Restricted, maps to /api/groups/:id/add-member).
 */
export async function addGroupMemberDirect(req, res) {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can add members directly" });
    }

    const isAlreadyMember = group.members.some((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === userId.toString() && m.status === "active";
    });
    if (isAlreadyMember) {
      return res.status(400).json({ message: "User is already an active member of this group" });
    }

    const memberIndex = group.members.findIndex((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === userId.toString();
    });
    if (memberIndex !== -1) {
      group.members[memberIndex].status = "active";
      group.members[memberIndex].role = "member";
      group.members[memberIndex].joinedAt = new Date();
    } else {
      group.members.push({
        userId,
        role: "member",
        status: "active",
      });
    }

    await group.save();
    await syncStreamGroupState(group);

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.memberAdded", populatedGroup);
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Member added successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in addGroupMemberDirect:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Removes or expels a user from the group (Admin Restricted, maps to /api/groups/:id/remove-member).
 */
export async function removeGroupMember(req, res) {
  try {
    const { groupId } = req.params;
    const { userId } = req.body || req.params; // support parameters and body triggers
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can remove group members" });
    }

    const creatorIdStr = group.creatorId?._id ? group.creatorId._id.toString() : group.creatorId.toString();
    if (userId.toString() === creatorIdStr) {
      return res.status(400).json({ message: "The group creator cannot be removed" });
    }
    if (userId.toString() === callerId.toString()) {
      return res.status(400).json({ message: "You cannot remove yourself. Please use the leave endpoint" });
    }

    const memberIndex = group.members.findIndex((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === userId.toString();
    });
    if (memberIndex === -1 || group.members[memberIndex].status !== "active") {
      return res.status(400).json({ message: "User is not an active member of this group" });
    }

    group.members[memberIndex].status = "left";
    await group.save();
    await syncStreamGroupState(group);

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    // Real-time broadcast to all members (including the expelled member so their sidebar instantly refreshes)
    broadcastToGroupMembers(populatedGroup, "group.memberRemoved", { groupId: group._id, userId });
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    // Explicit emit to the expelled user room in case they're no longer in group active lists
    if (global.io) {
      global.io.to(`user:${userId}`).emit("group.memberRemoved", { groupId: group._id, userId });
    }

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in removeGroupMember:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Updates group name, description, or cover avatar (Admin Restricted, maps to PATCH /api/groups/:id/update).
 */
export async function updateGroup(req, res) {
  try {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can edit group settings" });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar) group.avatar = avatar;

    await group.save();

    // Partial Update in GetStream layer
    const channel = streamClient.channel("messaging", group.streamChannelId);
    await channel.updatePartial({
      set: {
        name: group.name,
        image: group.avatar,
      }
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Group settings updated successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in updateGroup:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Authenticated user leaves the group channel (maps to POST /api/groups/:id/leave).
 */
export async function leaveGroup(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const memberIndex = group.members.findIndex((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === userId.toString() && m.status === "active";
    });
    if (memberIndex === -1) {
      return res.status(400).json({ message: "You are not an active member of this group" });
    }

    // Nominate another admin before creator leaves
    const creatorIdStr = group.creatorId?._id ? group.creatorId._id.toString() : group.creatorId.toString();
    if (creatorIdStr === userId.toString()) {
      const activeAdmins = group.members.filter((m) => {
        const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
        return m.role === "admin" && m.status === "active" && memberIdStr !== userId.toString();
      });
      if (activeAdmins.length === 0) {
        return res.status(400).json({ message: "As creator, you must promote another member to Admin before leaving" });
      }
    }

    group.members[memberIndex].status = "left";
    await group.save();
    await syncStreamGroupState(group);

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.memberRemoved", { groupId: group._id, userId });
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    // Explicit emit to the leaving user room so their sidebar updates immediately
    if (global.io) {
      global.io.to(`user:${userId}`).emit("group.memberRemoved", { groupId: group._id, userId });
    }

    res.status(200).json({
      success: true,
      message: "You have left the group successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in leaveGroup:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Deletes the group entirely in both MongoDB and GetStream (Creator Only, maps to DELETE /api/groups/:id/delete).
 */
export async function deleteGroup(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const creatorIdStr = group.creatorId?._id ? group.creatorId._id.toString() : group.creatorId.toString();
    if (creatorIdStr !== userId.toString()) {
      return res.status(403).json({ message: "Only the group creator can delete this group" });
    }

    // Real-time notification to all active members before deleting
    broadcastToGroupMembers(group, "group.deleted", { groupId: group._id });

    // 1. Delete GetStream channel
    const channel = streamClient.channel("messaging", group.streamChannelId);
    await channel.delete();

    // 2. Delete MongoDB Document
    await Group.deleteOne({ _id: group._id });

    res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteGroup:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Promotes a member to administrator role (Admin Restricted).
 */
export async function promoteToAdmin(req, res) {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only active administrators can promote members" });
    }

    const memberIndex = group.members.findIndex((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === userId.toString() && m.status === "active";
    });
    if (memberIndex === -1) {
      return res.status(400).json({ message: "User is not an active member of this group" });
    }

    group.members[memberIndex].role = "admin";
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.role_changed", populatedGroup);
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Member successfully promoted to Administrator",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in promoteToAdmin:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Demotes an administrator back to member role (Admin Restricted).
 */
export async function demoteFromAdmin(req, res) {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const callerId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === callerId.toString() && m.status === "active";
    });
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only active administrators can demote members" });
    }

    const creatorIdStr = group.creatorId?._id ? group.creatorId._id.toString() : group.creatorId.toString();
    if (userId.toString() === creatorIdStr) {
      return res.status(400).json({ message: "The group creator cannot be demoted" });
    }

    const memberIndex = group.members.findIndex((m) => {
      const memberIdStr = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
      return memberIdStr === userId.toString() && m.status === "active";
    });
    if (memberIndex === -1) {
      return res.status(400).json({ message: "User is not an active member of this group" });
    }

    group.members[memberIndex].role = "member";
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.role_changed", populatedGroup);
    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Administrator successfully demoted to standard Member",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in demoteFromAdmin:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Pins a message inside the group (Active Member Restricted).
 */
export async function pinGroupMessage(req, res) {
  try {
    const { groupId } = req.params;
    const { messageId } = req.body;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some((m) => m.userId.toString() === userId.toString() && m.status === "active");
    if (!isMember) {
      return res.status(403).json({ message: "Only active members can pin messages" });
    }

    const alreadyPinned = group.pinnedMessages.some((p) => p.messageId === messageId);
    if (alreadyPinned) {
      return res.status(400).json({ message: "Message is already pinned" });
    }

    group.pinnedMessages.push({ messageId, pinnedBy: userId });
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Message pinned successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in pinGroupMessage:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Unpins a message in the group.
 */
export async function unpinGroupMessage(req, res) {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne(getGroupQuery(groupId));
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some((m) => m.userId.toString() === userId.toString() && m.status === "active");
    if (!isMember) {
      return res.status(403).json({ message: "Only active members can unpin messages" });
    }

    group.pinnedMessages = group.pinnedMessages.filter((p) => p.messageId !== messageId);
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "fullName profilePic bio location")
      .populate("creatorId", "fullName profilePic");

    broadcastToGroupMembers(populatedGroup, "group.updated", populatedGroup);

    res.status(200).json({
      success: true,
      message: "Message unpinned successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error in unpinGroupMessage:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
