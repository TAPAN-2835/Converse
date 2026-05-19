import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import { 
  getStreamToken, 
  addReactionToBackend, 
  removeReactionFromBackend, 
  uploadAttachment,
  getGroupByIdFromBackend,
  inviteMemberInBackend,
  acceptInviteInBackend,
  rejectInviteInBackend,
  requestJoinInBackend,
  approveRequestInBackend,
  removeMemberInBackend,
  leaveGroupInBackend,
  promoteToAdminInBackend,
  demoteFromAdminInBackend,
  getUserFriends,
  updateGroupInBackend,
  deleteGroupInBackend,
  addGroupMemberInBackend
} from "../lib/api";
import VirtualizedMessageList from "../components/VirtualizedMessageList";
import { 
  Reply, 
  Users, 
  Shield, 
  Crown, 
  UserPlus, 
  UserMinus, 
  LogOut, 
  Check, 
  X, 
  Video, 
  Lock, 
  MessageSquare, 
  ArrowLeft,
  Settings,
  ShieldCheck,
  UserX,
  Edit2,
  Trash2,
  Save,
  RotateCw
} from "lucide-react";

import {
  Channel,
  Chat,
  MessageInput,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: targetUserId, type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [directAddUserId, setDirectAddUserId] = useState("");

  // Editing Settings state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const { authUser } = useAuthUser();
  const isGroup = type === "group" || (type === undefined && targetUserId?.startsWith("group-"));

  // Check navigation state to automatically pop settings panel
  useEffect(() => {
    if (location.state?.openSettings) {
      setShowAdminPanel(true);
    }
  }, [location.state]);

  // Stream Token Query
  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Group Details Query (MongoDB Authority)
  const { data: groupDetailsData, refetch: refetchGroupDetails, isLoading: loadingGroupDetails, error: groupError } = useQuery({
    queryKey: ["groupDetails", targetUserId],
    queryFn: () => getGroupByIdFromBackend(targetUserId),
    enabled: !!targetUserId && isGroup,
    retry: false,
  });

  // User's Friends Query for Group Invitation and direct add selection
  const { data: friendsList = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser && isGroup,
  });

  const groupInfo = groupDetailsData?.group;

  // Initialize editing inputs with current values
  useEffect(() => {
    if (groupInfo) {
      setEditName(groupInfo.name || "");
      setEditDesc(groupInfo.description || "");
      setEditAvatar(groupInfo.avatar || "");
    }
  }, [groupInfo]);

  // Resolve current membership state safely for both populated and unpopulated cases
  const myMemberState = groupInfo?.members?.find((m) => {
    const memberId = m.userId?._id ? m.userId._id.toString() : m.userId?.toString();
    return memberId === authUser?._id?.toString();
  });
  const isActiveMember = myMemberState?.status === "active";
  const myRole = myMemberState?.role || "member";
  const isAdmin = myRole === "admin";
  const isCreator = groupInfo?.creatorId?._id?.toString() === authUser?._id?.toString();

  // Invite Member Mutation
  const inviteMutation = useMutation({
    mutationFn: ({ userId }) => inviteMemberInBackend(groupInfo._id, userId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Invitation sent successfully!");
      setInviteUserId("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send invitation");
    }
  });

  // Direct Add Member Mutation
  const addDirectMemberMutation = useMutation({
    mutationFn: (userId) => addGroupMemberInBackend(groupInfo._id, userId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Member added directly!");
      setDirectAddUserId("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to add member");
    }
  });

  // Remove/Expel Member Mutation
  const expelMutation = useMutation({
    mutationFn: (userId) => removeMemberInBackend(groupInfo._id, userId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Member expelled successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  });

  // Update Settings Mutation
  const updateGroupMutation = useMutation({
    mutationFn: (updatedData) => updateGroupInBackend(groupInfo._id, updatedData),
    onSuccess: () => {
      refetchGroupDetails();
      setIsEditingSettings(false);
      toast.success("Group settings updated!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update settings");
    }
  });

  // Delete Group Mutation
  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteGroupInBackend(groupInfo._id),
    onSuccess: () => {
      toast.success("Group deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete group");
    }
  });

  // Promote to Admin Mutation
  const promoteMutation = useMutation({
    mutationFn: (userId) => promoteToAdminInBackend(groupInfo._id, userId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Member promoted to Administrator");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to promote member");
    }
  });

  // Demote Admin Mutation
  const demoteMutation = useMutation({
    mutationFn: (userId) => demoteFromAdminInBackend(groupInfo._id, userId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Administrator demoted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to demote admin");
    }
  });

  // Leave Group Mutation
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroupInBackend(groupInfo._id),
    onSuccess: () => {
      toast.success("You have left the group");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to leave group");
    }
  });

  // Join Request Mutation (if user has no invite but wants to join)
  const requestJoinMutation = useMutation({
    mutationFn: () => requestJoinInBackend(targetUserId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Join request submitted successfully. Awaiting admin approval.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit join request");
    }
  });

  // Accept Invitation Mutation
  const acceptInviteMutation = useMutation({
    mutationFn: () => acceptInviteInBackend(groupInfo?._id || targetUserId),
    onSuccess: () => {
      toast.success("Welcome! You have successfully joined the group.");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      refetchGroupDetails();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to accept invitation");
    }
  });

  // Reject Invitation Mutation
  const rejectInviteMutation = useMutation({
    mutationFn: () => rejectInviteInBackend(groupInfo?._id || targetUserId),
    onSuccess: () => {
      toast.success("Group invitation rejected.");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reject invitation");
    }
  });

  // Approve Request Mutation
  const approveRequestMutation = useMutation({
    mutationFn: (userId) => approveRequestInBackend(groupInfo._id, userId),
    onSuccess: () => {
      refetchGroupDetails();
      toast.success("Request approved!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to approve request");
    }
  });

  // 1. WebSocket synchronization for multi-member events in real-time
  useEffect(() => {
    if (!groupInfo?._id) return;
    const socketUrl = import.meta.env.MODE === "development" ? "http://localhost:5001" : window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("[ChatPage Socket] Connected.");
    });

    const handleSync = (payload) => {
      const matchId = payload?._id || payload?.groupId;
      if (matchId === groupInfo._id) {
        console.log("[ChatPage Socket] Realtime group status refresh triggered.");
        refetchGroupDetails();
        queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      }
    };

    const handleMemberRemoved = (payload) => {
      if (payload?.groupId === groupInfo._id) {
        if (payload?.userId === authUser?._id) {
          toast.error("You are no longer a member of this group.");
          navigate("/");
        } else {
          refetchGroupDetails();
        }
        queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      }
    };

    const handleGroupDeleted = (payload) => {
      if (payload?.groupId === groupInfo._id) {
        toast.error("This group was deleted by the creator.");
        navigate("/");
        queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      }
    };

    socket.on("group.updated", handleSync);
    socket.on("group.memberAdded", handleSync);
    socket.on("group.memberRemoved", handleMemberRemoved);
    socket.on("group.role_changed", handleSync);
    socket.on("group.deleted", handleGroupDeleted);

    return () => {
      socket.off("group.updated", handleSync);
      socket.off("group.memberAdded", handleSync);
      socket.off("group.memberRemoved", handleMemberRemoved);
      socket.off("group.role_changed", handleSync);
      socket.off("group.deleted", handleGroupDeleted);
      socket.disconnect();
    };
  }, [groupInfo?._id, authUser?._id, refetchGroupDetails, queryClient, navigate]);

  // 2. Stream Channel Watcher initialization
  useEffect(() => {
    if (!tokenData?.token || !authUser || !targetUserId) return;
    if (isGroup && !isActiveMember) return; // Do not initialize Stream if user is not an active group member

    let active = true;
    let currChannel = null;
    let clientInstance = null;

    const initChat = async () => {
      try {
        console.log("Initializing stream chat client...");

        const client = StreamChat.getInstance(STREAM_API_KEY);
        clientInstance = client;

        if (client.userID && client.userID !== authUser._id) {
          console.log("Switching user session: disconnecting old user...");
          await client.disconnectUser();
        }

        if (!client.userID) {
          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          );
        }

        client.uploadImage = async (file) => {
          const response = await uploadAttachment(file);
          return { file: response.file };
        };

        client.uploadFile = async (file) => {
          const response = await uploadAttachment(file);
          return { file: response.file };
        };

        const channelId = isGroup ? targetUserId : [authUser._id, targetUserId].sort().join("-");

        currChannel = isGroup
          ? client.channel("messaging", channelId)
          : client.channel("messaging", channelId, {
              members: [authUser._id, targetUserId],
            });

        await currChannel.watch();

        if (!active) {
          currChannel.stopWatching().catch(err => console.error(err));
          return;
        }

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initChat();

    return () => {
      active = false;
      if (currChannel) {
        currChannel.stopWatching().catch(err => console.error(err));
      }
    };
  }, [tokenData, authUser, targetUserId, isActiveMember, isGroup]);

  const customSendReaction = async (messageId, reactionType) => {
    try {
      await addReactionToBackend({
        streamMessageId: messageId,
        messageText: "Stream Message Attachment",
        senderId: authUser._id,
        receiverId: targetUserId,
        emoji: reactionType,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add reaction");
      throw err;
    }
  };

  const customDeleteReaction = async (messageId, reactionType) => {
    try {
      await removeReactionFromBackend({
        streamMessageId: messageId,
        emoji: reactionType,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove reaction");
      throw err;
    }
  };

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;
      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });
      toast.success("Video call link sent successfully!");
    }
  };

  const customSendMessage = async (message, customMessageData, options) => {
    try {
      const messageData = {
        text: message.text || "",
        attachments: message.attachments || [],
        ...customMessageData
      };

      if (replyingToMessage) {
        const parentId = replyingToMessage.streamMessageId || replyingToMessage._id;
        messageData.parent_id = parentId;
        messageData.custom_parent_id = parentId;
        messageData.parent_text = replyingToMessage.message;
        messageData.parent_sender_name = replyingToMessage.senderId?.fullName || "User";
        setReplyingToMessage(null);
      }

      await channel.sendMessage(messageData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
      throw err;
    }
  };

  const shuffleAvatar = () => {
    const randomSeed = Math.floor(Math.random() * 100000);
    setEditAvatar(`https://api.dicebear.com/7.x/initials/svg?seed=group_${randomSeed}`);
  };

  const saveSettings = () => {
    if (!editName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }
    updateGroupMutation.mutate({
      name: editName,
      description: editDesc,
      avatar: editAvatar
    });
  };

  // Group Invite / Preview View (Before User actually joins the channel)
  if (isGroup && !loadingGroupDetails && !isActiveMember) {
    const isInvited = groupInfo?.invitations?.some((i) => i.userId?._id?.toString() === authUser?._id?.toString());
    const isRequested = groupInfo?.joinRequests?.some((r) => r.userId?._id?.toString() === authUser?._id?.toString());

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-base-100 to-base-200">
        <div className="card w-full max-w-md bg-base-100 border border-base-300 shadow-2xl rounded-3xl p-6 text-center animate-in zoom-in-95 duration-200">
          <div className="avatar w-20 h-20 rounded-full mx-auto mb-4 border-2 border-primary/20 shadow-md overflow-hidden">
            <img src={groupInfo?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=converse`} alt="" className="object-cover w-full h-full" />
          </div>
          <h2 className="text-2xl font-extrabold mb-1">{groupInfo?.name || "Converse Group"}</h2>
          <p className="text-xs opacity-60 mb-4">{groupInfo?.description || "A secure communication group channel."}</p>

          <div className="divider opacity-40">Group Invitation Policy</div>

          {isInvited ? (
            <div className="space-y-4">
              <div className="alert alert-info py-3 text-xs font-semibold rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span>You have a pending invite to join this group.</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => acceptInviteMutation.mutate()} 
                  className="btn btn-primary flex-1 btn-sm rounded-xl"
                  disabled={acceptInviteMutation.isPending}
                >
                  {acceptInviteMutation.isPending && <span className="loading loading-spinner" />}
                  Accept & Join
                </button>
                <button 
                  onClick={() => rejectInviteMutation.mutate()} 
                  className="btn btn-outline btn-error flex-1 btn-sm rounded-xl"
                  disabled={rejectInviteMutation.isPending}
                >
                  Decline
                </button>
              </div>
            </div>
          ) : isRequested ? (
            <div className="space-y-4">
              <div className="alert alert-warning py-3 text-xs font-semibold rounded-xl">
                <span>Join Request submitted! Awaiting administrator approval.</span>
              </div>
              <button onClick={() => navigate("/")} className="btn btn-ghost btn-sm w-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Go back to conversations
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs opacity-75">
                This is a secure group channel. Membership is restricted by roles. Submit a join request to obtain permission.
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => requestJoinMutation.mutate()} 
                  className="btn btn-primary btn-sm rounded-xl gap-2 w-full"
                  disabled={requestJoinMutation.isPending}
                >
                  {requestJoinMutation.isPending && <span className="loading loading-spinner" />}
                  Request to Join Group
                </button>
                <button onClick={() => navigate("/")} className="btn btn-ghost btn-sm w-full gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading || !chatClient || !channel || (isGroup && loadingGroupDetails)) return <ChatLoader />;

  const members = channel ? Object.values(channel.state.members) : [];
  const otherMember = members.find((m) => m.user?.id !== authUser?._id);
  const displayName = isGroup 
    ? (groupInfo?.name || channel?.data?.name || "Group Chat") 
    : (otherMember?.user?.name || otherMember?.user?.id || "Chat Peer");
  const displayAvatar = isGroup 
    ? (groupInfo?.avatar || channel?.data?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupInfo?.name || "converse")}`) 
    : (otherMember?.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherMember?.user?.name || "converse")}`);
  const displaySubtext = isGroup
    ? `${groupInfo?.members?.filter(m => m.status === 'active')?.length || 0} members`
    : (otherMember?.user?.online ? "Online" : "Offline");

  return (
    <div className="h-[93vh] flex overflow-hidden bg-base-100">
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        <Chat client={chatClient} className="custom-chat-bg">
          <Channel
            channel={channel}
            doSendReaction={customSendReaction}
            doDeleteReaction={customDeleteReaction}
            sendMessage={customSendMessage}
          >
            <div className="w-full relative flex-1 flex flex-col h-full overflow-hidden">
              <Window>
                {/* 👑 WHATSAPP / TELEGRAM LEVEL INTEGRATED CUSTOM GLASSMORPHIC CHANNEL HEADER */}
                <div className="w-full h-16 px-4 border-b border-base-300 bg-base-100 flex items-center justify-between shrink-0 z-30 select-none">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Back Button for mobile screens */}
                    <button 
                      onClick={() => navigate("/")} 
                      className="btn btn-ghost btn-circle btn-sm md:hidden text-base-content/75 hover:text-primary transition-colors"
                      title="Back to Chats"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Group/Peer profile trigger to open Info layout */}
                    <div 
                      onClick={isGroup ? () => setShowAdminPanel(!showAdminPanel) : undefined}
                      className={`flex items-center gap-3 min-w-0 ${isGroup ? "cursor-pointer group hover:opacity-90 active:scale-[0.98] transition-all" : ""}`}
                      title={isGroup ? "View Group Details & Settings" : undefined}
                    >
                      <div className="avatar size-10 rounded-full overflow-hidden border border-base-300 shadow-sm shrink-0">
                        <img src={displayAvatar} alt={displayName} className="object-cover w-full h-full" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-150">
                          {displayName}
                        </h4>
                        <p className="text-[10px] opacity-60 truncate font-semibold">
                          {displaySubtext}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions Area */}
                  <div className="flex items-center gap-2">
                    {/* Integrated Video Call Trigger */}
                    <button 
                      onClick={handleVideoCall} 
                      className="btn btn-ghost btn-circle btn-sm text-success hover:bg-success/15 transition-all"
                      title="Start Video Call"
                    >
                      <Video className="w-5 h-5" />
                    </button>

                    {/* Integrated Group settings cog (Only for Groups) */}
                    {isGroup && (
                      <button 
                        onClick={() => setShowAdminPanel(!showAdminPanel)} 
                        className={`btn btn-circle btn-sm transition-all ${showAdminPanel ? 'btn-primary shadow-md' : 'btn-ghost text-base-content/75 hover:text-primary'}`}
                        title="Group Settings & Members"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <VirtualizedMessageList 
                  authUser={authUser} 
                  targetUserId={targetUserId} 
                  onReply={setReplyingToMessage}
                />
                
                {/* Elegant Quote Reply Preview Bar */}
                {replyingToMessage && (
                  <div className="px-4 py-2 border-t border-base-300 bg-base-200/50 backdrop-blur-md flex items-center justify-between z-10 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2 text-xs">
                      <Reply className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-primary">Replying to {replyingToMessage.senderId?.fullName || "User"}:</span>
                      <span className="opacity-70 truncate max-w-xs md:max-w-md italic font-medium">"{replyingToMessage.message}"</span>
                    </div>
                    <button 
                      onClick={() => setReplyingToMessage(null)}
                      className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <MessageInput focus />
              </Window>
            </div>
            <Thread />
          </Channel>
        </Chat>
      </div>

      {/* 👑 WHATSAPP LEVEL GLASSMORPHIC GROUP SETTINGS PANEL */}
      {isGroup && showAdminPanel && groupInfo && (
        <div className="w-80 border-l border-base-300/40 bg-base-200/70 backdrop-blur-md flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-250 z-20">
          {/* Header */}
          <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-100/40">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Group Profile Settings
            </h3>
            <button 
              onClick={() => {
                setShowAdminPanel(false);
                setIsEditingSettings(false);
              }}
              className="btn btn-circle btn-xs btn-ghost"
            >
              ✕
            </button>
          </div>

          {/* Group Meta & Header Section */}
          <div className="p-4 flex flex-col items-center border-b border-base-300 bg-base-100/50 relative">
            <div className="avatar w-20 h-20 rounded-full border-2 border-primary/20 overflow-hidden mb-3 relative group">
              <img src={isEditingSettings ? editAvatar : groupInfo.avatar} alt={groupInfo.name} className="object-cover w-full h-full" />
              {isAdmin && isEditingSettings && (
                <button 
                  onClick={shuffleAvatar}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Randomize Avatar"
                >
                  <RotateCw className="w-5 h-5 text-white animate-spin-slow" />
                </button>
              )}
            </div>

            {/* Editable Group Name & Description for Admin */}
            {isEditingSettings ? (
              <div className="w-full space-y-2 text-xs">
                <div>
                  <label className="label py-0.5 opacity-60">Group Name</label>
                  <input 
                    type="text" 
                    className="input input-bordered input-xs w-full text-xs font-bold" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label py-0.5 opacity-60">Description</label>
                  <textarea 
                    className="textarea textarea-bordered textarea-xs w-full text-[11px] h-16 leading-tight" 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <div className="flex gap-2.5 pt-1.5">
                  <button 
                    onClick={saveSettings} 
                    className="btn btn-success btn-xs flex-1 rounded-lg gap-1"
                    disabled={updateGroupMutation.isPending}
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingSettings(false);
                      setEditName(groupInfo.name);
                      setEditDesc(groupInfo.description);
                      setEditAvatar(groupInfo.avatar);
                    }} 
                    className="btn btn-outline btn-xs flex-1 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full">
                <h4 className="font-extrabold text-base flex items-center justify-center gap-1.5 truncate">
                  {groupInfo.name}
                  {isAdmin && (
                    <button 
                      onClick={() => setIsEditingSettings(true)}
                      className="btn btn-circle btn-ghost btn-xs text-base-content/40 hover:text-primary transition-colors"
                      title="Edit Group Info"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h4>
                <p className="text-[11px] opacity-75 mt-1 leading-tight max-h-16 overflow-y-auto px-1 italic">
                  {groupInfo.description || "No group description configured."}
                </p>
              </div>
            )}

            <div className="flex gap-1.5 mt-4 items-center">
              <span className={`badge ${isAdmin ? "badge-primary" : "badge-ghost"} text-[10px] font-bold`}>
                {isAdmin ? "Administrator" : "Standard Member"}
              </span>
              {isCreator && (
                <span className="badge badge-accent text-[10px] font-bold gap-1">
                  <Crown className="w-2.5 h-2.5" /> Owner
                </span>
              )}
            </div>
          </div>

          {/* Members Direct Adder Panel (Admins Only) */}
          {isAdmin && (
            <div className="p-4 border-b border-base-300 space-y-2.5 bg-success/5">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Add Member Directly
              </h5>
              <div className="flex gap-2">
                <select 
                  className="select select-bordered select-xs flex-1 text-xs"
                  value={directAddUserId}
                  onChange={(e) => setDirectAddUserId(e.target.value)}
                >
                  <option value="">Choose Friend</option>
                  {friendsList
                    .filter((friend) => !groupInfo.members.some((m) => m.userId?._id?.toString() === friend._id?.toString() && m.status === "active"))
                    .map((friend) => (
                      <option key={friend._id} value={friend._id}>{friend.fullName}</option>
                    ))}
                </select>
                <button 
                  onClick={() => addDirectMemberMutation.mutate(directAddUserId)}
                  className="btn btn-success btn-xs rounded-lg"
                  disabled={!directAddUserId || addDirectMemberMutation.isPending}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Friends Invite Panel (Admins Only) */}
          {isAdmin && (
            <div className="p-4 border-b border-base-300 space-y-2">
              <h5 className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Invite Friend to Join
              </h5>
              <div className="flex gap-2">
                <select 
                  className="select select-bordered select-xs flex-1 text-xs"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                >
                  <option value="">Select Friend</option>
                  {friendsList
                    .filter((friend) => !groupInfo.members.some((m) => m.userId?._id?.toString() === friend._id?.toString() && m.status === "active") && !groupInfo.invitations.some((i) => i.userId?._id?.toString() === friend._id?.toString()))
                    .map((friend) => (
                      <option key={friend._id} value={friend._id}>{friend.fullName}</option>
                    ))}
                </select>
                <button 
                  onClick={() => inviteMutation.mutate({ userId: inviteUserId })}
                  className="btn btn-primary btn-xs rounded-lg"
                  disabled={!inviteUserId || inviteMutation.isPending}
                >
                  Invite
                </button>
              </div>
            </div>
          )}

          {/* Join Requests Queue (Admins Only) */}
          {isAdmin && groupInfo.joinRequests?.length > 0 && (
            <div className="p-4 border-b border-base-300 space-y-2 bg-amber-500/5">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                Join Requests Queue ({groupInfo.joinRequests.length})
              </h5>
              <div className="space-y-1.5">
                {groupInfo.joinRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between p-2 rounded-xl bg-base-100 border border-base-300">
                    <div className="flex items-center gap-2">
                      <img src={req.userId?.profilePic} className="w-6 h-6 rounded-full object-cover" alt="" />
                      <span className="text-[11px] font-semibold truncate max-w-[100px]">{req.userId?.fullName}</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => approveRequestMutation.mutate(req.userId?._id)} 
                        className="btn btn-success btn-xs btn-circle"
                        title="Approve"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List Section */}
          <div className="p-4 flex-1 space-y-3 bg-base-100/20">
            <h5 className="text-[11px] font-bold uppercase tracking-wider opacity-60">
              Group Members ({groupInfo.members.filter(m => m.status === "active").length})
            </h5>
            <div className="space-y-2.5">
              {groupInfo.members
                .filter((m) => m.status === "active")
                .map((m) => {
                  const memberIdString = m.userId?._id?.toString();
                  const isUserCreator = memberIdString === groupInfo.creatorId?._id?.toString();
                  const isUserAdmin = m.role === "admin";
                  const isMe = memberIdString === authUser?._id?.toString();

                  return (
                    <div key={m._id} className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-base-100/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="avatar w-8 h-8 rounded-full border border-base-300 overflow-hidden shrink-0">
                          <img src={m.userId?.profilePic} alt="" className="object-cover w-full h-full" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs flex items-center gap-1.5 truncate">
                            {m.userId?.fullName}
                            {isUserCreator && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                          </span>
                          <span className="text-[10px] opacity-60 capitalize flex items-center gap-1">
                            {isUserAdmin && <Shield className="w-2.5 h-2.5 text-primary" />}
                            {m.role}
                          </span>
                        </div>
                      </div>

                      {/* Admin Controls Dropdown (Expel, Promo, Demote) */}
                      {isAdmin && !isMe && !isUserCreator && (
                        <div className="dropdown dropdown-end">
                          <label tabIndex={0} className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content">
                            ⋮
                          </label>
                          <ul tabIndex={0} className="dropdown-content menu p-1.5 shadow-xl bg-base-100 rounded-box w-36 border border-base-300 text-xs z-50 animate-in fade-in duration-100">
                            {isUserAdmin ? (
                              <li>
                                <button 
                                  onClick={() => demoteMutation.mutate(memberIdString)} 
                                  className="flex gap-2 text-warning font-medium p-2"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                  Demote Admin
                                </button>
                              </li>
                            ) : (
                              <li>
                                <button 
                                  onClick={() => promoteMutation.mutate(memberIdString)} 
                                  className="flex gap-2 text-success font-medium p-2"
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                  Promote Admin
                                </button>
                              </li>
                            )}
                            <li>
                              <button 
                                onClick={() => expelMutation.mutate(memberIdString)} 
                                className="flex gap-2 text-error font-medium p-2"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Expel Member
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Group Action Buttons (Leave, Delete Group) */}
          <div className="p-4 border-t border-base-300 bg-base-100/50 mt-auto space-y-2">
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to leave this group?")) {
                  leaveMutation.mutate();
                }
              }} 
              className="btn btn-error btn-outline btn-sm w-full gap-2 rounded-xl text-xs"
              disabled={leaveMutation.isPending}
            >
              <LogOut className="w-4 h-4" />
              Leave Group
            </button>

            {isCreator && (
              <button 
                onClick={() => {
                  if (window.confirm("CRITICAL WARNING: This will permanently delete the group and delete all message histories. Proceed?")) {
                    deleteGroupMutation.mutate();
                  }
                }} 
                className="btn btn-error btn-sm w-full gap-2 rounded-xl text-xs"
                disabled={deleteGroupMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
