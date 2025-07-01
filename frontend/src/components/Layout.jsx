import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children, showSidebar = false }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen">
      <Navbar onSidebarToggle={handleSidebarToggle} />
      <div className="flex">
        {/* Sidebar for large screens */}
        {showSidebar && <Sidebar className="hidden lg:flex" />}
        {/* Sidebar drawer for small screens */}
        {showSidebar && isSidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-40" onClick={handleSidebarClose}></div>
            {/* Drawer */}
            <div className="relative w-64 bg-base-200 border-r border-base-300 h-full shadow-lg animate-slide-in-left">
              <button
                className="absolute top-2 right-2 btn btn-sm btn-circle"
                onClick={handleSidebarClose}
                aria-label="Close sidebar"
              >
                ✕
              </button>
              <Sidebar onNavigate={handleSidebarClose} />
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
export default Layout;
