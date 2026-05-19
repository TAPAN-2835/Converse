import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptFriendRequest,
  getFriendRequests,
  getNotificationsFromBackend,
  markNotificationsAsReadInBackend,
  updateNotificationPreferencesInBackend,
  registerFcmTokenInBackend,
  acceptInviteInBackend,
  rejectInviteInBackend
} from "../lib/api";
import {
  Bell,
  Clock,
  MessageSquare,
  UserCheck,
  CheckCheck,
  Settings2,
  Volume2,
  VolumeX,
  Smartphone,
  ExternalLink,
  Check,
  X
} from "lucide-react";
import io from "socket.io-client";
import toast from "react-hot-toast";
import NoNotificationsFound from "../components/NoNotificationsFound";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all"); // "all" | "preferences"

  // 1. Fetch friend requests (legacy/fallback hook)
  const { data: friendRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  // 2. Fetch custom paginated notifications and preference configurations
  const { data: notificationPayload, isLoading: loadingNotifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotificationsFromBackend,
  });

  // 3. Socket.io client connector for instant realtime synchronization
  useEffect(() => {
    // Connect to backend Socket.io server (resilient host resolution)
    const socketUrl = import.meta.env.MODE === "development" ? "http://localhost:5001" : window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("[Notifications Sync Socket] Socket connected successfully.");
    });

    socket.on("notification.new", (newNotif) => {
      console.log("[Notifications Sync Socket] Real-time notification received:", newNotif);
      toast((t) => (
        <span className="flex items-center gap-2 text-xs font-semibold">
          <Bell className="w-4 h-4 text-primary animate-bounce" />
          <div>
            <div className="font-bold">{newNotif.title}</div>
            <div className="opacity-80">{newNotif.body}</div>
          </div>
        </span>
      ), { duration: 4000 });

      // Automatically invalidate TanStack Query cache to refresh lists
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Mutations
  const { mutate: acceptRequestMutation } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      toast.success("Friend request accepted!");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutate: acceptInviteMutation } = useMutation({
    mutationFn: (groupId) => acceptInviteInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation accepted!");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to accept invitation");
    }
  });

  const { mutate: rejectInviteMutation } = useMutation({
    mutationFn: (groupId) => rejectInviteInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation declined!");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to decline invitation");
    }
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => markNotificationsAsReadInBackend([]),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutate: updatePrefs } = useMutation({
    mutationFn: updateNotificationPreferencesInBackend,
    onSuccess: (data) => {
      toast.success("Notification preferences updated");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Enable Browser Native Push Alerts
  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser does not support desktop notifications");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Generate simulated FCM device token
        const mockFcmToken = "fcm_token_" + Math.random().toString(36).substring(2, 15);
        await registerFcmTokenInBackend(mockFcmToken);
        toast.success("Desktop Push Notifications successfully enabled!");
      } else {
        toast.error("Permission denied for browser notifications");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable notifications");
    }
  };

  const incomingRequests = friendRequests?.incomingReqs || [];
  const notifications = notificationPayload?.notifications || [];
  const totalUnread = notificationPayload?.totalUnread || 0;
  const preferences = notificationPayload?.preferences || { dms: true, groups: true, mentions: true };

  const isLoading = loadingRequests || loadingNotifs;

  return (
    <div className="px-4 sm:px-6 lg:px-8 w-full max-w-[1400px] mx-auto space-y-8 mt-6 pb-12 min-h-[90vh]">
      <div className="space-y-6">
        
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300/50 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Bell className="w-8 h-8 text-primary animate-pulse" />
              Notifications
              {totalUnread > 0 && (
                <span className="badge badge-primary badge-lg">{totalUnread} unread</span>
              )}
            </h1>
            <p className="text-xs opacity-60 mt-1">Manage desktop pushes, mute preferences, and dynamic alerts.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "all" ? "preferences" : "all")}
              className={`btn btn-sm gap-1.5 ${activeTab === "preferences" ? "btn-primary" : "btn-outline"}`}
            >
              <Settings2 className="w-4 h-4" /> Preferences
            </button>
            {totalUnread > 0 && (
              <button onClick={() => markAllRead()} className="btn btn-sm btn-ghost gap-1.5 text-primary">
                <CheckCheck className="w-4 h-4" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : activeTab === "preferences" ? (
          /* 🚀 Premium Preferences Panel */
          <div className="card bg-base-200/50 border border-base-300 backdrop-blur-md shadow-xl animate-in fade-in duration-200">
            <div className="card-body gap-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" /> Notification Settings
              </h2>

              <div className="grid gap-4">
                {/* DM mute switch */}
                <div className="flex items-center justify-between p-4 bg-base-100/50 rounded-xl border border-base-300/30">
                  <div className="flex items-start gap-3">
                    {preferences.dms ? <Volume2 className="w-5 h-5 text-success mt-0.5" /> : <VolumeX className="w-5 h-5 text-error mt-0.5" />}
                    <div>
                      <h4 className="font-semibold text-sm">Direct Messages (DMs)</h4>
                      <p className="text-xs opacity-60">Receive instant sound and push notifications for direct peer messages.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={preferences.dms}
                    onChange={(e) => updatePrefs({ ...preferences, dms: e.target.checked })}
                  />
                </div>

                {/* Group mute switch */}
                <div className="flex items-center justify-between p-4 bg-base-100/50 rounded-xl border border-base-300/30">
                  <div className="flex items-start gap-3">
                    {preferences.groups ? <Volume2 className="w-5 h-5 text-success mt-0.5" /> : <VolumeX className="w-5 h-5 text-error mt-0.5" />}
                    <div>
                      <h4 className="font-semibold text-sm">Group Channel Chats</h4>
                      <p className="text-xs opacity-60">Get alerts when added to new groups or when peers send alerts in group rooms.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={preferences.groups}
                    onChange={(e) => updatePrefs({ ...preferences, groups: e.target.checked })}
                  />
                </div>

                {/* Enable browser pushes button */}
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-primary mt-0.5 animate-bounce" />
                    <div>
                      <h4 className="font-bold text-sm text-primary">Desktop Push Authorization</h4>
                      <p className="text-xs opacity-85 text-primary/80">Authorize the browser to display notifications even in the background.</p>
                    </div>
                  </div>
                  <button onClick={enableBrowserNotifications} className="btn btn-sm btn-primary">
                    Enable Pushes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 🚀 Clean Notifications Feed */
          <div className="space-y-4">
            
            {/* Legacy Friend Requests Group */}
            {incomingRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Pending Friend Requests ({incomingRequests.length})
                </h3>
                {incomingRequests.map((request) => (
                  <div key={request._id} className="card bg-base-200/60 border border-base-300 shadow-xs hover:shadow-md transition-all">
                    <div className="card-body p-4 flex flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar w-12 h-12 rounded-full overflow-hidden border border-base-300">
                          <img src={request.sender?.profilePic || "/default-avatar.png"} alt="avatar" className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{request.sender?.fullName || "Chat Peer"}</h4>
                          <p className="text-xs opacity-60">Wants to establish a communication line with you.</p>
                        </div>
                      </div>
                      <button onClick={() => acceptRequestMutation(request._id)} className="btn btn-primary btn-sm">
                        Accept Connection
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Notifications Stream Feed */}
            {notifications.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Alert Stream Feed
                </h3>

                {notifications.map((notif) => {
                  const isUnread = notif.status === "unread";
                  const dateStr = new Date(notif.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div
                      key={notif._id}
                      className={`card border transition-all ${
                        isUnread
                          ? "bg-primary/5 border-primary/20 shadow-md"
                          : "bg-base-200/40 border-base-300/45 shadow-xs"
                      }`}
                    >
                      <div className="card-body p-4 flex flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="avatar size-10 rounded-full overflow-hidden border border-base-300 mt-0.5">
                            <img src={notif.senderId?.profilePic || "/default-avatar.png"} alt="avatar" className="object-cover w-full h-full" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm">{notif.title}</h4>
                              {isUnread && <span className="w-2 h-2 rounded-full bg-primary" title="New Alert"></span>}
                            </div>
                            <p className="text-xs my-1 font-medium opacity-80">{notif.body}</p>
                            <p className="text-[10px] flex items-center opacity-50 font-bold gap-1">
                              <Clock className="w-3 h-3" /> {dateStr}
                            </p>
                          </div>
                        </div>

                        {notif.type === "group_invite" ? (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => acceptInviteMutation(notif.payload?.groupId)}
                              className="btn btn-xs btn-success text-white gap-1"
                            >
                              <Check className="w-3 h-3" /> Accept
                            </button>
                            <button
                              onClick={() => rejectInviteMutation(notif.payload?.groupId)}
                              className="btn btn-xs btn-outline btn-error gap-1"
                            >
                              <X className="w-3 h-3" /> Decline
                            </button>
                          </div>
                        ) : notif.payload?.actionUrl ? (
                          <a
                            href={notif.payload.actionUrl}
                            className="btn btn-xs btn-ghost gap-1 opacity-70 hover:opacity-100 text-primary font-bold"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : incomingRequests.length === 0 ? (
              <NoNotificationsFound />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
