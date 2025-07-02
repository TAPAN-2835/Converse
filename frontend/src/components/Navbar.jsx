import { Link, useNavigate } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, MessagesSquare } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests, getUnseenMessagesPerUser } from "../lib/api";

const Navbar = ({ onSidebarToggle }) => {
  const { authUser } = useAuthUser();
  const { logoutMutation } = useLogout();
  const navigate = useNavigate();

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
      <div className="container mx-auto px-0 sm:px-0 lg:px-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-0">
            {/* Hamburger menu for mobile */}
            <button
              className="btn btn-ghost btn-circle block lg:hidden pl-2"
              onClick={onSidebarToggle}
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          {/* LOGO - Always visible and clickable */}
          <div className="flex-shrink-0">
              <Link to="/" className="flex items-center gap-0">
                <span className="text-base sm:text-xl font-bold font-aicon" style={{ letterSpacing: '1px' }}>
                Converse
              </span>
            </Link>
          </div>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <button
              className="btn btn-ghost btn-circle p-1 sm:p-2 relative flex items-center justify-center -mr-4"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
                <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-base-content opacity-70" />
                {(hasNotifications || hasUnseenMessages) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full shadow-sm"></span>
                )}
              </button>
            <ThemeSelector />
            <Link to="/onboarding" className="avatar w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center" title="Edit Profile">
              <img src={authUser?.profilePic} alt="User Avatar" className="rounded-full object-cover" rel="noreferrer" />
            </Link>
            <button className="btn btn-ghost btn-circle p-1 sm:p-2 flex items-center justify-center" onClick={logoutMutation} aria-label="Logout">
              <LogOutIcon className="w-5 h-5 sm:w-6 sm:h-6 text-base-content opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
