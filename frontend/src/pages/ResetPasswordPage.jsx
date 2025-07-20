import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../lib/api";
import Footer from "../components/Footer";
import ThemeSelector from "../components/ThemeSelector";
import { useThemeStore } from "../store/useThemeStore";
import toast from "react-hot-toast";

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate("/forgot-password");
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const res = await resetPassword({ email, newPassword, confirmPassword });
      if (res.success) {
        toast.success(res.message || "Password updated successfully");
        navigate("/login");
      } else {
        toast.error(res.message || "Failed to reset password");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Error resetting password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-base-100" data-theme={theme}>
      <div className="flex-grow flex items-center justify-center min-h-[80vh]">
        <div className="border border-primary/10 flex flex-col w-full max-w-md mx-auto bg-base-100 rounded-3xl shadow-xl overflow-hidden my-6 md:my-10 transition-transform duration-300 hover:scale-[1.01]">
          <div className="card-body p-5 sm:p-8 md:p-10 space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-medium" style={{ fontFamily: 'Pacifico, cursive', letterSpacing: '2px' }}>
                <span className="font-aicon">Converse</span>
              </span>
              <ThemeSelector />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Reset Password</h2>
                <p className="text-sm opacity-70">Enter your new password below.</p>
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="New password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Confirm Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Reset Password"}
              </button>
            </form>
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-primary hover:underline text-sm"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ResetPasswordPage; 