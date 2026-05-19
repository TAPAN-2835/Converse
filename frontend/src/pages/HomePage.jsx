import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import useAuthUser from "../hooks/useAuthUser";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
  getUnseenMessagesCount,
  getStreamToken,
  getUnseenMessagesPerUser,
  getUserGroupsFromBackend,
  createGroupInBackend,
  acceptInviteInBackend,
  rejectInviteInBackend
} from "../lib/api";
import { Link } from "react-router-dom";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, UsersIcon, MessageSquare, Plus, Info, Globe, Shield, Trash2, Pin, Settings, Check, X } from "lucide-react";
import NoFriendsFound from "../components/NoFriendsFound";
import FriendCard from "../components/FriendCard";
import toast from "react-hot-toast";

const HomePage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "groups"

  // Create Group Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  // Fetch groups
  const { data: userGroupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ["userGroups"],
    queryFn: getUserGroupsFromBackend,
  });
  const userGroups = userGroupsData?.groups || [];

  // Fetch unseen messages count
  const { data: unseenMessagesPerUser = {} } = useQuery({
    queryKey: ["unseenMessagesPerUser"],
    queryFn: getUnseenMessagesPerUser,
  });

  const { mutate: sendRequestMutation, isPending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] }),
  });

  // Create Group Mutation
  const { mutate: createGroupMutation, isPending: creatingGroup } = useMutation({
    mutationFn: createGroupInBackend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      toast.success("Group created successfully!");
      setShowCreateModal(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedFriends([]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create group");
    }
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (groupId) => acceptInviteInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation accepted!");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      queryClient.invalidateQueries({ queryKey: ["converseSearch"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to accept invitation");
    }
  });

  const rejectInviteMutation = useMutation({
    mutationFn: (groupId) => rejectInviteInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation declined!");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      queryClient.invalidateQueries({ queryKey: ["converseSearch"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to decline invitation");
    }
  });

  const handleCreateGroupSubmit = (e) => {
    e.preventDefault();
    if (!groupName) {
      toast.error("Group name is required");
      return;
    }
    createGroupMutation({
      name: groupName,
      description: groupDesc,
      memberIds: selectedFriends
    });
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        outgoingIds.add(req.recipient._id);
      });
      setOutgoingRequestsIds(outgoingIds);
    }
  }, [outgoingFriendReqs]);

  // Real-time socket sync for groups Sidebar/Dashboard listings
  useEffect(() => {
    const socketUrl = import.meta.env.MODE === "development" ? "http://localhost:5001" : window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("[Groups List Socket] Synchronizer connected.");
    });

    const triggerSync = () => {
      console.log("[Groups List Socket] Event caught: invalidating userGroups query key.");
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
    };

    socket.on("group.created", triggerSync);
    socket.on("group.updated", triggerSync);
    socket.on("group.memberAdded", triggerSync);
    socket.on("group.memberRemoved", triggerSync);

    return () => {
      socket.off("group.created", triggerSync);
      socket.off("group.updated", triggerSync);
      socket.off("group.memberAdded", triggerSync);
      socket.off("group.memberRemoved", triggerSync);
      socket.disconnect();
    };
  }, [queryClient]);

  console.log("unseenMessages (HomePage)", unseenMessagesPerUser);

  return (
    <div className="px-4 sm:px-6 lg:px-8 w-full max-w-[1400px] mx-auto space-y-8 mt-6 pb-12">
      {/* Group Create Modal Portal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 border border-base-300 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-base-content/60 hover:text-base-content btn btn-circle btn-sm btn-ghost"
            >
              ✕
            </button>
            <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary" />
              Create Group Chat
            </h3>
            <p className="text-xs opacity-60 mb-4">Set up a space for team collaborations or community updates.</p>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label py-1 text-xs font-semibold">Group Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Project Launch Team" 
                  className="input input-bordered w-full text-sm"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label py-1 text-xs font-semibold">Description (Optional)</label>
                <textarea 
                  placeholder="What's this group about?" 
                  className="textarea textarea-bordered w-full text-sm h-20 resize-none"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label py-1 text-xs font-semibold">Add Members ({selectedFriends.length} selected)</label>
                {friends.length === 0 ? (
                  <p className="text-xs text-error">Invite friends first to add them to groups!</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-base-300 rounded-lg p-2 space-y-1.5 scrollbar-thin">
                    {friends.map((friend) => (
                      <label key={friend._id} className="flex items-center justify-between p-1.5 hover:bg-base-200 rounded-md cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <img src={friend.profilePic} className="w-6 h-6 rounded-full object-cover" alt="" />
                          <span className="font-medium">{friend.fullName}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-primary checkbox-xs" 
                          checked={selectedFriends.includes(friend._id)}
                          onChange={() => toggleFriendSelection(friend._id)}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full gap-2 mt-2"
                disabled={creatingGroup}
              >
                {creatingGroup ? <span className="loading loading-spinner" /> : <Plus className="w-4 h-4" />}
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header Dashboard Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Conversations</h2>
          <p className="text-xs opacity-60">Manage direct peer dialogues and group communications.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/notifications" className="btn btn-outline btn-sm flex-1 sm:flex-none">
            <UsersIcon className="mr-2 size-4" />
            Friend Requests
          </Link>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn btn-primary btn-sm flex-1 sm:flex-none gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        </div>
      </div>

      {/* Elegant glass tab selectors */}
      <div className="tabs tabs-boxed bg-base-200/50 backdrop-blur-md p-1 border border-base-300/40 rounded-xl flex gap-1 w-full max-w-sm">
        <button 
          onClick={() => setActiveTab("direct")}
          className={`tab flex-1 font-bold text-xs rounded-lg transition-all ${activeTab === "direct" ? "tab-active bg-primary text-primary-content shadow-sm" : ""}`}
        >
          Direct Messages ({friends.length})
        </button>
        <button 
          onClick={() => setActiveTab("groups")}
          className={`tab flex-1 font-bold text-xs rounded-lg transition-all ${activeTab === "groups" ? "tab-active bg-primary text-primary-content shadow-sm" : ""}`}
        >
          Group Chats ({userGroups.length})
        </button>
      </div>

      {/* Direct Messages Tab */}
      {activeTab === "direct" && (
        <>
          {loadingFriends ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : friends.length === 0 ? (
            <NoFriendsFound />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {friends.map((friend) => {
                const hasUnseen = unseenMessagesPerUser?.[friend._id] > 0;
                return (
                  <FriendCard 
                    key={friend._id} 
                    friend={friend} 
                    hasUnseenMessages={hasUnseen}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Group Chats Tab */}
      {activeTab === "groups" && (
        <>
          {loadingGroups ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : userGroups.length === 0 ? (
            <div className="card bg-base-200 border border-base-300 p-8 text-center max-w-lg mx-auto shadow-inner rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 animate-pulse">
                <UsersIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-1">No group channels found</h3>
              <p className="text-xs opacity-60 mb-6 max-w-xs mx-auto">
                Create a dynamic group channel to exchange files, media, and reactions in a multi-user environment.
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm mx-auto gap-1.5">
                <Plus className="w-4 h-4" />
                Create First Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {userGroups.map((group) => {
                const isActiveMember = group.members?.some(
                  (m) =>
                    (m.userId?._id ? m.userId._id.toString() : m.userId?.toString()) ===
                      authUser?._id?.toString() && m.status === "active"
                );
                const isInvited = group.invitations?.some(
                  (i) =>
                    (i.userId?._id ? i.userId._id.toString() : i.userId?.toString()) ===
                    authUser?._id?.toString()
                );

                return (
                  <div key={group._id} className="card bg-base-200 border border-base-300/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                    <div className="card-body p-4 flex flex-col justify-between h-48">
                      <div className="flex items-center gap-3">
                        <div className="avatar w-12 h-12 rounded-full border border-base-300 shadow-xs overflow-hidden">
                          <img src={group.avatar} alt={group.name} className="object-cover w-full h-full" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-sm truncate">{group.name}</h3>
                            {group.members.some(
                              (m) =>
                                (m.userId?._id?.toString() === authUser?._id?.toString() ||
                                  m.userId?.toString() === authUser?._id?.toString()) &&
                                m.role === "admin" &&
                                m.status === "active"
                            ) && (
                              <Link 
                                to={`/chat/group/${group.streamChannelId}`} 
                                state={{ openSettings: true }}
                                className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-primary transition-colors shrink-0"
                                title="Edit Group Settings"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                          <p className="text-[11px] opacity-60 truncate">{group.description || "No group description."}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-base-300/30 pt-3 text-[11px] opacity-75">
                        <span>{group.members.length} members</span>
                        <span className="font-semibold text-primary">{group.members.filter(m => m.role === 'admin').length} admin</span>
                      </div>
                      
                      {isActiveMember ? (
                        <Link to={`/chat/group/${group.streamChannelId}`} className="btn btn-primary btn-sm w-full mt-2 gap-2 text-xs">
                          <MessageSquare className="w-4 h-4" />
                          Enter Chat
                        </Link>
                      ) : isInvited ? (
                        <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={() => acceptInviteMutation.mutate(group._id)}
                            className="btn btn-success btn-sm flex-1 text-white gap-1"
                            disabled={acceptInviteMutation.isPending}
                          >
                            <Check className="w-4 h-4" /> Accept
                          </button>
                          <button
                            onClick={() => rejectInviteMutation.mutate(group._id)}
                            className="btn btn-outline btn-error btn-sm flex-1 gap-1"
                            disabled={rejectInviteMutation.isPending}
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      ) : (
                         <div className="badge badge-warning mx-auto mt-2">Pending Request</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Discover Section */}
      <section className="mt-8 pt-4 border-t border-base-300/35">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold tracking-tight">Meet New Friends</h2>
          <p className="text-xs opacity-60">Discover new peers to chat and expand your group networks.</p>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : recommendedUsers.length === 0 ? (
          <div className="card bg-base-200 p-6 text-center">
            <h3 className="font-semibold text-lg mb-2">No recommendations available</h3>
            <p className="text-base-content opacity-70">
              Check back later for new friends!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recommendedUsers.map((user) => {
              const hasRequestBeenSent = outgoingRequestsIds.has(user._id);

              return (
                <div
                  key={user._id}
                  className="card bg-base-200 hover:shadow-lg transition-all duration-300 border border-base-300/40 rounded-2xl overflow-hidden"
                >
                  <div className="card-body p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="avatar w-10 h-10 rounded-full border border-base-300">
                        <img src={user.profilePic} alt={user.fullName} className="rounded-full object-cover" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm">{user.fullName}</h3>
                        {user.location && (
                          <div className="flex items-center text-[10px] opacity-70 mt-0.5">
                            <MapPinIcon className="size-3 mr-1" />
                            {user.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {user.bio && <p className="text-xs opacity-70 truncate">{user.bio}</p>}

                    <button
                      className={`btn w-full btn-sm mt-2 text-xs ${
                        hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                      } `}
                      onClick={() => sendRequestMutation(user._id)}
                      disabled={hasRequestBeenSent || isPending}
                    >
                      {hasRequestBeenSent ? (
                        <>
                          <CheckCircleIcon className="size-4 mr-2" />
                          Request Sent
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="size-4 mr-2" />
                          Send Friend Request
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
