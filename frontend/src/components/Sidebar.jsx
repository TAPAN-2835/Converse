import { Link, useLocation } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, HomeIcon, MessagesSquare, UsersIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests, getUnseenMessagesPerUser } from "../lib/api";

const Sidebar = ({ className = "", onNavigate }) => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;

  // Fetch friend requests to check for pending notifications
  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  // Fetch unseen messages count per user
  const { data: unseenMessagesPerUser = {} } = useQuery({
    queryKey: ["unseenMessagesPerUser"],
    queryFn: getUnseenMessagesPerUser,
  });

  const pendingRequests = friendRequests?.incomingReqs || [];
  const hasNotifications = pendingRequests.length > 0;
  const hasUnseenMessages = Object.values(unseenMessagesPerUser).some(count => count > 0);

  return (
    <aside className={`w-64 bg-base-200 border-r border-base-300 flex flex-col h-[calc(100vh-4rem)] sticky top-16 ${className}`}>
      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case text-base ${
            currentPath === "/" ? "btn-active" : ""
          }`}
          onClick={onNavigate}
        >
          <HomeIcon className="size-5 text-base-content opacity-70" />
          <span>Home</span>
        </Link>

        <Link
          to="/friends"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case text-base relative ${
            currentPath === "/friends" ? "btn-active" : ""
          }`}
          onClick={onNavigate}
        >
          <UsersIcon className="size-5 text-base-content opacity-70" />
          <span>Friends</span>
          {hasUnseenMessages && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full shadow-sm"></span>
          )}
        </Link>

        <Link
          to="/notifications"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case text-base relative ${
            currentPath === "/notifications" ? "btn-active" : ""
          }`}
          onClick={onNavigate}
        >
          <BellIcon className="size-5 text-base-content opacity-70" />
          <span>Notifications</span>
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          )}
        </Link>
      </nav>

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 mt-auto">
        <div className="flex items-center gap-3">
          <Link to="/onboarding" className="avatar w-10 rounded-full" title="Edit Profile">
            <img src={authUser?.profilePic} alt="User Avatar" />
          </Link>
          <div className="flex-1">
            <p className="font-semibold text-sm">{authUser?.fullName}</p>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="size-2 rounded-full bg-success inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
