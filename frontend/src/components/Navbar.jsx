import { Link } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, MessagesSquare } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests, getUnseenMessagesPerUser } from "../lib/api";

const Navbar = ({ onSidebarToggle }) => {
  const { authUser } = useAuthUser();
  const { logoutMutation } = useLogout();

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
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="container mx-auto px-1 sm:px-2 lg:px-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {/* Hamburger menu for mobile */}
            <button
              className="btn btn-ghost btn-circle block lg:hidden"
              onClick={onSidebarToggle}
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* LOGO - Always visible and clickable */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center gap-1">
                <MessagesSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Pacifico, cursive', letterSpacing: '1px' }}>
                  Converse
                </span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={"/notifications"}>
              <button className="btn btn-ghost btn-circle p-1 sm:p-2 relative">
                <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-base-content opacity-70" />
                {(hasNotifications || hasUnseenMessages) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full shadow-sm"></span>
                )}
              </button>
            </Link>
            <div>
              <ThemeSelector />
            </div>
            <div className="avatar" title="User Profile">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full">
                <img src={authUser?.profilePic} alt="User Avatar" rel="noreferrer" />
              </div>
            </div>
            <button className="btn btn-ghost btn-circle p-1 sm:p-2" onClick={logoutMutation}>
              <LogOutIcon className="w-5 h-5 sm:w-6 sm:h-6 text-base-content opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
