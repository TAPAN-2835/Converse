import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getUnseenMessagesCount() {
  try {
    const response = await axiosInstance.get("/chat/unseen-count");
    return response.data;
  } catch (error) {
    console.log("Error in getUnseenMessagesCount:", error);
    return { count: 0 };
  }
}

export async function getUnseenMessagesPerUser() {
  try {
    const response = await axiosInstance.get("/chat/unseen-per-user");
    return response.data;
  } catch (error) {
    console.log("Error in getUnseenMessagesPerUser:", error);
    return {};
  }
}

export async function sendMessage(messageData) {
  const response = await axiosInstance.post("/chat/send", messageData);
  return response.data;
}

export async function markMessagesAsRead(senderId) {
  const response = await axiosInstance.put(`/chat/mark-read/${senderId}`);
  return response.data;
}

export const forgotPassword = async (data) => {
  const response = await axiosInstance.post("/auth/forgot-password", data);
  return response.data;
};

export const verifyResetOtp = async (data) => {
  const response = await axiosInstance.post("/auth/verify-reset-otp", data);
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await axiosInstance.post("/auth/reset-password", data);
  return response.data;
};

export const addReactionToBackend = async (reactionData) => {
  const response = await axiosInstance.post("/chat/reactions", reactionData);
  return response.data;
};

export const removeReactionFromBackend = async (reactionData) => {
  const response = await axiosInstance.post("/chat/reactions/remove", reactionData);
  return response.data;
};

export const uploadAttachment = async (file) => {
  const formData = new FormData();
  const rawFile = file.file || file;
  formData.append("file", rawFile);

  const response = await axiosInstance.post("/chat/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getMessagesHistoryFromBackend = async (targetUserId, cursor = "", limit = 20) => {
  const response = await axiosInstance.get(`/chat/history`, {
    params: {
      targetUserId,
      cursor,
      limit
    }
  });
  return response.data;
};

export const createGroupInBackend = async (groupData) => {
  const response = await axiosInstance.post("/groups", groupData);
  return response.data;
};

export const getUserGroupsFromBackend = async () => {
  const response = await axiosInstance.get("/groups/my");
  return response.data;
};

export const addGroupMemberInBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/add-member`, { userId });
  return response.data;
};

export const removeGroupMemberFromBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/remove-member`, { userId });
  return response.data;
};

export const updateGroupInBackend = async (groupId, groupData) => {
  const response = await axiosInstance.patch(`/groups/${groupId}/update`, groupData);
  return response.data;
};

export const deleteGroupInBackend = async (groupId) => {
  const response = await axiosInstance.delete(`/groups/${groupId}/delete`);
  return response.data;
};

export const pinMessageInBackend = async (groupId, messageId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/pins`, { messageId });
  return response.data;
};

export const unpinMessageFromBackend = async (groupId, messageId) => {
  const response = await axiosInstance.delete(`/groups/${groupId}/pins/${messageId}`);
  return response.data;
};

export const getGroupByIdFromBackend = async (groupId) => {
  const response = await axiosInstance.get(`/groups/${groupId}`);
  return response.data;
};

export const inviteMemberInBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/invite`, { userId });
  return response.data;
};

export const acceptInviteInBackend = async (groupId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/accept-invite`);
  return response.data;
};

export const rejectInviteInBackend = async (groupId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/reject-invite`);
  return response.data;
};

export const requestJoinInBackend = async (groupId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/request-join`);
  return response.data;
};

export const approveRequestInBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/approve-request`, { userId });
  return response.data;
};

export const removeMemberInBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/remove-member`, { userId });
  return response.data;
};

export const leaveGroupInBackend = async (groupId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/leave`);
  return response.data;
};

export const promoteToAdminInBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/promote`, { userId });
  return response.data;
};

export const demoteFromAdminInBackend = async (groupId, userId) => {
  const response = await axiosInstance.post(`/groups/${groupId}/demote`, { userId });
  return response.data;
};

export const syncMessageToBackend = async (messageData) => {
  const response = await axiosInstance.post("/chat/message/sync", messageData);
  return response.data;
};

export const editMessageInBackend = async (streamMessageId, newMessage) => {
  const response = await axiosInstance.put(`/chat/message/${streamMessageId}`, { newMessage });
  return response.data;
};

export const deleteMessageInBackend = async (streamMessageId, deleteType = "everyone") => {
  const response = await axiosInstance.post(`/chat/message/${streamMessageId}/delete`, { deleteType });
  return response.data;
};

export const getNotificationsFromBackend = async () => {
  const response = await axiosInstance.get("/users/notifications");
  return response.data;
};

export const markNotificationsAsReadInBackend = async (notificationIds = []) => {
  const response = await axiosInstance.put("/users/notifications/read", { notificationIds });
  return response.data;
};

export const registerFcmTokenInBackend = async (fcmToken) => {
  const response = await axiosInstance.post("/users/notifications/fcm-token", { fcmToken });
  return response.data;
};

export const updateNotificationPreferencesInBackend = async (prefs) => {
  const response = await axiosInstance.put("/users/notifications/preferences", prefs);
  return response.data;
};

export const searchConverse = async (query, type = "all") => {
  const response = await axiosInstance.get(`/search?q=${encodeURIComponent(query)}&type=${type}`);
  return response.data;
};
