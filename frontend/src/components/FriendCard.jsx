import React from "react";
import { Link } from "react-router-dom";

const FriendCard = ({ friend, hasUnseenMessages }) => (
  <div className="card bg-base-200 hover:shadow-md transition-shadow relative">
    <div className="card-body p-4">
      {/* USER INFO */}
      <div className="flex items-center gap-3 mb-3">
        <div className="avatar size-12 relative">
          <img src={friend.profilePic} alt={friend.fullName} className="rounded-full object-cover" />
          {hasUnseenMessages && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full"></span>
          )}
        </div>
        <div>
          <h3 className="font-semibold truncate">{friend.fullName}</h3>
          {friend.bio && (
            <div className="text-xs opacity-70 mt-1 max-w-[10rem] truncate">{friend.bio}</div>
          )}
        </div>
      </div>
      <Link to={`/chat/${friend._id}`} className="btn btn-outline w-full">
        Message
      </Link>
    </div>
  </div>
);

export default FriendCard;


