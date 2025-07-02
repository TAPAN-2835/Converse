import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserFriends, getRecommendedUsers, sendFriendRequest, getUnseenMessagesPerUser } from "../lib/api";
import { Link } from "react-router-dom";

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers, isError: errorUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });
  // Fetch current user's friends
  const { data: friends = [], isLoading: loadingFriends, isError: errorFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  // Fetch unseen messages count per user
  const { data: unseenMessagesPerUser = {} } = useQuery({
    queryKey: ["unseenMessagesPerUser"],
    queryFn: getUnseenMessagesPerUser,
  });

  // For quick lookup
  const friendIds = useMemo(() => new Set(friends.map(f => f._id)), [friends]);

  // Merge friends and users, remove duplicates by _id
  const allUsers = useMemo(() => {
    const map = new Map();
    // Add all friends first
    friends.forEach(friend => {
      map.set(friend._id, friend);
    });
    // Add all users (will not overwrite friends if same _id)
    users.forEach(user => {
      if (!map.has(user._id)) {
        map.set(user._id, user);
      }
    });
    return Array.from(map.values());
  }, [friends, users]);

  // Add friend mutation
  const { mutate: addFriend, isPending: addingFriend } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = allUsers.filter(user =>
      (user.fullName || "").toLowerCase().includes(search.toLowerCase())
    );
    // Sort: friends first (alphabetical), then non-friends (alphabetical)
    filtered.sort((a, b) => {
      const aIsFriend = friendIds.has(a._id);
      const bIsFriend = friendIds.has(b._id);
      if (aIsFriend !== bIsFriend) {
        return bIsFriend - aIsFriend; // friends first
      }
        return (a.fullName || "").localeCompare(b.fullName || "");
    });
    return filtered;
  }, [allUsers, search]);

  if (loadingUsers || loadingFriends) {
    return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;
  }
  if (errorUsers || errorFriends) {
    return <div className="text-center text-red-500 py-8">Failed to load users or friends.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <h2 className="text-2xl font-bold mb-6">Find Friends</h2>
      {/* Inline search bar styled like your app */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input input-bordered w-full mb-6"
      />
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">No users found.</div>
        ) : (
          filteredUsers.map(user => {
            const isFriend = friendIds.has(user._id);
            const hasUnseenMessages = isFriend && unseenMessagesPerUser[user._id] > 0;
            return (
              <div
                key={user._id}
                className="flex items-center bg-base-200 rounded-lg p-4 shadow-sm justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="avatar relative">
                    <div className="w-12 rounded-full">
                      <img src={user.profilePic || "/i.png"} alt={user.fullName} />
                    </div>
                    {hasUnseenMessages && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full shadow-sm"></span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{user.fullName}</div>
                    {user.bio && <div className="text-sm opacity-70">{user.bio}</div>}
                  </div>
                </div>
                <div>
                  {isFriend ? (
                    <Link to={`/chat/${user._id}`} className="btn btn-primary">
                      Message
                    </Link>
                  ) : (
                    <button
                      className="btn btn-outline"
                      onClick={() => addFriend(user._id)}
                      disabled={addingFriend}
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
