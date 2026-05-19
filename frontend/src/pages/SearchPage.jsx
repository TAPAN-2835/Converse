import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  searchConverse,
  requestJoinInBackend,
  acceptInviteInBackend,
  rejectInviteInBackend
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import {
  Search,
  MessageSquare,
  Users,
  FolderOpen,
  ArrowRight,
  Sparkles,
  SearchCode,
  Compass,
  Clock,
  UserPlus,
  Check,
  X
} from "lucide-react";
import toast from "react-hot-toast";

const SearchPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState("all"); // "all" | "messages" | "users" | "groups"

  // 🚀 Implement debouncing to prevent database request storms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 450); // 450ms debounce window

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Query search endpoint
  const { data: searchPayload, isLoading, error } = useQuery({
    queryKey: ["converseSearch", debouncedQuery, activeDomain],
    queryFn: () => searchConverse(debouncedQuery, activeDomain),
    enabled: debouncedQuery.trim().length >= 2, // Only search if query has at least 2 chars
  });

  const results = searchPayload?.results || {};
  const users = results.users || [];
  const groups = results.groups || [];
  const messages = results.messages || [];

  const totalResultsCount = users.length + groups.length + messages.length;

  // Mutations for Requesting to Join and Accepting/Rejecting invitations
  const requestJoinMutation = useMutation({
    mutationFn: (groupId) => requestJoinInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Join request submitted!");
      queryClient.invalidateQueries({ queryKey: ["converseSearch"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit request");
    }
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (groupId) => acceptInviteInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation accepted!");
      queryClient.invalidateQueries({ queryKey: ["converseSearch"] });
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to accept invitation");
    }
  });

  const rejectInviteMutation = useMutation({
    mutationFn: (groupId) => rejectInviteInBackend(groupId),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation declined!");
      queryClient.invalidateQueries({ queryKey: ["converseSearch"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to decline invitation");
    }
  });

  // Highlight helper for highlighting search matches securely
  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-base-content px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 w-full max-w-[1400px] mx-auto space-y-8 mt-6 pb-12 min-h-[90vh]">
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Header Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Search className="w-8 h-8 text-primary" />
            Global Search
          </h1>
          <p className="text-xs opacity-60 mt-1">
            Perform secure, secure-grade searches across messages, peer networks, and group chats.
          </p>
        </div>

        {/* Floating Glassmorphic Search Bar */}
        <div className="card bg-base-200/50 border border-base-300/40 backdrop-blur-md shadow-lg">
          <div className="card-body p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
              <input
                type="text"
                placeholder="Search messages, users, or active group coordinates..."
                className="input input-lg w-full pl-12 pr-4 bg-base-100 border-none outline-none focus:ring-2 focus:ring-primary rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            {/* Tab Domain Filter selectors */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { id: "all", label: "All Results", icon: Compass },
                { id: "messages", label: "Messages", icon: MessageSquare },
                { id: "users", label: "Peers", icon: Users },
                { id: "groups", label: "Groups", icon: FolderOpen }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDomain(tab.id)}
                    className={`btn btn-sm rounded-lg gap-1.5 transition-all ${
                      activeDomain === tab.id
                        ? "btn-primary shadow-md"
                        : "btn-outline btn-ghost border-base-300/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && debouncedQuery.trim().length >= 2 && (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        )}

        {/* Search Results Display Area */}
        {debouncedQuery.trim().length >= 2 && !isLoading && (
          <div className="space-y-6">
            {totalResultsCount === 0 ? (
              <div className="text-center py-16 bg-base-200/25 border border-base-300/35 rounded-2xl">
                <SearchCode className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold">No results found</h3>
                <p className="text-sm opacity-60 mt-1">We couldn't locate any matches for "{debouncedQuery}" in this domain.</p>
              </div>
            ) : (
              <>
                {/* 🚀 Users results rendering */}
                {users.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Matched Peers ({users.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {users.map((u) => (
                        <div key={u._id} className="card bg-base-200/50 border border-base-300/30 hover:border-primary/30 transition-all shadow-xs">
                          <div className="card-body p-4 flex flex-row items-center gap-3">
                            <div className="avatar w-12 h-12 rounded-full overflow-hidden border border-base-300">
                              <img src={u.profilePic || "/default-avatar.png"} alt="avatar" className="object-cover w-full h-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm truncate">{highlightMatch(u.fullName, debouncedQuery)}</h4>
                              <p className="text-xs opacity-60 truncate">{u.bio || "No status set"}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/chat/user/${u._id}`)}
                              className="btn btn-sm btn-ghost btn-circle text-primary"
                              title="Start peer conversation"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🚀 Groups results rendering */}
                {groups.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4" /> Active Channels & Groups ({groups.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {groups.map((g) => {
                        const isActiveMember = g.members?.some(
                          (m) =>
                            (m.userId?._id ? m.userId._id.toString() : m.userId?.toString()) ===
                              authUser?._id?.toString() && m.status === "active"
                        );
                        const isInvited = g.invitations?.some(
                          (i) =>
                            (i.userId?._id ? i.userId._id.toString() : i.userId?.toString()) ===
                            authUser?._id?.toString()
                        );
                        const isRequested = g.joinRequests?.some(
                          (r) =>
                            (r.userId?._id ? r.userId._id.toString() : r.userId?.toString()) ===
                            authUser?._id?.toString()
                        );

                        return (
                          <div key={g._id} className="card bg-base-200/50 border border-base-300/30 hover:border-primary/30 transition-all shadow-xs">
                            <div className="card-body p-4 flex flex-row items-center gap-3">
                              <div className="avatar w-12 h-12 rounded-full overflow-hidden bg-primary/10 border border-base-300 flex items-center justify-center font-bold text-lg text-primary">
                                {g.avatar ? (
                                  <img src={g.avatar} alt="avatar" className="object-cover w-full h-full" />
                                ) : (
                                  g.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate">{highlightMatch(g.name, debouncedQuery)}</h4>
                                <p className="text-xs opacity-60 truncate">{g.description || "No description provided."}</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isActiveMember ? (
                                  <button
                                    onClick={() => navigate(`/chat/group/${g.streamChannelId}`)}
                                    className="btn btn-sm btn-primary rounded-xl gap-1.5 px-3"
                                    title="Enter Chat"
                                  >
                                    Enter Chat
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                ) : isInvited ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => acceptInviteMutation.mutate(g._id)}
                                      className="btn btn-xs btn-success text-white rounded-lg px-2 gap-1"
                                      disabled={acceptInviteMutation.isPending}
                                      title="Accept Invite"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Accept
                                    </button>
                                    <button
                                      onClick={() => rejectInviteMutation.mutate(g._id)}
                                      className="btn btn-xs btn-outline btn-error rounded-lg px-2"
                                      disabled={rejectInviteMutation.isPending}
                                      title="Decline Invite"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : isRequested ? (
                                  <span className="badge badge-warning gap-1 p-2.5 text-[10px] font-bold rounded-xl select-none">
                                    <Clock className="w-3.5 h-3.5 animate-spin" /> Pending Approval
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => requestJoinMutation.mutate(g._id)}
                                    className="btn btn-sm btn-outline btn-primary rounded-xl gap-1 px-3"
                                    disabled={requestJoinMutation.isPending}
                                  >
                                    {requestJoinMutation.isPending && (
                                      <span className="loading loading-spinner loading-xs" />
                                    )}
                                    <UserPlus className="w-4 h-4" /> Request Join
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🚀 Messages results rendering */}
                {messages.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" /> Message Snippets ({messages.length})
                    </h3>
                    <div className="space-y-3">
                      {messages.map((m) => {
                        const dateStr = new Date(m.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        return (
                          <div key={m._id} className="card bg-base-200/40 border border-base-300/30 shadow-xs">
                            <div className="card-body p-4 flex flex-row items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="avatar size-10 rounded-full overflow-hidden border border-base-300 mt-0.5">
                                  <img src={m.senderId?.profilePic || "/default-avatar.png"} alt="avatar" className="object-cover w-full h-full" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm">{m.senderId?.fullName || "Chat Peer"}</h4>
                                    <span className="text-[10px] opacity-40 font-semibold">{dateStr}</span>
                                  </div>
                                  <p className="text-xs my-1 font-medium leading-relaxed opacity-85">
                                    {highlightMatch(m.message, debouncedQuery)}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  // Jump to message room seamlessly
                                  if (m.receiverId.startsWith("group-")) {
                                    navigate(`/chat/group/${m.receiverId}`);
                                  } else if (m.senderId?._id) {
                                    navigate(`/chat/user/${m.senderId._id}`);
                                  }
                                  toast.success("Jumping to conversation coordinates...");
                                }}
                                className="btn btn-xs btn-primary gap-1"
                              >
                                Jump to Chat
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Initial Empty State before search begins */}
        {debouncedQuery.trim().length < 2 && (
          <div className="text-center py-20 bg-base-200/10 border border-dashed border-base-300/40 rounded-3xl">
            <Sparkles className="w-10 h-10 text-primary/70 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold">Discover Converse Transcript Feeds</h3>
            <p className="text-sm opacity-60 mt-1 max-w-md mx-auto">
              Type at least 2 characters above to run instantaneous multi-domain checks on peer networks, channels, and conversation histories.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchPage;
