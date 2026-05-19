import { Navigate, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import OtpVerificationPage from "./pages/OtpVerificationPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";

import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";
import { useOffline } from "./hooks/useOffline.js";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();
  const isOffline = useOffline();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-base-100" data-theme={theme}>
      {isOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-pulse">
          <div className="bg-error/90 backdrop-blur-md text-error-content px-4 py-2 rounded-full shadow-lg border border-error/20 flex items-center gap-2 text-sm font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
            Connection lost. You are currently offline.
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <HomePage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/login"
          element={
            !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <NotificationsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/search"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <SearchPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/call/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <CallPage />
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/chat/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={false}>
                <ChatPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/chat/:type/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={false}>
                <ChatPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
                <OnboardingPage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/friends"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <FriendsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />
        <Route
          path="/verify-otp"
          element={<OtpVerificationPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
      </Routes>

      <Toaster />
    </div>
  );
};
export default App;
